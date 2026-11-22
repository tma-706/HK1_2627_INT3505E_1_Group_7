import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { Pool } from 'pg';
import { GoogleTokenRejected } from '../../apps/core/dist/modules/identity/google.js';
import { handleIdentity } from '../../apps/core/dist/modules/identity/routes.js';
import { Sessions } from '../../apps/core/dist/modules/identity/sessions.js';
import { handleMyArea } from '../../apps/core/dist/modules/my-area/routes.js';

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const keys = { current: 'fixture', keys: new Map([['fixture', randomBytes(32)]]) };
const verifier = async (idToken) => {
  if (idToken === 'fixture-rejected' || idToken === 'fixture-expired') throw new GoogleTokenRejected();
  if (idToken === 'fixture-unavailable') throw new Error('Verifier unavailable');
  return {
    sub: idToken.startsWith('fixture-area-') ? idToken : 'fixture-sub',
    expiresAt: new Date(Date.now() + 60_000),
    email: idToken === 'fixture-updated' ? 'new@example.test' : 'old@example.test',
    displayName: 'Tài khoản kiểm thử',
    avatarUrl: null,
  };
};
const sessionStore = new Sessions(db, verifier, keys);
const server = createServer(async (req, res) => {
  if (await handleIdentity(req, res, sessionStore)) return;
  if (await handleMyArea(req, res, sessionStore)) return;
  res.writeHead(404).end();
});
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

test('reads only the current profile and items, with account-bound stable cursors', async () => {
  const a = await (await login(newAttempt('fixture-area-a'))).json();
  const b = await (await login(newAttempt('fixture-area-b'))).json();
  const c = await (await login(newAttempt('fixture-area-c'))).json();
  await db.query(await readFile(new URL('../../db/migrations/002_my_area.sql', import.meta.url), 'utf8'));
  const area = (path, session = a) => fetch(new URL(path, base), {
    headers: session ? { authorization: 'Bearer ' + session.sessionToken } : {},
  });
  const read = async (path, session) => {
    const response = await area(path, session);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return response.json();
  };
  const stamp = '2026-11-21T00:00:00.123456Z';
  const posts = Array.from({ length: 22 }, () => randomUUID()).sort().reverse();
  await db.query(`
    INSERT INTO my_area_fixture_posts (id, tab, author_id, title, created_at, status)
    SELECT id, 'lost', $2, 'Ví', $3, 'Đang tìm' FROM unnest($1::uuid[]) AS id
  `, [posts, a.accountId, stamp]);
  for (const [postAccount, tab, url] of [
    [a, 'found', 'https://media.example.test/processed.png'], [a, 'found', null], [b, 'lost', null],
  ]) {
    await db.query('INSERT INTO my_area_fixture_posts VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [randomUUID(), tab, postAccount.accountId, 'Chìa khóa', stamp, 'Đang chờ', url]);
  }
  for (const [sender, owner] of [[a, b], [b, a], [b, c]]) {
    await db.query('INSERT INTO my_area_fixture_claims VALUES ($1,$2,$3,$4,$5,$6)',
      [randomUUID(), sender.accountId, owner.accountId, 'Bình nước', stamp, 'Đang chờ']);
  }

  await db.query('UPDATE accounts SET display_name = $2 WHERE id = $1', [a.accountId, 'Hồ sơ A']);
  const before = await dates(a.sessionToken);
  assert.deepEqual(await read('/me/profile'), {
    displayName: 'Hồ sơ A', email: 'old@example.test', avatarUrl: null,
  });
  assert.ok((await dates(a.sessionToken)).last_activity_at > before.last_activity_at);
  assert.equal((await read('/me/profile', b)).displayName, 'Tài khoản kiểm thử');
  assert.deepEqual(await read('/me/items?tab=lost', c), { tab: 'lost', items: [], nextCursor: null });
  const found = await read('/me/items?tab=found');
  assert.equal(found.items.length, 2);
  assert.deepEqual(found.items.filter((item) => 'thumbnailUrl' in item).map(({ thumbnailUrl }) => thumbnailUrl),
    ['https://media.example.test/processed.png']);
  const claims = await read('/me/items?tab=claims');
  assert.deepEqual(claims.items.map(({ role }) => role).sort(), ['received', 'sent']);
  for (const claim of claims.items) {
    assert.deepEqual(Object.keys(claim).sort(), ['id', 'role', 'sentAt', 'status', 'title']);
  }

  const path = '/me/items?tab=lost';
  const first = await read(path);
  assert.deepEqual(first.items.map(({ id }) => id), posts.slice(0, 20));
  assert.equal(typeof first.nextCursor, 'string');
  const cursorQuery = '&cursor=' + encodeURIComponent(first.nextCursor);
  await expectCode(await area(path + cursorQuery, b), 400, 'INVALID_CURSOR');
  await expectCode(await area('/me/items?tab=found' + cursorQuery), 400, 'INVALID_CURSOR');
  await expectCode(await area(path + '&cursor=unavailable'), 400, 'INVALID_CURSOR');
  await expectCode(await area('/me/items'), 400, 'INVALID_REQUEST');
  await expectCode(await area('/me/items?tab=other'), 400, 'INVALID_REQUEST');

  await db.query('DELETE FROM my_area_fixture_posts WHERE id = ANY($1::uuid[])', [posts.slice(19, 21)]);
  const newer = randomUUID();
  await db.query('INSERT INTO my_area_fixture_posts VALUES ($1,$2,$3,$4,$5,$6,NULL)',
    [newer, 'lost', a.accountId, 'Bài mới', '2026-11-22T00:00:00Z', 'Đang tìm']);
  const last = await read(path + cursorQuery);
  assert.deepEqual(last.items.map(({ id }) => id), posts.slice(21));
  assert.equal(last.nextCursor, null);
  const refreshed = await read(path);
  assert.equal(refreshed.items[0].id, newer);
  assert.equal(refreshed.items.length, 20);
  assert.deepEqual((await read(path + '&cursor=' + refreshed.nextCursor)).items.map(({ id }) => id), posts.slice(21));

  await db.query('DELETE FROM my_area_fixture_posts WHERE id = $1', [newer]);
  const exact = await read(path);
  assert.equal(exact.items.length, 20);
  assert.equal(exact.nextCursor, null);

  await db.query("UPDATE my_area_cursors SET expires_at = clock_timestamp() - interval '1 second' WHERE token_hash = $1",
    [hash(first.nextCursor)]);
  await expectCode(await area(path + cursorQuery), 400, 'INVALID_CURSOR');
  for (const target of ['/me/profile', path + cursorQuery]) {
    for (const session of [null, { sessionToken: 'unavailable' }]) {
      const denied = await area(target, session);
      assert.equal(denied.headers.get('www-authenticate'), 'Bearer');
      await expectCode(denied, 401, 'SESSION_INVALID');
    }
  }
  for (const [created, activity] of [['40 days', '30 days'], ['90 days', '1 day']]) {
    const session = await (await login(newAttempt('fixture-area-c'))).json();
    await db.query(`
      UPDATE sessions SET created_at = clock_timestamp() - $2::interval,
        last_activity_at = clock_timestamp() - $3::interval WHERE token_hash = $1
    `, [hash(session.sessionToken), created, activity]);
    const expired = await dates(session.sessionToken);
    for (const target of ['/me/profile', path]) {
      await expectCode(await area(target, session), 401, 'SESSION_INVALID');
    }
    assert.deepEqual(await dates(session.sessionToken), expired);
  }

  const [raceRead, raceRevoke] = await Promise.all([area('/me/profile'), revoke(a.sessionToken)]);
  assert.ok([200, 401].includes(raceRead.status));
  assert.equal(raceRevoke.status, 204);
  const revokedAt = await dates(a.sessionToken);
  await expectCode(await area(path + cursorQuery), 401, 'SESSION_INVALID');
  await expectCode(await area('/me/profile'), 401, 'SESSION_INVALID');
  assert.deepEqual(await dates(a.sessionToken), revokedAt);
  assert.equal((await read(path, b)).items.length, 1);
});
