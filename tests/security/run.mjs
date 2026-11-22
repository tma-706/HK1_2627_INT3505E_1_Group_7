import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, mkdtempSync, readFileSync, readlinkSync, rmSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
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
  const validateStart = performance.now();
  const model = loadModel();
  assert.deepEqual([...model.cases.keys()].sort(), Object.keys(handlers).sort(), 'Manifest và runner phải đăng ký cùng ca');
  const validateMs = Math.round(performance.now() - validateStart);
  console.log(`Manifest: ${model.chunks.size} chunk, ${model.obligations.length} nghĩa vụ, ${model.cases.size} ca.`);
  if (mode !== '--validate') {
    assert.equal(mode, undefined, 'Đối số không hợp lệ');
    const sha = await command('git', ['rev-parse', 'HEAD'], { timeout: 10_000 });
    const gitStatus = await command('git', ['status', '--porcelain'], { timeout: 10_000 });
    const buildSha = sha.stdout.trim();
    assert.ok(sha.status === 0 && /^[a-f0-9]{40}$/u.test(buildSha), 'Không xác định được commit của build');
    assert.equal(gitStatus.status, 0, 'Không đọc được tình trạng checkout');
    const dirty = Boolean(gitStatus.stdout.trim());
    if (ciKey()) {
      assert.equal(buildSha, process.env.GITHUB_SHA, 'Checkout phải đúng SHA CI');
      assert.ok(!dirty, 'Checkout CI phải sạch');
    }
    const checkout = { dirty, sha256: await fingerprint() };
    process.exitCode = await runSuite(model, buildSha, checkout, validateMs);
  }
}

async function fingerprint() {
  const files = await command('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--deduplicate'], { timeout: 10_000 });
  assert.equal(files.status, 0, 'Không liệt kê được file của checkout');
  const hash = createHash('sha256');
  for (const path of files.stdout.split('\0').filter(Boolean).sort()) {
    const file = lstatSync(path, { throwIfNoEntry: false });
    hash.update(path + '\0' + (file ? String(file.mode & 0o170111) : 'missing') + '\0');
    if (file?.isSymbolicLink()) hash.update(readlinkSync(path, { encoding: 'buffer' }));
    else if (file?.isFile()) hash.update(createHash('sha256').update(readFileSync(path)).digest());
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function runSuite(model, buildSha, checkout, validateMs) {
  let run;
  try {
    run = claimRun(root);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const scratch = mkdtempSync(root + '/dist/.security-blocked-');
    try {
      const report = buildReport(model, { buildSha, checkout, caseResults: new Map(), http: [], fixture: {},
        toolErrors: ['fixture-owner-conflict'], timingMs: { validate: validateMs } });
      console.error('Gate FAIL · khóa dist/.security-run còn chủ sở hữu · ' + scratch + '/report');
      return writeReports(scratch + '/report', scratch, report);
    } finally {
      // Only the two filtered reports remain in this separate directory.
      for (const name of ['results.json', 'summary.md']) rmSync(scratch + '/' + name, { force: true });
    }
  }
  const toolErrors = new Set();
  const fixture = { started: false, cleaned: false };
  const timingMs = { validate: validateMs };
  async function measure(stage, work) {
    const started = performance.now();
    try { return await work(); }
    finally { timingMs[stage] = Math.round(performance.now() - started); }
  }
  let caseResults = new Map();
  let client;
  let zap;
  const interrupt = () => toolErrors.add('interrupted');
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    console.log('Dựng fixture HTTPS tổng hợp.');
    const startup = await measure('fixture', () => startFixture(run));
    if (startup.started) {
      fixture.started = true;
      fixture.readinessRetries = startup.readinessRetries;
      client = recordedClient(run.origin, readFileSync(run.fixtureDir + '/tls/ca.crt'), model.operations);
    } else {
      toolErrors.add(startup.error);
    }
    caseResults = await measure('cases', () => executeCases(model, {
      client, root, run, fixtureDir: run.fixtureDir, toolErrors, command, measure, seed: (sql) => seedFixture(run, sql),
    }, (id, outcome) => console.log(`${id} ${outcome}`)));
    if (client?.exchanges.length) {
      console.log('Đối soát bản ghi HTTPS qua ZAP Automation Framework.');
      try {
        zap = await runZap(run, client.exchanges, measure);
        if (!zap.ok) toolErrors.add('zap-execution-error');
      } catch {
        toolErrors.add('zap-execution-error');
      }
    }
  } catch {
    toolErrors.add('runner-error');
  } finally {
    try {
      fixture.cleaned = await measure('cleanup', () => cleanupOwned(root, run.key, false));
    } catch {
      fixture.cleaned = false;
    }
    if (!fixture.cleaned) toolErrors.add('fixture-cleanup-error');
  }
  try {
    try {
      const head = await command('git', ['rev-parse', 'HEAD'], { timeout: 10_000 });
      if (head.stdout.trim() !== buildSha || await fingerprint() !== checkout.sha256) toolErrors.add('build-input-changed');
    } catch {
      toolErrors.add('build-input-changed');
    }
    const report = buildReport(model, { buildSha, checkout, caseResults, http: client?.exchanges ?? [], zap, toolErrors, fixture, timingMs });
    const status = writeReports(root + '/dist/security', run.dir, report);
    console.log(`Gate ${report.passed ? 'PASS' : 'FAIL'} · dist/security/summary.md · dist/security/results.json`);
    return status;
  } finally {
    if (fixture.cleaned) releaseRun(run);
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
}
