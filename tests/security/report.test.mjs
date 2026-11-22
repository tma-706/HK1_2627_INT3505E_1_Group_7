import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { compareRows } from './cases.mjs';
import { expectedPages } from './fixture.mjs';
import { loadModel } from './model.mjs';
import { buildReport, writeReports } from './report.mjs';

const model = loadModel();
const marker = 'fake-secret-report-marker';
const buildSha = 'a'.repeat(40);

function simulatedRun() {
  const http = [...model.cases.values()].flatMap(({ id, http }) =>
    http.map(({ step, operation, status }) => ({ caseId: id, step, operation, status,
      method: model.operations.get(operation).method, path: model.operations.get(operation).path,
      har: { request: { headers: [{ name: 'Authorization', value: marker }] } },
    })),
  );
  return {
    buildSha, http, toolErrors: [], fixture: { started: true, cleaned: true },
    caseResults: new Map([...model.cases.keys()].map((id) =>
      [id, { outcome: 'PASS', assertions: [{ assertion: 'synthetic-proof', ok: true, raw: marker }] }],
    )),
    zap: { ok: true, passiveSelfcheck: true, received: structuredClone(http) },
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
    assert.deepEqual(Object.keys(item.cases[0].observed.http[0]).sort(), ['caseId', 'method', 'operation', 'path', 'status', 'step']);
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

test('missing required operation in ZAP export stays MISSING, with reports and nonzero result', () => {
  const run = simulatedRun();
  run.zap.received = run.zap.received.filter(({ operation }) => operation !== 'revokeCurrentSession');
  const report = exportSample(buildReport(model, run), 1);
  assert.equal(report.cases.find(({ caseId }) => caseId === 'UC01-REVOKE').outcome, 'MISSING');
  assert.equal(report.criteria.find(({ chunkId }) => chunkId === 'SEC-A01-01').outcome, 'MISSING');
  assert.equal(report.counts.FAIL, 0);
});
