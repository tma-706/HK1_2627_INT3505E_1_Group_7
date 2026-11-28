import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import pg from '/app/node_modules/pg/lib/index.js';
import { hashPassword, loadOutboxKey, tokenDigest } from '/app/dist/modules/identity/credentials.js';
import { createIdentityService } from '/app/dist/modules/identity/service.js';

const db = new pg.Pool({ user: 'core_identity', password: process.env.LF_IDENTITY_DB_PASSWORD, host: 'db', database: 'campus' });
const key = loadOutboxKey(process.env.LF_IDENTITY_OUTBOX_KEY);
const identity = createIdentityService(db, key);
const id = randomUUID();
const email = `session-race-${id}@example.test`;
const oldPassword = 'session-race-original-fixture';
const newPassword = 'session-race-updated-fixture';
const token = randomBytes(32).toString('base64url');
const snapshotRead = Promise.withResolvers();
const continueLogin = Promise.withResolvers();

try {
  await db.query(`INSERT INTO public.identity_accounts (account_id, email_normalized, password_hash)
    VALUES ($1, $2, $3)`, [id, email, await hashPassword(oldPassword)]);
  await db.query('UPDATE public.identity_accounts SET verified_at = now() WHERE account_id = $1', [id]);
  await db.query(`INSERT INTO public.identity_password_reset_tokens (token_digest, account_id, issued_at, expires_at)
    VALUES ($1, $2, now(), now() + interval '30 minutes')`, [tokenDigest(token), id]);
  const session = await identity.createPasswordSession(email, oldPassword);
  assert.equal(session.status, 'created');

  const paused = createIdentityService({
    connect: () => db.connect(),
    async query(...args) {
      const result = await db.query(...args);
      snapshotRead.resolve();
      await continueLogin.promise;
      return result;
    },
  }, key);
  const login = paused.createPasswordSession(email, oldPassword);
  login.catch(snapshotRead.reject);
  await snapshotRead.promise;
  try {
    const [reset, revoke] = await Promise.all([
      identity.resetPassword(token, newPassword),
      identity.revokeCurrentSession(session.session.accessToken),
    ]);
    assert.equal(reset, 'reset');
    assert.equal(revoke.status, 'revoked');
  } finally {
    continueLogin.resolve();
  }
  assert.equal((await login).status, 'invalidCredentials');
  assert.equal((await identity.getCurrentSession(session.session.accessToken)).status, 'invalidSession');
  assert.equal((await identity.createPasswordSession(email, newPassword)).status, 'created');
  console.log('Deterministic stale-hash login and concurrent session revocation/reset passed.');
} finally {
  await db.end();
}
