import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { readJSON, sentinelPath } from '../../tests/security/model.mjs';
import { makeHar, sentinelRule } from '../../tests/security/http.mjs';
import { command } from '../../tests/security/runtime.mjs';
import { runZap, zapIntegration } from '../../tests/security/zap.mjs';

process.umask(0o077);
const dir = mkdtempSync(process.env.RUNNER_TEMP + '/lf-af-equivalence-');
const origin = 'https://127.0.0.1:8443';
const actionDir = dir + '/action';
const directDir = dir + '/direct';
const project = 'lf-af-trial-' + process.env.GITHUB_RUN_ID;
const actionUrl = 'https://raw.githubusercontent.com/zaproxy/action-af/d186d5d9536d0f1380e5eaa58168432fefc8ed6d/dist/index.js';
try {
  mkdirSync(actionDir, { mode: 0o700 });
  mkdirSync(directDir, { mode: 0o700 });
  const har = makeHar([], origin).log.entries[0];
  const path = '/api/health/ready';
  har.request.url = origin + path;
  har.response.headers = [{ name: 'Content-Type', value: 'application/json' }];
  har.response.content = { text: '{"status":"ok","database":"ok"}', mimeType: 'application/json', size: 31 };
  const errors = new Set();
  const local = await runZap({ dir: directDir, origin, scanner: project, project }, [{
    source: 'runner', method: 'GET', operation: 'getCoreReadiness', path, status: 200,
    caseId: 'EDGE-FIXTURE-TLS', step: 'gateway-ready', sessionState: 'readiness', har,
  }], errors);
  const attempt = { local: { ok: local.ok, received: local.received.length, selfcheck: local.passiveSelfcheck, exit: local.exitCode, errors: [...errors] } };
  for (const name of ['input.har', 'plan.yaml']) writeFileSync(actionDir + '/' + name, readFileSync(directDir + '/zap/runner/' + name));
  const script = dir + '/action.mjs';
  const fetched = await command('curl', ['-fsSL', '-o', script, actionUrl], { timeout: 20_000 });
  if (fetched.status !== 0) throw new Error('Action source unavailable');
  const env = { PATH: process.env.PATH, GITHUB_WORKSPACE: actionDir, INPUT_PLAN: 'plan.yaml',
    INPUT_DOCKER_NAME: zapIntegration.image, INPUT_CMD_OPTIONS: '-dir /zap/wrk/home' };
  const action = await command(process.execPath, [script], { env, timeout: 180_000 });
  const read = (name) => {
    try { return readJSON(actionDir + '/' + name); } catch { return null; }
  };
  const findings = read('passive.json');
  const exported = read('received.har')?.log.entries ?? [];
  attempt.action = {
    exit: action.status,
    ready: exported.filter(({ request, response }) => new URL(request.url).pathname === path && response.status === 200).length,
    selfcheck: findings?.site.some(({ alerts }) => alerts.some(({ pluginid, instances }) =>
      pluginid === sentinelRule && instances.some(({ uri }) => new URL(uri).pathname === sentinelPath))) ?? false,
    rawHar: exported.length > 0, rawReport: Boolean(findings),
    gitHubError: action.stdout.split('\n').find((line) => line.startsWith('::error::')) ?? null,
    privateFilesMaintained: (await command('stat', ['-c', '%a', actionDir])).stdout.trim() === '700',
  };
  console.log(JSON.stringify(attempt));
  if (!local.ok) process.exitCode = 1;
} finally {
  const listing = await command('docker', ['ps', '-aq']);
  const ids = listing.stdout.trim().split(/\s+/u).filter(Boolean);
  if (ids.length) {
    const inspected = await command('docker', ['inspect', ...ids]);
    for (const item of JSON.parse(inspected.stdout)) {
      if (item.Mounts.some(({ Source, Destination }) => Source === actionDir && Destination === '/zap/wrk')) {
        await command('docker', ['rm', '--force', item.Id]);
      }
    }
  }
  rmSync(dir, { recursive: true, force: true });
}
