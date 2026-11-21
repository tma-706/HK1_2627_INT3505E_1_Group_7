import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { Pool } from 'pg';
import { GoogleTokenRejected } from '../../apps/core/dist/modules/identity/google.js';
import { handleIdentity } from '../../apps/core/dist/modules/identity/routes.js';
import { Sessions } from '../../apps/core/dist/modules/identity/sessions.js';

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const keys = { current: 'fixture', keys: new Map([['fixture', randomBytes(32)]]) };
const verifier = async (idToken) => {
  if (idToken === 'fixture-rejected' || idToken === 'fixture-expired') throw new GoogleTokenRejected();
  if (idToken === 'fixture-unavailable') throw new Error('Verifier unavailable');
  return {
    sub: 'fixture-sub',
    expiresAt: new Date(Date.now() + 60_000),
    email: idToken === 'fixture-updated' ? 'new@example.test' : 'old@example.test',
    displayName: 'Tài khoản kiểm thử',
    avatarUrl: null,
  };
};
const sessionStore = new Sessions(db, verifier, keys);
const server = createServer((req, res) => handleIdentity(req, res, sessionStore));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
after(async () => { await new Promise((resolve) => server.close(resolve)); await db.end(); });

const base = `http://127.0.0.1:${server.address().port}/auth/sessions`;
const login = (body) => fetch(base, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
const newAttempt = (idToken = 'fixture-first') => ({ idToken, deviceType: 'android', attemptId: randomUUID() });
const call = (suffix, method, token) => fetch(base + suffix, {
  method,
  headers: token ? { authorization: `Bearer ${token}` } : {},
});
const validate = (token) => call('/current/validate', 'POST', token);
const revoke = (token) => call('/current', 'DELETE', token);
const expectCode = async (response, status, code) => {
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), { code });
};
const hash = (value) => createHash('sha256').update(value).digest();
const dates = async (token) => (await db.query(
  'SELECT created_at, last_activity_at FROM sessions WHERE token_hash = $1', [hash(token)],
)).rows[0];

test('validates request and verifier outcomes without writing rows', async () => {
  await expectCode(await login({}), 400, 'INVALID_REQUEST');
  await expectCode(await login(newAttempt('fixture-rejected')), 400, 'GOOGLE_TOKEN_REJECTED');
  await expectCode(await login(newAttempt('fixture-unavailable')), 503, 'AUTH_UNAVAILABLE');
  assert.equal((await db.query('SELECT count(*) AS total FROM accounts')).rows[0].total, '0');
  assert.equal((await db.query('SELECT count(*) AS total FROM sessions')).rows[0].total, '0');
});

test('commits once per attempt, deduplicates the account and keeps device sessions independent', async () => {
  const attempt = newAttempt();
  const other = { ...newAttempt(), deviceType: 'ios' };
  const responses = await Promise.all([login(attempt), login(attempt), login(other)]);
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const [first, repeated, secondDevice] = await Promise.all(responses.map((r) => r.json()));
  assert.deepEqual(repeated, first);
  assert.equal(secondDevice.accountId, first.accountId);
  assert.notEqual(secondDevice.sessionToken, first.sessionToken);
  assert.equal((await db.query('SELECT count(*) AS total FROM accounts')).rows[0].total, '1');
  assert.equal((await db.query('SELECT count(*) AS total FROM sessions')).rows[0].total, '2');

  const originalDates = await dates(first.sessionToken);
  assert.deepEqual(await (await login(attempt)).json(), first);
  assert.deepEqual(await dates(first.sessionToken), originalDates);
  await expectCode(await login({ ...attempt, deviceType: 'ios' }), 409, 'LOGIN_ATTEMPT_CONFLICT');
  await expectCode(await login({ ...attempt, idToken: 'fixture-updated' }), 409, 'LOGIN_ATTEMPT_CONFLICT');
  await expectCode(await login({ ...attempt, idToken: 'fixture-expired' }), 400, 'GOOGLE_TOKEN_REJECTED');

  const updatedLogin = await login(newAttempt('fixture-updated'));
  assert.equal(updatedLogin.status, 200);
  assert.equal((await updatedLogin.json()).accountId, first.accountId);
  assert.equal((await db.query('SELECT email FROM accounts')).rows[0].email, 'new@example.test');

  const validation = await validate(first.sessionToken);
  assert.equal(validation.status, 200);
  assert.equal(validation.headers.get('cache-control'), 'no-store');
  assert.equal((await validation.json()).accountId, first.accountId);
  assert.ok((await dates(first.sessionToken)).last_activity_at >= originalDates.last_activity_at);

  const revocations = await Promise.all([revoke(first.sessionToken), revoke(first.sessionToken)]);
  assert.deepEqual(revocations.map((response) => response.status), [204, 204]);
  assert.equal(await revocations[0].text(), '');
  const invalid = await validate(first.sessionToken);
  assert.equal(invalid.headers.get('www-authenticate'), 'Bearer');
  await expectCode(invalid, 401, 'SESSION_INVALID');
  await expectCode(await login(attempt), 409, 'LOGIN_ATTEMPT_CONFLICT');
  assert.equal((await validate(secondDevice.sessionToken)).status, 200);
  await expectCode(await revoke(), 401, 'SESSION_INVALID');
});

test('enforces rolling and absolute expiry for validate and revoke', async () => {
  for (const [created, activity] of [['40 days', '30 days'], ['90 days', '1 day']]) {
    const response = await login(newAttempt());
    assert.equal(response.status, 200);
    const { sessionToken } = await response.json();
    await db.query(`
      UPDATE sessions SET created_at = clock_timestamp() - $2::interval,
        last_activity_at = clock_timestamp() - $3::interval WHERE token_hash = $1
    `, [hash(sessionToken), created, activity]);
    await expectCode(await validate(sessionToken), 401, 'SESSION_INVALID');
    await expectCode(await revoke(sessionToken), 401, 'SESSION_INVALID');
  }
  const { sessionToken } = await (await login(newAttempt())).json();
  const timestamp = (await db.query(`
    UPDATE sessions SET created_at = clock_timestamp() - interval '89 days',
      last_activity_at = clock_timestamp() - interval '1 day' WHERE token_hash = $1
    RETURNING created_at + interval '90 days' AS cap
  `, [hash(sessionToken)])).rows[0].cap;
  assert.equal((await (await validate(sessionToken)).json()).expiresAt, timestamp.toISOString());
});
