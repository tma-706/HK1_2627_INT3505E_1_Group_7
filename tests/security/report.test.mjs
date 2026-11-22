import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { AssertionFailure, compareRows, verifyError } from './cases.mjs';
import { expectedPages } from './fixture.mjs';
import { contractOperations, loadModel, readJSON, validateScope } from './model.mjs';
import { buildReport, writeReports } from './report.mjs';
import { matchBrowserHar } from './web.mjs';
import { inspectExport } from './zap.mjs';

const model = loadModel();
const marker = 'fake-secret-report-marker';
const buildSha = 'a'.repeat(40);
const origin = 'https://127.0.0.1:8443';

function importSample(http, drop = () => false) {
  const scans = [...Map.groupBy(http, ({ source }) => source)].map(([source, exchanges]) => {
    const entries = exchanges.filter((exchange) => !drop(exchange)).map(({ method, path, status }) => ({
      request: { method, url: origin + path + '?marker=' + marker }, response: { status },
    }));
    return { source, ...inspectExport({ origin }, entries, exchanges), passiveSelfcheck: true, ok: true };
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
    caseResults: new Map([...model.cases.keys()].map((id) =>
      [id, { outcome: 'PASS', assertions: [{ assertion: 'synthetic-proof', ok: true, raw: marker }] }],
    )),
    zap: importSample(http),
  };
}

function exportSample(report, expectedExit) {
  const dir = mkdtempSync(join(tmpdir(), 'lf-security-report-check-'));
  try {
    const artifact = join(dir, 'artifact');
    assert.equal(writeReports(artifact, dir, report), expectedExit);
    assert.deepEqual(readdirSync(artifact).sort(), ['results.json', 'summary.md']);
    for (const file of readdirSync(artifact)) assert.ok(!readFileSync(join(artifact, file), 'utf8').includes(marker));
    const item = JSON.parse(readFileSync(join(artifact, 'results.json'), 'utf8'));
    assert.deepEqual(Object.keys(item.cases[0].observed.http[0]).sort(),
      ['caseId', 'method', 'operation', 'path', 'sessionState', 'source', 'status', 'step']);
    assert.deepEqual(Object.keys(item.cases[0].observed.assertions[0]).sort(), ['assertion', 'ok']);
    return item;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('filtered report accepts complete case observations and strips injected credential markers', () => {
  const report = exportSample(buildReport(model, simulatedRun()), 0);
  assert.ok(report.passed);
  assert.equal(report.catalogCount, 50);
});

test('wrong observed fixture ID remains FAIL, and exits nonzero after writing both reports', () => {
  const run = simulatedRun();
  const expected = expectedPages('lost', 'a')[0];
  const observed = structuredClone(expected);
  observed[0].id = marker;
  const { ok, ...counts } = compareRows(observed, expected);
  run.caseResults.get('UC02-LOST').assertions.push({ assertion: 'a-page-1-records', ok, ...counts, observed });
  const report = exportSample(buildReport(model, run), 1);
  const result = report.cases.find(({ caseId }) => caseId === 'UC02-LOST');
  assert.equal(result.outcome, 'FAIL');
  assert.equal(result.observed.assertions[1].mismatchCount, 1);
  assert.equal(report.criteria.find(({ chunkId }) => chunkId === 'SEC-A01-02').outcome, 'FAIL');
});

test('one required exchange missing from a duplicate group stays MISSING without guessing its step', () => {
  const run = simulatedRun();
  run.zap = importSample(run.http, ({ step }) => step === 'repeat-a1');
  const report = exportSample(buildReport(model, run), 1);
  const result = report.cases.find(({ caseId }) => caseId === 'UC01-REVOKE');
  assert.equal(result.outcome, 'MISSING');
  assert.equal(result.observed.receivedByZap.filter(({ status }) => status === 204).length, 0);
  assert.equal(report.zap.receivedCount, report.zap.httpCount - 1);
  assert.deepEqual(report.zap.evidence.find(({ operation, status }) => operation === 'revokeCurrentSession' && status === 204), {
    source: 'runner', operation: 'revokeCurrentSession', method: 'DELETE', path: '/api/auth/sessions/current', status: 204,
    expectedCount: 2, receivedCount: 1,
  });
  assert.equal(report.criteria.find(({ chunkId }) => chunkId === 'SEC-A01-01').outcome, 'MISSING');
  assert.equal(report.counts.FAIL, 0);
});

test('wrong status and wrong error code are FAIL, including when ZAP receives the response', () => {
  const run = simulatedRun();
  const exchange = run.http.find(({ step }) => step === 'absent-validate');
  exchange.status = 403;
  run.zap = importSample(run.http);
  const assertions = run.caseResults.get('UC02-INVALID-TAB').assertions;
  function check(assertion, ok) {
    assertions.push({ assertion, ok });
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
  assert.throws(() => validateScope(operations, scope, plan), /phạm vi từng operation/u);
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
