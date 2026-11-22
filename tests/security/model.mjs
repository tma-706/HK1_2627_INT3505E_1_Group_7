import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const digest = (content) => createHash('sha256').update(content).digest('hex');
export const readJSON = (path) => JSON.parse(readFileSync(path, 'utf8'));
export const obligationKey = ({ chunkId, surface }) => `${chunkId}/${surface}`;
const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
const unique = (items) => items.length === new Set(items).size;

export function loadModel() {
  const manifest = readJSON('tests/security/manifest.json');
  const obligations = readJSON('tests/security/coverage.json');
  const inputs = new Map();
  assert.ok(Number.isSafeInteger(manifest.version) && Number.isSafeInteger(manifest.fixtureVersion));
  for (const [key, def] of Object.entries(manifest.inputs)) {
    const bytes = readFileSync(def.path);
    assert.equal(digest(bytes), def.sha256, `Đầu vào đã thay đổi: ${def.path}; đối chiếu trước khi cập nhật digest.`);
    assert.ok(def.version.length, `Thiếu phiên bản đầu vào: ${key}`);
    inputs.set(key, { ...def, text: bytes.toString('utf8') });
  }
  const catalog = JSON.parse(inputs.get('catalog').text);
  const openapi = JSON.parse(inputs.get('openapi').text);
  assert.equal(catalog.catalog_version, inputs.get('catalog').version);
  assert.equal(openapi.info.version, inputs.get('openapi').version);
  const chunks = new Map(catalog.requirements.map((chunk) => [chunk.sec_id, chunk]));
  assert.equal(chunks.size, catalog.requirements.length, 'ID catalog trùng');
  const operations = new Map();
  for (const [path, pathEntry] of Object.entries(openapi.paths)) {
    for (const [method, op] of Object.entries(pathEntry).filter(([method]) => httpMethods.includes(method))) {
      assert.ok(op.operationId && !operations.has(op.operationId), `operationId thiếu/trùng: ${method} ${path}`);
      operations.set(op.operationId, { method: method.toUpperCase(), path: '/api' + path, statuses: Object.keys(op.responses).map(Number) });
    }
  }
  const cases = new Map(manifest.cases.map((item) => [item.id, item]));
  const keys = new Set(obligations.map(obligationKey));
  const allScenarios = inputs.get('uc01').text + inputs.get('uc02').text;
  assert.equal(cases.size, manifest.cases.length, 'ID ca trùng');
  assert.equal(keys.size, obligations.length, 'Hàng chunk/bề mặt trùng');
  assert.equal(new Set(obligations.map(({ chunkId }) => chunkId)).size, chunks.size, 'Thiếu chunk trong ma trận');
  for (const row of obligations) {
    assert.equal(row.cwe, chunks.get(row.chunkId)?.cwe_id, `Chunk/CWE sai: ${row.chunkId}`);
    assert.ok(manifest.surfaces[row.surface] && row.reason && row.evidenceMethod, obligationKey(row));
    assert.ok(['covered', 'missing', 'not-applicable'].includes(row.applicability), obligationKey(row));
    assert.equal(row.caseIds.length > 0, row.applicability === 'covered', obligationKey(row));
    assert.ok(unique(row.caseIds) && unique(row.ucs) && unique(row.scenarios), obligationKey(row));
    for (const uc of row.ucs) assert.ok(['UC-01', 'UC-02'].includes(uc), uc);
    for (const scn of row.scenarios) {
      assert.ok(allScenarios.includes(`| ${scn} ·`), scn);
      assert.ok(row.ucs.includes(scn.startsWith('SCN-AUTH') ? 'UC-01' : 'UC-02'), scn);
    }
    for (const id of row.caseIds) assert.ok(cases.get(id)?.obligations.includes(obligationKey(row)), `Thiếu liên kết ngược: ${id}`);
  }
  const requiredOperations = new Set();
  for (const item of cases.values()) {
    assert.match(item.id, /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/u);
    for (const field of ['layer', 'preconditions', 'fixture', 'action', 'expected']) assert.ok(item[field]?.trim(), `${item.id} thiếu ${field}`);
    assert.equal(typeof item.requiredForPilot, 'boolean', item.id);
    assert.ok(item.sourceRefs.length && item.obligations.length && unique(item.obligations), item.id);
    for (const { input, locator, version } of item.sourceRefs) {
      assert.equal(version, inputs.get(input)?.version, item.id);
      assert.ok(locator && inputs.get(input).text.includes(locator), `${item.id}: ${locator}`);
    }
    for (const key of item.obligations) {
      assert.ok(obligations.find((row) => obligationKey(row) === key)?.caseIds.includes(item.id), `Thiếu liên kết ngược: ${key}`);
    }
    assert.ok(unique(item.http.map(({ step }) => step)), item.id);
    for (const { step, operation, status } of item.http) {
      assert.match(step, /^[a-z0-9-]+$/u);
      assert.ok(operations.get(operation)?.statuses.includes(status), `${item.id}: ${operation} ${status}`);
      if (item.requiredForPilot && status >= 200 && status < 300) requiredOperations.add(operation);
    }
  }
  for (const id of operations.keys()) assert.ok(requiredOperations.has(id), `Chưa có ca bắt buộc với phản hồi thành công: ${id}`);
  const suiteFiles = readdirSync('tests/security').sort().map((name) => [name, digest(readFileSync(join('tests/security', name)))]);
  return {
    manifest, cases, obligations, operations, chunks,
    revisions: { sources: manifest.inputs, suite: digest(JSON.stringify(suiteFiles)), fixture: digest(readFileSync('tests/security/fixture.json')) },
  };
}
