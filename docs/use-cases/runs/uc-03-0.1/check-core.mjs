import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from '/app/node_modules/pg/lib/index.js';
import { hashPassword, loadOutboxKey, tokenDigest } from '/app/dist/modules/identity/credentials.js';
import { createIdentityService } from '/app/dist/modules/identity/service.js';

const db = new pg.Pool({ user: 'core_identity', password: process.env.LF_IDENTITY_DB_PASSWORD, host: 'db', database: 'campus' });
const key = loadOutboxKey(process.env.LF_IDENTITY_OUTBOX_KEY);
const base = Date.now() + 90 * 60_000;
let time = base;
const service = createIdentityService(db, key, () => new Date(time));
const tag = randomUUID();
const eligible = `clock-${tag}@example.test`;
const unknown = `unknown-${tag}@example.test`;
const rollback = `rollback-${tag}@example.test`;
const currentPassword = 'fixture-password-before-reset';
const updatedPassword = 'fixture-password-after-reset';

async function seedAccount(email, verified = true) {
  const accountId = randomUUID();
  await db.query(`INSERT INTO public.identity_accounts (account_id, email_normalized, password_hash)
    VALUES ($1, $2, $3)`, [accountId, email, await hashPassword(currentPassword)]);
  if (verified) await db.query('UPDATE public.identity_accounts SET verified_at = $2 WHERE account_id = $1', [accountId, new Date(base)]);
  return accountId;
}

async function seedToken(accountId, issuedAt) {
  const token = randomBytes(32).toString('base64url');
  await db.query(`INSERT INTO public.identity_password_reset_tokens (token_digest, account_id, issued_at, expires_at)
    VALUES ($1, $2, $3, $4)`, [tokenDigest(token), accountId, new Date(issuedAt), new Date(issuedAt + 30 * 60_000)]);
  return token;
}

function faultAfter(fragment, record = () => {}) {
  return {
    query: (...args) => db.query(...args),
    async connect() {
      const client = await db.connect();
      return {
        release: discard => client.release(discard),
        async query(sql, values) {
          const result = await client.query(sql, values);
          record(sql, values);
          if (sql.includes(fragment)) throw new Error('controlled database fault');
          return result;
        },
      };
    },
  };
}

try {
  const account = await seedAccount(eligible);
  for (const email of [eligible, unknown]) {
    for (const offset of [0, 1000, 2000, 3000]) {
      time = base + offset;
      assert.equal((await service.requestPasswordReset(email)).receipt.status, 'received');
    }
    time = base + 900_000;
    assert.deepEqual(await service.requestPasswordReset(email), { retryAfter: 1 });
    if (email === eligible) {
      assert.equal((await db.query('SELECT 1 FROM public.identity_password_reset_tokens WHERE account_id = $1',
        [account])).rowCount, 4);
    }
    time += 1000;
    assert.equal((await service.requestPasswordReset(email)).receipt.status, 'received');
    time += 900_000;
    assert.equal((await service.requestPasswordReset(email)).receipt.status, 'received');
    const row = (await db.query('SELECT first_at, resent_at FROM public.identity_password_reset_windows WHERE email_normalized = $1',
      [email])).rows[0];
    assert.equal(+row.first_at, time);
    assert.deepEqual(row.resent_at, []);
  }

  time = base;
  const [expired, boundary, valid] = await Promise.all([
    seedToken(account, base - 1_800_001), seedToken(account, base - 1_800_000), seedToken(account, base - 1_799_999),
  ]);
  assert.equal(await service.resetPassword(expired, updatedPassword), 'gone');
  assert.equal(await service.resetPassword(boundary, updatedPassword), 'gone');
  assert.equal(await service.resetPassword(valid, updatedPassword), 'reset');

  const unverifiedEmail = `unverified-${tag}@example.test`;
  const unverified = await seedAccount(unverifiedEmail, false);
  assert.equal((await service.requestPasswordReset(unverifiedEmail)).receipt.status, 'received');
  assert.equal((await db.query('SELECT 1 FROM public.identity_password_reset_tokens WHERE account_id = $1',
    [unverified])).rowCount, 0);
  assert.equal(await service.resetPassword(await seedToken(unverified, base), updatedPassword), 'invalid');

  const parallelAccount = await seedAccount(`parallel-${tag}@example.test`);
  const [parallelFirst, parallelSecond] = await Promise.all([seedToken(parallelAccount, base), seedToken(parallelAccount, base)]);
  const outcomes = await Promise.all([
    service.resetPassword(parallelFirst, updatedPassword), service.resetPassword(parallelSecond, currentPassword),
  ]);
  assert.deepEqual(outcomes.sort(), ['gone', 'reset']);

  const rollbackAccount = await seedAccount(rollback);
  let rejectedReceipt;
  let rejectedJob;
  const firstFailure = createIdentityService(faultAfter('INSERT INTO public.identity_email_receipts', (sql, values) => {
    if (sql.includes('INSERT INTO public.identity_email_receipts')) rejectedReceipt = values[0];
    if (sql.includes('INSERT INTO public.identity_password_reset_jobs')) rejectedJob = values[0];
  }), key, () => new Date(time));
  await assert.rejects(firstFailure.requestPasswordReset(rollback), /controlled database fault/);
  const windows = await db.query('SELECT 1 FROM public.identity_password_reset_windows WHERE email_normalized = $1', [rollback]);
  const tokens = await db.query('SELECT 1 FROM public.identity_password_reset_tokens WHERE account_id = $1', [rollbackAccount]);
  assert.equal(windows.rowCount, 0);
  assert.equal(tokens.rowCount, 0);
  assert.ok(rejectedReceipt && rejectedJob);
  assert.equal(await service.getReceipt(rejectedReceipt), null);
  const active = await service.createPasswordSession(rollback, currentPassword);
  assert.equal(active.status, 'created');
  const rollbackToken = await seedToken(rollbackAccount, time);
  const secondFailure = createIdentityService(faultAfter('UPDATE public.identity_sessions SET revoked_at'), key, () => new Date(time));
  await assert.rejects(secondFailure.resetPassword(rollbackToken, updatedPassword), /controlled database fault/);
  assert.equal((await service.getCurrentSession(active.session.accessToken)).status, 'current');
  assert.equal((await service.createPasswordSession(rollback, currentPassword)).status, 'created');
  assert.equal(await service.resetPassword(rollbackToken, updatedPassword), 'reset');
  assert.equal((await service.getCurrentSession(active.session.accessToken)).status, 'invalidSession');

  const workerFixture = `retry-${tag}@example.test`;
  const recoveredFixture = `recover-${tag}@example.test`;
  const revokedFixture = `revoked-${tag}@example.test`;
  await seedAccount(workerFixture);
  await seedAccount(recoveredFixture);
  const revokedAccount = await seedAccount(revokedFixture);
  const issuedAt = Date.now() + 45 * 60_000;
  time = issuedAt;
  const workerReceipt = (await service.requestPasswordReset(workerFixture)).receipt;
  time += 60_000;
  assert.equal((await service.requestPasswordReset(recoveredFixture)).receipt.status, 'received');
  time += 60_000;
  assert.equal((await service.requestPasswordReset(revokedFixture)).receipt.status, 'received');
  await db.query('UPDATE public.identity_password_reset_tokens SET revoked_at = $2 WHERE account_id = $1',
    [revokedAccount, new Date(time)]);
  console.log('Controlled PostgreSQL checks passed: sliding quota, expiry boundary, admission/reset rollback.');
  console.log(JSON.stringify({
    email: workerFixture, recoveredEmail: recoveredFixture, revokedEmail: revokedFixture,
    rejectedJob, requestId: workerReceipt.requestId, issuedAt,
  }));
} finally {
  await db.end();
}
