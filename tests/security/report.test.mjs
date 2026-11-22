import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { AssertionFailure, compareRows, handlers, verifyError } from './cases.mjs';
import { expectedPages } from './fixture.mjs';
import { contractOperations, loadModel, readJSON, reviewRefsCurrent, sentinelPath, validateScope } from './model.mjs';
import { buildReport, writeReports } from './report.mjs';
import { matchBrowserHar } from './web.mjs';
import { addonIds, inspectExport, zapJobs } from './zap.mjs';

const model = loadModel();
const marker = 'fake-secret-report-marker';
const buildSha = 'a'.repeat(40);
const origin = 'https://127.0.0.1:8443';

function importSample(http, drop = () => false) {
  const scans = [...Map.groupBy(http, ({ source }) => source)].map(([source, exchanges]) => {
    const entries = exchanges.filter((exchange) => !drop(exchange)).map(({ method, path, status }) => ({
      request: { method, url: origin + path + '?marker=' + marker }, response: { status },
    }));
    return {
      source, ...inspectExport({ origin }, entries, exchanges), passiveSelfcheck: true, ok: true, started: true, exitCode: 0,
      version: '2.17.0', completedJobs: zapJobs, addons: { ...Object.fromEntries(addonIds.map((id) => [id, '1.0.0'])),
        pscanrules: '77.0.0' },
    };
  });
  return { ok: true, passiveSelfcheck: true, sources: scans, received: scans.flatMap(({ received }) => received),
    evidence: scans.flatMap(({ evidence }) => evidence) };
}

function simulatedRun() {
  const http = [...model.cases.values()].flatMap(({ id, source, http }) =>
    http.map(({ step, operation, status, sessionState }) => ({ caseId: id, step, operation, status, source, sessionState,
      method: model.operations.get(operation).method, path: model.operations.get(operation).path,
      har: { request: { headers: [{ name: 'Authorization', value: marker }] } },
    })),
  );
  return {
    buildSha, http, toolErrors: [], fixture: { started: true, cleaned: true },
    caseResults: new Map([...model.cases.values()].map(({ id, oracle }) =>
      [id, { outcome: 'PASS', assertions: oracle.assertions.map((item) => ({ assertion: item.id, ok: true, raw: marker })) }],
    )),
    zap: importSample(http),
  };
}

function exportSample(report, expectedExit, verifySummary = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), 'lf-security-report-check-'));
  try {
    const artifact = join(dir, 'artifact');
    assert.equal(writeReports(artifact, dir, report), expectedExit);
    assert.deepEqual(readdirSync(artifact).sort(), ['results.json', 'summary.md']);
    for (const file of readdirSync(artifact)) assert.ok(!readFileSync(join(artifact, file), 'utf8').includes(marker));
    const item = JSON.parse(readFileSync(join(artifact, 'results.json'), 'utf8'));
    const summary = readFileSync(join(artifact, 'summary.md'), 'utf8');
    for (const [, pointer] of summary.matchAll(/results\.json#(\/[A-Za-z0-9/]+)/gu)) {
      assert.notEqual(pointer.slice(1).split('/').reduce((value, part) => value?.[part], item), undefined, pointer);
    }
    verifySummary(summary);
    assert.deepEqual(Object.keys(item.cases[0].observed.http[0]).sort(),
      ['caseId', 'method', 'operation', 'path', 'sessionState', 'source', 'status', 'step']);
    assert.deepEqual(Object.keys(item.cases[0].observed.assertions[0]).sort(), ['assertion', 'ok', 'step']);
    return item;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('filtered report accepts complete case observations and strips injected credential markers', () => {
  const run = simulatedRun();
  run.caseResults.get('UC01-SESSION').assertions.push({ assertion: marker, ok: false });
  const report = exportSample(buildReport(model, run), 0, (md) => {
    assert.match(md, /ZAP thực chạy · nhập HAR và chờ phân tích thụ động/u);
    assert.match(md, /Authenticated active DAST · \*\*chưa thực hiện\*\*/u);
    assert.match(md, /Quyền đọc hồ sơ · runner.*profile-a-identity/u);
  });
  assert.ok(report.passed);
  assert.equal(report.catalogCount, 50);
  assert.equal(report.scope.authenticatedActiveDast.status, 'not-performed');
  assert.deepEqual(report.coverage.counts, { runner: { applicable: 31, complete: 23 }, ui: { applicable: 4, complete: 4 } });
});

function recordProof(run, id, assertion, proof) {
  const collected = run.caseResults.get(id);
  const entry = collected.assertions.find((item) => item.assertion === assertion);
  assert.ok(entry, assertion);
  Object.assign(entry, proof);
}

test('wrong observed fixture ID remains FAIL, and exits nonzero after writing both reports', () => {
  const run = simulatedRun();
  const expected = expectedPages('lost', 'a')[1];
  const observed = structuredClone(expected);
  observed[0].id = marker;
  const { ok, ...counts } = compareRows(observed, expected);
  recordProof(run, 'UC02-CURSOR', 'cursor-same-tab-records', { ok, ...counts, observed });
  const report = exportSample(buildReport(model, run), 1);
  const result = report.cases.find(({ caseId }) => caseId === 'UC02-CURSOR');
  assert.equal(result.outcome, 'FAIL');
  assert.equal(result.observed.assertions.find(({ assertion }) => assertion === 'cursor-same-tab-records').mismatchCount, 1);
  const failure = report.failures.find(({ caseId }) => caseId === result.caseId);
  assert.equal(failure.checks[0].step, 'cursor-same-tab');
  assert.ok(failure.obligationIds.includes('SEC-A01-02/db') && failure.checks[0].evidenceRef.includes('/assertions/'));
  assert.equal(report.criteria.find(({ chunkId }) => chunkId === 'SEC-A01-02').outcome, 'FAIL');
});

test('one required exchange missing from a duplicate group stays MISSING without guessing its step', () => {
  const run = simulatedRun();
  run.zap = importSample(run.http, ({ source, step }) => source === 'ui' && step === 'next-page');
  const report = exportSample(buildReport(model, run), 1);
  const result = report.cases.find(({ caseId }) => caseId === 'UC01-02-WEB-E2E');
  assert.equal(result.outcome, 'MISSING');
  assert.equal(result.observed.receivedByZap.filter(({ operation }) => operation === 'listMyItems').length, 0);
  assert.equal(report.zap.receivedCount, report.zap.httpCount - 1);
  assert.deepEqual(report.zap.evidence.find(({ source, operation, status }) =>
    source === 'ui' && operation === 'listMyItems' && status === 200), {
    source: 'ui', operation: 'listMyItems', method: 'GET', path: '/api/me/items', status: 200,
    expectedCount: 2, receivedCount: 1,
  });
  assert.ok(report.zap.sources.find(({ source }) => source === 'ui').errors.includes('zap-reconciliation-incomplete'));
  assert.equal(report.counts.FAIL, 0);
});

test('wrong status and wrong error code are FAIL, including when ZAP receives the response', () => {
  const run = simulatedRun();
  const exchange = run.http.find(({ step }) => step === 'absent-validate');
  exchange.status = 403;
  run.zap = importSample(run.http);
  function check(assertion, ok) {
    recordProof(run, 'UC02-INVALID-TAB', assertion, { ok });
    if (!ok) throw new AssertionFailure(assertion);
  }
  assert.throws(() => verifyError(check, 'missing-tab', {
    headers: { 'content-type': 'application/json' }, json: () => ({ code: 'INVALID_CURSOR' }),
  }, 'INVALID_REQUEST'), AssertionFailure);
  const report = exportSample(buildReport(model, run), 1);
  assert.equal(report.cases.find(({ caseId }) => caseId === 'UC01-SESSION-ABSENT').reason, 'http-status-mismatch');
  assert.equal(report.cases.find(({ caseId }) => caseId === 'UC02-INVALID-TAB').outcome, 'FAIL');
});

test('a changed contract route requires both a selection and a matching context', () => {
  const openapi = readJSON('docs/api/core/openapi.json');
  openapi.security = [{ CoreSession: [] }];
  openapi.paths['/new'] = { get: { operationId: 'getNew', responses: { 200: {} } } };
  const operations = contractOperations(openapi);
  const plan = readFileSync('tests/security/zap.yaml', 'utf8');
  const scope = { ...model.manifest.scope };
  assert.deepEqual(operations.get('getNew').security, [{ CoreSession: [] }]);
  assert.deepEqual(operations.get('createGoogleSession').security, []);
  assert.throws(() => validateScope(operations, scope, plan), /phạm vi từng operation: getNew/u);
  scope.getNew = { kind: 'business' };
  assert.throws(() => validateScope(operations, scope, plan), /Context ZAP/u);
  scope.getNew = { kind: 'excluded', reason: 'Outside the selected sprint' };
  validateScope(operations, scope, plan);
});

test('UI without Core responses and UI missing its page action both fail with MISSING', () => {
  for (const omit of [({ source }) => source === 'ui', ({ step }) => step === 'next-page']) {
    const run = simulatedRun();
    run.http = run.http.filter((exchange) => !omit(exchange));
    run.zap = importSample(run.http);
    const report = exportSample(buildReport(model, run), 1);
    const result = report.cases.find(({ caseId }) => caseId === 'UC01-02-WEB-E2E');
    assert.equal(result.outcome, 'MISSING');
    assert.equal(result.reason, 'http-evidence-missing');
    assert.ok(report.coverage.operations.find(({ operation }) => operation === 'listMyItems').sources.runner.received > 0);
  }
});

test('browser HAR links each list response to its action using the in-memory URL', () => {
  const path = '/api/me/items';
  const observed = ['open-items', 'next-page'].map((step, index) => ({
    method: 'GET', path, status: 200, source: 'ui', step, url: `${origin}${path}?tab=lost${index ? '&cursor=' + marker : ''}`,
  }));
  const entries = observed.map(({ url, method, status }) => ({ request: { url, method }, response: { status } }));
  const matches = matchBrowserHar(origin, [...entries].reverse(), observed);
  assert.equal(matches[1].har.request.url, observed[1].url);
  assert.ok(!Object.hasOwn(matches[1], 'url'));
  assert.throws(() => matchBrowserHar(origin, [entries[0]], observed), /ui-har-invalid/u);
  assert.throws(() => matchBrowserHar(origin, [entries[0], entries[0], entries[1]], observed), /ui-har-invalid/u);
});

test('a missing decision assertion and a missing independent control block the gate', () => {
  const run = simulatedRun();
  const replay = run.caseResults.get('UC01-SESSION-REPLAY');
  replay.assertions = replay.assertions.filter(({ assertion }) => assertion !== 'same-attempt-session');
  const session = run.caseResults.get('UC01-SESSION');
  session.assertions = session.assertions.filter(({ assertion }) => assertion !== 'validated-account');
  const report = exportSample(buildReport(model, run), 1);
  const replayResult = report.cases.find(({ caseId }) => caseId === 'UC01-SESSION-REPLAY');
  assert.equal(replayResult.outcome, 'MISSING');
  assert.equal(replayResult.reason, 'assertion-evidence-missing');
  assert.deepEqual(replayResult.missingAssertions, ['same-attempt-session']);
  const absent = report.cases.find(({ caseId }) => caseId === 'UC01-SESSION-ABSENT');
  assert.equal(absent.reason, 'control-evidence-missing');
  assert.equal(absent.controls.find(({ assertion }) => assertion === 'validated-account').complete, false);
});

test('the replay handler uses one fixed input and distinguishes a changed session at repeat', async () => {
  const run = simulatedRun();
  const attempt = { idToken: marker, attemptId: 'fixture-attempt', deviceType: 'ios' };
  const requests = [];
  const state = { signIdentity: async () => attempt, a: { accountId: 'fixture-a' } };
  const api = async (step, options) => {
    requests.push({ step, ...options });
    return {
      headers: { 'content-type': 'application/json' },
      json: () => ({
        accountId: state.a.accountId, sessionToken: step === 'initial' ? 'fixture-original' : marker,
        expiresAt: new Date(Date.now() + 10_000).toISOString(),
      }),
    };
  };
  function check(assertion, ok) {
    recordProof(run, 'UC01-SESSION-REPLAY', assertion, { ok });
    if (!ok) throw new AssertionFailure(assertion);
  }
  await assert.rejects(handlers['UC01-SESSION-REPLAY']({ api, check, state }), /same-attempt-session/u);
  assert.deepEqual(requests.map(({ data }) => data), [attempt, attempt]);
  const report = exportSample(buildReport(model, run), 1);
  const failure = report.failures.find(({ caseId }) => caseId === 'UC01-SESSION-REPLAY');
  assert.deepEqual(failure.assertions, ['same-attempt-session']);
  assert.equal(failure.checks[0].step, 'repeat');
  assert.deepEqual(failure.obligationIds, ['SEC-A07-01/core']);
});

test('one missing passive self-check or a launch failure preserves the other source', () => {
  const run = simulatedRun();
  const ui = run.zap.sources.find(({ source }) => source === 'ui');
  ui.passiveSelfcheck = false;
  const missing = exportSample(buildReport(model, run), 1);
  assert.equal(missing.zap.sources[0].ok, true);
  assert.equal(missing.zap.sources[1].passiveCheck, 'missing');
  assert.equal(missing.zap.sources[1].receivedCount, 5);
  assert.ok(missing.toolErrors.includes('zap-selfcheck-missing'));
  assert.equal(missing.cases.find(({ source }) => source === 'ui').reason, 'zap-source-selfcheck-missing');
  run.zap.sources[1] = { source: 'ui', ok: false, errors: ['zap-launch-error', marker] };
  run.zap.evidence = run.zap.evidence.filter(({ source }) => source === 'runner');
  run.zap.received = run.zap.received.filter(({ source }) => source === 'runner');
  const partial = exportSample(buildReport(model, run), 1);
  assert.equal(partial.zap.sources[0].ok, true);
  assert.equal(partial.zap.sources[1].import, 'missing');
  assert.equal(partial.zap.sources[1].receivedCount, 0);
  assert.ok(partial.toolErrors.includes('zap-launch-error'));
  run.zap = { sources: [{ source: 'runner', ok: false, errors: ['zap-launch-error'] }] };
  const never = exportSample(buildReport(model, run), 1, (md) => assert.match(md, /ZAP thực chạy · chưa chạy/u));
  assert.equal(never.zap.method, 'not-run');
});

function observeCacheAlert(run) {
  run.zap.findings = [
    { rule: '10015', cwe: 'CWE-525', risk: 'low', operation: 'getMyProfile', method: 'GET',
      path: '/api/me/profile', source: 'runner', proof: marker },
    { rule: '10010', operation: 'getMyProfile', method: 'GET', path: sentinelPath, source: 'runner' },
  ];
}

test('cache triage binds source add-on, digests, HTTP oracle and still preserves a failure', () => {
  const run = simulatedRun();
  observeCacheAlert(run);
  const pass = exportSample(buildReport(model, run), 0);
  assert.equal(pass.zap.findings.length, 1);
  const [finding] = pass.zap.findings;
  assert.equal(finding.reviewMatched, true);
  assert.equal(finding.addonVersion, '77.0.0');
  assert.equal(finding.cache.outcome, 'PASS');
  assert.equal(finding.cache.native, 'MISSING');
  assert.ok(finding.cache.groups.length && finding.cache.checks[0].evidenceRef.includes('/assertions/'));
  assert.equal(pass.obligations.find(({ id }) => id === 'SEC-A06-03/mobile').outcome, 'MISSING');
  const readiness = structuredClone(run.zap.findings[0]);
  Object.assign(readiness, { operation: 'getCoreReadiness', path: '/api/health/ready' });
  const edge = buildReport(model, { ...run, zap: { ...run.zap, findings: [readiness] } }).zap.findings[0];
  assert.equal(edge.cache, undefined);
  assert.match(edge.reason, /không khai báo AuthNoStore/u);
  run.zap.sources[0].addons.pscanrules = '78.0.0';
  assert.equal(buildReport(model, run).zap.findings[0].reviewMatched, false);
  run.zap.sources[0].addons.pscanrules = '77.0.0';
  const stale = structuredClone(model.review.get('10015'));
  stale.refs[0].sha256 = 'f'.repeat(64);
  assert.equal(reviewRefsCurrent(stale), false);
  const copy = { ...model, review: new Map(model.review) };
  copy.review.delete('10015');
  assert.equal(buildReport(copy, run).zap.findings[0].reviewMatched, false);
  recordProof(run, 'CORE-HTTP-PRIVACY', 'getMyProfile-no-store', { ok: false, raw: marker });
  const fail = exportSample(buildReport(model, run), 1, (md) => {
    assert.match(md, /REVIEW · ZAP 10015/u);
    assert.match(md, /FAIL · CORE-HTTP-PRIVACY · getMyProfile-no-store/u);
  });
  assert.equal(fail.zap.findings[0].cache.outcome, 'FAIL');
  assert.equal(fail.obligations.find(({ id }) => id === 'SEC-A06-03/core').outcome, 'FAIL');
});

test('cleanup failure retains the original tool failure and filters both outputs', () => {
  const run = simulatedRun();
  run.fixture.cleaned = false;
  run.toolErrors = ['fixture-start-error', 'fixture-cleanup-error', marker];
  const report = exportSample(buildReport(model, run), 1);
  assert.deepEqual(report.toolErrors, ['fixture-start-error', 'fixture-cleanup-error']);
  assert.equal(report.fixture.cleaned, false);
});

test('manifest v3 remains readable and repeated validation preserves bytes', () => {
  const file = 'tests/security/manifest.json';
  const bytes = readFileSync(file);
  const v3 = structuredClone(model.manifest);
  v3.version = 3;
  for (const item of v3.cases) delete item.oracle;
  assert.equal(loadModel(v3).manifest.version, 3);
  assert.deepEqual(loadModel().manifest, loadModel().manifest);
  assert.deepEqual(readFileSync(file), bytes);
  assert.deepEqual(buildReport(model, simulatedRun()), buildReport(model, simulatedRun()));
});

test('invalid case, operation, step, SCN, assertion and control references fail validation', () => {
  for (const [mutate, message] of [
    [(item, cases) => cases.push(item), /ID ca trùng/u],
    [(item) => { item.http[0].operation = 'notInOpenAPI'; }, /notInOpenAPI/u],
    [(item) => { item.http[0].scenario = 'SCN-AUTH-99'; }, /thiếu SCN/u],
    [(item) => { item.oracle.assertions[0].step = 'unknown'; }, /sai step/u],
    [(item) => item.oracle.assertions.pop() && item.oracle.assertions.shift(), /thiếu oracle HTTP/u],
    [(item) => item.oracle.assertions.push(item.oracle.assertions[0]), /trùng assertion/u],
    [(item) => { item.oracle.controls[0].caseId = 'UNKNOWN'; }, /sai đối chứng/u],
    [(item) => { item.oracle.controls[0].assertion = 'next-page'; }, /sai đối chứng/u],
    [(item) => { item.oracle.controls[0].assertion = 'sign-in-fixture-account'; }, /chính kết quả/u],
    [(item) => { item.layer = 'native'; }, /tầng web E2E/u],
  ]) {
    const clone = structuredClone(model.manifest);
    mutate(clone.cases.find(({ source }) => source === 'ui'), clone.cases);
    assert.throws(() => loadModel(clone), message);
  }
});
