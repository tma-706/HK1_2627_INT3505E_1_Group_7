import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const gateway = 'https://127.0.0.1:' + (process.env.LF_HTTPS_PORT ?? 8443);
const photo = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOQiF8KAAGvAR2v74ssAAAAAElFTkSuQmCC',
  'base64',
);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const owner = { id: randomUUID(), token: randomBytes(32).toString('base64url') };
const other = { id: randomUUID(), token: randomBytes(32).toString('base64url') };

function sql(input) {
  execFileSync('docker', ['compose', 'exec', '-T', 'db', 'psql', '-X', '-q',
    '-v', 'ON_ERROR_STOP=1', '-U', 'campus_admin', '-d', 'campus'], { input });
}

function validate(schema, body) {
  execFileSync('docker', ['compose', 'exec', '-T', 'mock', 'node', '--input-type=module', '-e', `
    import { readFileSync } from 'node:fs';
    import Ajv2020 from 'ajv/dist/2020.js';
    import addFormats from 'ajv-formats';
    const { components } = JSON.parse(readFileSync('openapi.json', 'utf8'));
    const ajv = new Ajv2020({ strictTypes: false });
    addFormats(ajv);
    ajv.addKeyword({ keyword: 'components', schemaType: 'object', valid: true });
    const validate = ajv.compile({ ...components.schemas[process.argv[1]], components });
    if (!validate(JSON.parse(readFileSync(0, 'utf8')))) throw new Error(ajv.errorsText(validate.errors));
  `, schema], { input: JSON.stringify(body) });
}

function request(url, options) {
  return fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10000) });
}

async function api(path, status, account, body, idempotencyKey) {
  const headers = {};
  if (account) headers.authorization = 'Bearer ' + account.token;
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
  if (body) headers['content-type'] = 'application/json';
  const response = await request(gateway + path, {
    method: body ? 'POST' : 'GET', headers, body: body && JSON.stringify(body),
  });
  assert.equal(response.status, status, path);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  if (status === 401) assert.equal(response.headers.get('www-authenticate'), 'Bearer');
  if (status >= 400) assert.match(response.headers.get('content-type'), /^application\/problem\+json/);
  return { body: await response.json(), location: response.headers.get('location') };
}

function post(grant, bytes, overrides = {}) {
  const fields = new FormData();
  for (const [name, value] of Object.entries({ ...grant.formFields, ...overrides })) fields.append(name, value);
  fields.append('file', new Blob([bytes], { type: 'image/png' }), 'sample.png');
  return request(grant.uploadUrl, { method: grant.method, body: fields });
}

async function storageStatus(response, status, description, code) {
  const body = await response.text();
  const errorCode = /<Code>([^<]+)<\/Code>/.exec(body)?.[1];
  assert.equal(response.status, status, description + (errorCode ? ' (' + errorCode + ')' : ''));
  if (code) assert.equal(errorCode, code, description);
}

sql(`
  INSERT INTO media_members (member_id, email_verified) VALUES ('${owner.id}', true), ('${other.id}', true);
  INSERT INTO media_sessions (token_hash, member_id, expires_at) VALUES
    ('${sha256(owner.token)}', '${owner.id}', now() + interval '15 minutes'),
    ('${sha256(other.token)}', '${other.id}', now() + interval '15 minutes');
`);

try {
  const payload = { purpose: 'avatar', contentType: 'image/png', sizeBytes: photo.length, sha256: sha256(photo) };
  const path = '/api/v1/me/uploads';
  await api(path, 401, undefined, payload, randomUUID());

  const expiring = (await api(path, 201, owner, payload, randomUUID())).body;
  const remaining = Date.parse(expiring.uploadExpiresAt) - Date.now();
  assert.ok(remaining > 0 && remaining <= 15000, 'Start Compose with LF_MEDIA_UPLOAD_SECONDS=10');
  await delay(remaining + 300);
  await storageStatus(await post(expiring, photo), 403, 'Expired POST policy', 'AccessDenied');

  const key = randomUUID();
  const [first, retry] = await Promise.all([api(path, 201, owner, payload, key), api(path, 201, owner, payload, key)]);
  const { body: grant, location } = first;
  assert.deepEqual(retry.body, grant, 'Concurrent calls must return the same grant');
  assert.equal(location, '/api/v1/uploads/' + grant.uploadId);
  assert.equal(new URL(grant.uploadUrl).protocol, 'https:');
  const altered = { ...payload, sha256: '0'.repeat(64) };

  assert.equal((await api(location, 200, owner)).body.previewUrl, null);
  await storageStatus(await post(grant, photo, { key: grant.formFields.key + '-other' }), 403, 'Different object key', 'AccessDenied');
  await storageStatus(await post(grant, photo, { 'Content-Type': 'image/jpeg' }), 403, 'Different media type', 'AccessDenied');
  const wrongSize = await post(grant, photo.subarray(0, -1));
  const wrongSizeBody = await wrongSize.text();
  assert.match(wrongSizeBody, /<Code>EntityTooSmall<\/Code>/, 'Different file size');
  assert.ok(wrongSize.status >= 400 && wrongSize.status < 500);
  const uploaded = await post(grant, photo);
  await storageStatus(uploaded, 204, 'Authorized image upload');
  const version = uploaded.headers.get('x-amz-version-id');
  assert.ok(version && version !== 'null', 'Upload must receive an object version');

  const status = (await api(location, 200, owner)).body;
  assert.equal(status.uploadId, grant.uploadId);
  assert.ok(status.previewUrl, 'Owner receives a signed read grant');
  const preview = new URL(status.previewUrl);
  assert.equal(preview.origin, new URL(grant.uploadUrl).origin);
  assert.equal(preview.searchParams.get('versionId'), version);
  const expires = Number(preview.searchParams.get('X-Amz-Expires'));
  assert.ok(expires > 0 && expires <= 60);

  // A replay can create another version, but a previously signed read still resolves to the original.
  const differentBytes = Buffer.from(photo);
  differentBytes[differentBytes.length - 1] ^= 1;
  await storageStatus(await post(grant, differentBytes), 204, 'Replay writes a new version');
  assert.equal((await api(location, 200, owner)).body.previewUrl, null, 'Checksum mismatch cannot receive a read grant');
  const readable = await request(preview);
  assert.equal(readable.status, 200, 'Owner can redeem the signed read');
  assert.equal(readable.headers.get('content-type'), 'image/png');
  assert.equal(readable.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await readable.arrayBuffer()), photo);

  await api(path, 409, owner, altered, key);
  await api(location, 404, other);
  await api(location, 401);
  await storageStatus(await request(preview.origin + preview.pathname), 403, 'Anonymous object read', 'AccessDenied');
  sql(`UPDATE media_members SET locked = true WHERE member_id = '${owner.id}';`);
  await api(location, 403, owner);
  validate('UploadGrant', grant);
  validate('UploadStatus', status);
  console.log('Private media verified: POST expiry and scope, immutable preview, ownership, and anonymous denial');
} finally {
  sql(`
    DELETE FROM media_uploads WHERE owner_id IN ('${owner.id}', '${other.id}');
    DELETE FROM media_sessions WHERE member_id IN ('${owner.id}', '${other.id}');
    DELETE FROM media_members WHERE member_id IN ('${owner.id}', '${other.id}');
  `);
}
