import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { makeHar, sentinelRule } from './http.mjs';
import { readJSON, sentinelPath } from './model.mjs';
import { command } from './runtime.mjs';

const image = 'ghcr.io/zaproxy/zaproxy@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af';
export const addonIds = ['automation', 'authhelper', 'exim', 'pscan', 'pscanrules', 'reports'];
export const zapJobs = ['passiveScan-config', 'import', 'passiveScan-wait', 'export', 'report', 'exitStatus'];
export const zapErrorCodes = ['zap-launch-error', 'zap-automation-incomplete', 'zap-report-missing', 'zap-report-invalid',
  'zap-export-missing', 'zap-export-invalid', 'zap-unexpected-origin', 'zap-unexpected-http', 'zap-invalid-rule',
  'zap-alert-without-exchange', 'zap-addon-metadata-missing', 'zap-selfcheck-missing', 'zap-reconciliation-incomplete'];
export const zapIntegration = { image, mode: 'automation-har-import-no-replay', network: 'none' };
const key = ({ method, path, status }) => `${method} ${path} ${status}`;

export function inspectExport(run, entries, exchanges) {
  const received = new Map();
  for (const { request, response } of entries) {
    const url = new URL(request.url);
    if (url.origin !== run.origin) throw new Error('zap-unexpected-origin');
    // ZAP creates empty synthetic parent nodes when exporting the sites tree.
    if (response.status === 0 && exchanges.some(({ path }) => path.startsWith(url.pathname === '/' ? '/' : url.pathname + '/'))) continue;
    if (url.pathname === sentinelPath) continue;
    const tuple = key({ method: request.method, path: url.pathname, status: response.status });
    received.set(tuple, (received.get(tuple) || 0) + 1);
  }
  const groups = Map.groupBy(exchanges, key);
  for (const [tuple, count] of received) {
    if (count > (groups.get(tuple)?.length ?? 0)) throw new Error('zap-unexpected-http');
  }
  const matches = [];
  const evidence = [];
  for (const [tuple, group] of groups) {
    const { source, operation, method, path, status } = group[0];
    const receivedCount = received.get(tuple) ?? 0;
    const expectedCount = group.length;
    evidence.push({ source, operation, method, path, status, expectedCount, receivedCount });
    // An incomplete group cannot identify which of the indistinguishable steps arrived.
    if (receivedCount === expectedCount) {
      const zapEvidence = expectedCount === 1 ? 'single' : 'aggregate';
      matches.push(...group.map(({ har, ...exchange }) => ({ ...exchange, zapEvidence })));
    }
  }
  return { evidence, received: matches };
}

function inspectAlerts(run, report, exchanges, source) {
  let passiveSelfcheck = false;
  const findings = new Map();
  for (const site of report.site ?? []) {
    for (const { pluginid, cweid, riskcode, instances } of site.alerts) {
      if (!/^\d{1,8}$/u.test(pluginid)) throw new Error('zap-invalid-rule');
      for (const { uri, method } of instances) {
        const { origin, pathname } = new URL(uri);
        if (origin !== run.origin) throw new Error('zap-unexpected-origin');
        if (pathname === sentinelPath) {
          if (pluginid === sentinelRule) passiveSelfcheck = true;
          continue;
        }
        const affected = exchanges.find((item) => item.path === pathname && item.method === method);
        if (!affected) throw new Error('zap-alert-without-exchange');
        const id = `${pluginid}/${method}/${pathname}`;
        findings.set(id, {
          rule: pluginid, cwe: /^\d{1,6}$/u.test(cweid) ? 'CWE-' + cweid : null,
          risk: ['info', 'low', 'medium', 'high'][Number(riskcode)] ?? 'unknown',
          operation: affected.operation, method, path: pathname, source,
        });
      }
    }
  }
  return { passiveSelfcheck, findings: [...findings.values()] };
}

async function scanSource(run, source, exchanges) {
  const dir = `${run.dir}/zap/${source}`;
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(dir + '/input.har', JSON.stringify(makeHar(exchanges, run.origin)), { mode: 0o600 });
  const af = readFileSync('tests/security/zap.yaml', 'utf8').replaceAll('@ORIGIN@', run.origin)
    .replaceAll('@ORIGIN_REGEX@', run.origin.replaceAll('.', '\\.'));
  writeFileSync(dir + '/plan.yaml', af, { mode: 0o600 });
  writeFileSync(run.dir + '/zap-started', '', { mode: 0o600 });
  const result = await command('docker', [
    'run', '--rm', '--network', 'none', '--hostname', 'localhost', '--name', `${run.scanner}-${source}`,
    '--label', `lf.security.owner=${run.project}`,
    '--user', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/zap/wrk',
    '-v', `${dir}:/zap/wrk`, image, 'zap.sh', '-dir', '/zap/wrk/home', '-cmd', '-autorun', '/zap/wrk/plan.yaml',
  ], { timeout: 240_000 });
  const completedJobs = zapJobs.filter((job) => result.stdout.includes(`Job ${job} finished`));
  const started = completedJobs.length > 0 || zapJobs.some((job) => result.stdout.includes(`Job ${job} started`));
  const errors = [];
  if (!started) errors.push('zap-launch-error');
  else if (result.status !== 0 || completedJobs.length !== zapJobs.length) errors.push('zap-automation-incomplete');
  function readOutput(name, filename, inspect) {
    const path = dir + '/' + filename;
    if (!existsSync(path)) {
      errors.push(`zap-${name}-missing`);
      return {};
    }
    try {
      return inspect(readJSON(path));
    } catch (error) {
      errors.push(zapErrorCodes.includes(error.message) ? error.message : `zap-${name}-invalid`);
      return {};
    }
  }
  const alerts = readOutput('report', 'passive.json', (report) => ({
    ...inspectAlerts(run, report, exchanges, source),
    version: /^\d+\.\d+\.\d+$/u.test(report['@version']) ? report['@version'] : null,
  }));
  const http = readOutput('export', 'received.har', (har) => inspectExport(run, har.log.entries, exchanges));
  const addons = {};
  const log = readFileSync(dir + '/home/zap.log', { encoding: 'utf8', throwIfNoEntry: false });
  const installed = log?.split('\n').find((line) => line.includes('Installed add-ons:')) ?? '';
  for (const id of addonIds) {
    const match = new RegExp(`\\[id=${id}, version=(\\d+(?:\\.\\d+)*)\\]`, 'u').exec(installed);
    if (match) addons[id] = match[1];
  }
  if (started && (!alerts.version || Object.keys(addons).length !== addonIds.length)) errors.push('zap-addon-metadata-missing');
  if (alerts.passiveSelfcheck === false) errors.push('zap-selfcheck-missing');
  if (http.received && http.received.length !== exchanges.length) errors.push('zap-reconciliation-incomplete');
  return { source, started, exitCode: result.status, addons, completedJobs, errors, ...alerts, ...http, ok: errors.length === 0 };
}

export async function runZap(run, exchanges, measure = (_stage, work) => work()) {
  const scans = [];
  for (const [source, group] of Map.groupBy(exchanges, ({ source }) => source)) {
    try {
      scans.push(await measure(`zap-${source}`, () => scanSource(run, source, group)));
    } catch {
      scans.push({ source, ok: false, errors: ['zap-launch-error'] });
    }
  }
  return {
    ...scans[0], sources: scans, ok: scans.length > 0 && scans.every(({ ok }) => ok),
    passiveSelfcheck: scans.length > 0 && scans.every(({ passiveSelfcheck }) => passiveSelfcheck),
    received: scans.flatMap(({ received }) => received ?? []),
    evidence: scans.flatMap(({ evidence }) => evidence ?? []),
    findings: scans.flatMap(({ findings }) => findings ?? []),
  };
}
