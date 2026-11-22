import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { executeCases, handlers } from './cases.mjs';
import { recordedClient } from './http.mjs';
import { loadModel } from './model.mjs';
import { buildReport, writeReports } from './report.mjs';
import { ciKey, claimRun, cleanupOwned, command, releaseRun, seedFixture, startFixture } from './runtime.mjs';
import { runZap } from './zap.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url)).replace(/\/$/u, '');
process.chdir(root);
process.umask(0o077);

const mode = process.argv[2];
if (mode === '--cleanup') {
  const cleaned = await cleanupOwned(root, ciKey());
  if (!cleaned) console.error('Cleanup failed or this job does not own dist/.security-run.');
  process.exitCode = cleaned ? 0 : 1;
} else {
  const model = loadModel();
  assert.deepEqual([...model.cases.keys()].sort(), Object.keys(handlers).sort(), 'Manifest và runner phải đăng ký cùng ca');
  console.log(`Manifest: ${model.chunks.size} chunk, ${model.obligations.length} nghĩa vụ, ${model.cases.size} ca.`);
  if (mode !== '--validate') {
    assert.equal(mode, undefined, 'Đối số không hợp lệ');
    const sha = await command('git', ['rev-parse', 'HEAD'], { timeout: 10_000 });
    const gitStatus = await command('git', ['status', '--porcelain'], { timeout: 10_000 });
    const buildSha = sha.stdout.trim();
    assert.ok(sha.status === 0 && /^[a-f0-9]{40}$/u.test(buildSha), 'Không xác định được commit của build');
    assert.ok(gitStatus.status === 0 && !gitStatus.stdout.trim(), 'Commit các đầu vào đã duyệt để báo cáo truy về đúng revision.');
    if (ciKey()) assert.equal(buildSha, process.env.GITHUB_SHA, 'Checkout phải đúng SHA CI');
    process.exitCode = await runSuite(model, buildSha);
  }
}

async function runSuite(model, buildSha) {
  const run = claimRun(root);
  const toolErrors = new Set();
  const fixture = { started: false, cleaned: false };
  let caseResults = new Map();
  let client;
  let zap;
  const interrupt = () => toolErrors.add('interrupted');
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    console.log('Dựng fixture HTTPS tổng hợp.');
    fixture.started = await startFixture(run);
    if (fixture.started) {
      client = recordedClient(run.origin, readFileSync(run.fixtureDir + '/tls/ca.crt'), model.operations);
    } else {
      toolErrors.add('fixture-start-error');
    }
    caseResults = await executeCases(model, {
      client, root, run, fixtureDir: run.fixtureDir, toolErrors, command, seed: (sql) => seedFixture(run, sql),
    }, (id, outcome) => console.log(`${id} ${outcome}`));
    if (client?.exchanges.length) {
      console.log('Đối soát bản ghi HTTPS qua ZAP Automation Framework.');
      try {
        zap = await runZap(run, client.exchanges, toolErrors);
        if (!zap.ok) toolErrors.add('zap-execution-error');
      } catch (error) {
        toolErrors.add('zap-execution-error');
        if (error instanceof Error && /^zap-[a-z-]+$/u.test(error.message)) toolErrors.add(error.message);
      }
    }
  } catch {
    toolErrors.add('runner-error');
  } finally {
    try {
      fixture.cleaned = await cleanupOwned(root, run.key, false);
    } catch {
      fixture.cleaned = false;
    }
    if (!fixture.cleaned) toolErrors.add('fixture-cleanup-error');
  }
  try {
    const report = buildReport(model, { buildSha, caseResults, http: client?.exchanges ?? [], zap, toolErrors, fixture });
    const status = writeReports(root + '/dist/security', run.dir, report);
    console.log(`Gate ${report.passed ? 'PASS' : 'FAIL'} · dist/security/summary.md · dist/security/results.json`);
    return status;
  } finally {
    if (fixture.cleaned) releaseRun(run);
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
}
