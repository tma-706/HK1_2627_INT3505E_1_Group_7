import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { makeHar, sentinelPath, sentinelRule } from './http.mjs';
import { readJSON } from './model.mjs';
import { command } from './runtime.mjs';

const image = 'ghcr.io/zaproxy/zaproxy@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af';
const addonIds = ['automation', 'exim', 'pscan', 'pscanrules', 'reports'];
export const zapIntegration = { image, mode: 'automation-har-import-no-replay', network: 'none' };
const key = ({ method, path, status }) => `${method} ${path} ${status}`;

function inspectExport(run, entries, exchanges) {
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
  const missing = [];
  const matches = [];
  for (const { caseId, step, operation, method, path, status } of exchanges) {
    const tuple = key({ method, path, status });
    const count = received.get(tuple) ?? 0;
    if (count > 0) {
      received.set(tuple, count - 1);
      matches.push({ caseId, step, operation, method, path, status });
    } else {
      missing.push({ caseId, step, operation, method, path, status });
    }
  }
  if ([...received.values()].some((count) => count > 0)) throw new Error('zap-unexpected-http');
  return { missing, received: matches };
}

function inspectAlerts(run, report, exchanges) {
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
        const affected = exchanges.filter((item) => item.path === pathname && item.method === method);
        if (!affected.length) throw new Error('zap-alert-without-exchange');
        const id = `${pluginid}/${method}/${pathname}`;
        findings.set(id, {
          rule: pluginid, cwe: /^\d{1,6}$/u.test(cweid) ? 'CWE-' + cweid : null,
          risk: ['info', 'low', 'medium', 'high'][Number(riskcode)] ?? 'unknown',
          operation: affected[0].operation, method, path: pathname,
          caseIds: [...new Set(affected.map(({ caseId }) => caseId))],
        });
      }
    }
  }
  return { passiveSelfcheck, findings: [...findings.values()] };
}

export async function runZap(run, exchanges) {
  const dir = run.dir + '/zap';
  mkdirSync(dir, { mode: 0o700 });
  writeFileSync(dir + '/input.har', JSON.stringify(makeHar(exchanges, run.origin)), { mode: 0o600 });
  const af = readFileSync('tests/security/zap.yaml', 'utf8').replaceAll('@ORIGIN@', run.origin)
    .replaceAll('@ORIGIN_REGEX@', run.origin.replaceAll('.', '\\.'));
  writeFileSync(dir + '/plan.yaml', af, { mode: 0o600 });
  writeFileSync(run.dir + '/zap-started', '', { mode: 0o600 });
  const result = await command('docker', [
    'run', '--rm', '--network', 'none', '--hostname', 'localhost', '--name', run.scanner,
    '--label', `lf.security.owner=${run.project}`,
    '--user', `${process.getuid()}:${process.getgid()}`, '-e', 'HOME=/zap/wrk',
    '-v', `${dir}:/zap/wrk`, image, 'zap.sh', '-dir', '/zap/wrk/home', '-cmd', '-autorun', '/zap/wrk/plan.yaml',
  ], { timeout: 240_000 });
  if (!existsSync(dir + '/passive.json')) throw new Error('zap-report-missing');
  if (!existsSync(dir + '/received.har')) throw new Error('zap-export-missing');
  const report = readJSON(dir + '/passive.json');
  const entries = readJSON(dir + '/received.har').log.entries;
  const { passiveSelfcheck, findings } = inspectAlerts(run, report, exchanges);
  const http = inspectExport(run, entries, exchanges);
  const jobs = ['passiveScan-config', 'import', 'passiveScan-wait', 'export', 'report', 'exitStatus'];
  const completedJobs = jobs.filter((job) => result.stdout.includes(`Job ${job} finished`));
  const version = /^\d+\.\d+\.\d+$/u.test(report['@version']) ? report['@version'] : null;
  const addons = {};
  const installed = readFileSync(dir + '/home/zap.log', 'utf8').split('\n').find((line) => line.includes('Installed add-ons:')) ?? '';
  for (const id of addonIds) {
    const match = new RegExp(`\\[id=${id}, version=(\\d+(?:\\.\\d+)*)\\]`, 'u').exec(installed);
    if (match) addons[id] = match[1];
  }
  return {
    ...zapIntegration, exitCode: result.status, version, addons, completedJobs,
    passiveSelfcheck, findings, ...http,
    ok: result.status === 0 && completedJobs.length === jobs.length && passiveSelfcheck && http.missing.length === 0 && Boolean(version) && Object.keys(addons).length === addonIds.length,
  };
}
