import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const gateway = process.env.LF_TEST_GATEWAY_URL ?? 'https://127.0.0.1:8443';
const mailbox = process.env.LF_TEST_MAILBOX_URL ?? 'http://127.0.0.1:8025';
const address = `uc01-${randomUUID()}@example.test`;
const password = 'mat-khau-uc01-demo-an-toan';

async function request(path, status, input, { method = input ? 'POST' : 'GET', accessToken } = {}) {
  const headers = input ? { 'Content-Type': 'application/json' } : {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${gateway}/api/v1/${path}`, {
    method,
    headers,
    body: input ? JSON.stringify(input) : undefined,
    signal: AbortSignal.timeout(6000),
  });
  assert.ok([status].flat().includes(response.status), `Expected HTTP ${status} for ${path.split('/')[0]}, got ${response.status}`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response;
}

async function getReceipt(response) {
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ['receivedAt', 'requestId', 'status']);
  assert.equal(body.status, 'received');
  const path = `email-request-status/${body.requestId}`;
  assert.equal(response.headers.get('location'), `/api/v1/${path}`);
  assert.deepEqual(await (await request(path, 200)).json(), body);
  return body.requestId;
}

async function pollMailbox(email = address, reset = false, seen = new Set()) {
  const subject = reset ? 'Đặt lại mật khẩu Campus Lost & Found' : 'Xác thực email Campus Lost & Found';
  for (let attempt = 0; attempt < 30; attempt++) {
    const listed = await fetch(`${mailbox}/api/v1/messages?limit=50`, { signal: AbortSignal.timeout(4000) });
    assert.ok(listed.ok, 'Mailbox API was unavailable');
    const { messages } = await listed.json();
    const message = messages.find(entry => entry.Subject === subject && !seen.has(entry.ID)
      && entry.To.some(recipient => recipient.Address === email));
    if (message) {
      const opened = await fetch(`${mailbox}/api/v1/message/${encodeURIComponent(message.ID)}`);
      assert.ok(opened.ok, 'Mailbox message could not be opened');
      const { Text: content } = await opened.json();
      const token = content.match(/#token=([a-zA-Z0-9_-]{43})(?:\s|$)/)?.[1];
      assert.ok(token, 'Identity link did not have the expected format');
      if (reset) {
        assert.ok(content.includes('30 phút'), 'Reset email did not state the token lifetime');
        assert.ok(content.includes(`${process.env.LF_TEST_PASSWORD_RESET_LINK_URL ?? 'campus-lost-found://reset-password'}#token=`),
          'Reset email did not use the configured destination');
      }
      seen.add(message.ID);
      return token;
    }
    await delay(500);
  }
  throw new Error('The test mailbox did not receive an Identity email');
}

const [registered, duplicate] = await Promise.all([
  request('accounts', 202, { email: address, password }),
  request('accounts', 202, { email: address.toUpperCase(), password }),
]);
assert.notEqual(await getReceipt(registered), await getReceipt(duplicate));
await request('accounts', 400, { email: address, password: 'too-short' });
const credentials = { email: address, password };
const deniedBeforeVerification = await request('auth/sessions', 403, credentials);
assert.equal((await deniedBeforeVerification.json()).code, 'FORBIDDEN');
const token = await pollMailbox();
await request('email-verifications', 204, { token });
assert.equal((await (await request('email-verifications', 410, { token })).json()).code, 'LINK_NO_LONGER_VALID');

const missingSession = await request('auth/sessions/current', 401);
assert.equal(missingSession.headers.get('www-authenticate'), 'Bearer');
const issuedAt = Date.now();
const [session, secondSession] = await Promise.all([
  request('auth/sessions', 200, { ...credentials, email: address.toUpperCase() }).then(result => result.json()),
  request('auth/sessions', 200, credentials).then(result => result.json()),
]);
assert.equal(session.role, 'member');
assert.equal(session.tokenType, 'Bearer');
assert.notEqual(session.accessToken, secondSession.accessToken);
assert.equal(session.accountId, secondSession.accountId);
const lifetime = Date.parse(session.expiresAt) - issuedAt;
assert.ok(lifetime >= 8 * 60 * 60_000 - 1000 && lifetime <= 8 * 60 * 60_000 + 6000);
const bearer = { accessToken: session.accessToken };
const current = await request('auth/sessions/current', 200, undefined, bearer);
assert.deepEqual(await current.json(), { accountId: session.accountId, role: session.role, expiresAt: session.expiresAt });
await request('auth/sessions/current', 204, undefined, { ...bearer, method: 'DELETE' });
await request('auth/sessions/current', 204, undefined, { ...bearer, method: 'DELETE' });
assert.equal((await (await request('auth/sessions/current', 401, undefined, bearer)).json()).code, 'SESSION_INVALID');
const survivingSession = { accessToken: secondSession.accessToken };
await request('auth/sessions/current', 200, undefined, survivingSession);

const badPassword = { ...credentials, password: 'sai' };
const [wrong, unknown] = await Promise.all([
  request('auth/sessions', 401, badPassword),
  request('auth/sessions', 401, { ...badPassword, email: `unknown-${randomUUID()}@example.test` }),
]);
assert.deepEqual(await wrong.json(), await unknown.json());
await request('auth/sessions', 200, credentials);
await request('auth/sessions', 400, { ...credentials, password: '' });
const parallelLogins = await Promise.all(Array.from({ length: 5 }, (_, index) => fetch(`${gateway}/api/v1/auth/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...badPassword, email: index % 2 ? address.toUpperCase() : address }),
  signal: AbortSignal.timeout(7000),
})));
assert.deepEqual(parallelLogins.map(response => response.status).sort(), [401, 401, 401, 401, 429]);
const loginLock = parallelLogins.find(response => response.status === 429);
assert.equal(loginLock.headers.get('retry-after'), '900');
assert.equal((await loginLock.json()).code, 'LOGIN_TEMPORARILY_LOCKED');
const stillLocked = await request('auth/sessions', 429, credentials);
assert.ok(Number(stillLocked.headers.get('retry-after')) <= 900);
await request('auth/sessions/current', 200, undefined, survivingSession);

const { items: posts } = await (await request('posts', 200)).json();
for (const post of posts) {
  const detail = await request(`posts/${encodeURIComponent(post.postId)}`, 200, undefined, survivingSession);
  assert.deepEqual(await detail.json(), post);
}
await request(`posts/uc02-missing-${randomUUID()}`, 404);

for (let attempt = 0; attempt < 3; attempt++) {
  await getReceipt(await request('email-verification-requests', 202, { email: address }));
}
const limited = await request('email-verification-requests', 429, { email: address.toUpperCase() });
assert.match(limited.headers.get('retry-after') ?? '', /^\d+$/);
assert.equal((await limited.json()).code, 'VERIFICATION_RESEND_LIMIT');
console.log('UC01 and UC02 Gateway checks passed: registration, verification, sessions, lockout and public detail.');

const resetEmail = `uc03-${randomUUID()}@example.test`;
const unknownEmail = `uc03-unknown-${randomUUID()}@example.test`;
const resetCredentials = { email: resetEmail, password };
const newPassword = 'mat-khau-moi-uc03-demo-an-toan';
const nextPassword = 'mat-khau-khac-uc03-demo-an-toan';
await getReceipt(await request('accounts', 202, resetCredentials));
const verification = await pollMailbox(resetEmail);
await request('email-verifications', 204, { token: verification });
const [oldSession, spareSession] = await Promise.all([
  request('auth/sessions', 200, resetCredentials).then(response => response.json()),
  request('auth/sessions', 200, resetCredentials).then(response => response.json()),
]);

await request('password-reset-requests', 400, { email: 'invalid' });
const sentAt = performance.now();
const acceptedReset = await request('password-reset-requests', 202, { email: resetEmail });
const acceptedMs = Math.round(performance.now() - sentAt);
const resetReceipt = await getReceipt(acceptedReset);
await getReceipt(await request('password-reset-requests', 202, { email: unknownEmail }));
const seen = new Set();
const firstResetToken = await pollMailbox(resetEmail, true, seen);
const deliveredMs = Math.round(performance.now() - sentAt);
await request('password-resets', 400, { token: resetReceipt, newPassword });
await request('password-resets', 400, { token: verification, newPassword });
await request('password-resets', 400, { token: firstResetToken, newPassword: 'too short' });
await request('auth/sessions/current', 200, undefined, { accessToken: oldSession.accessToken });

for (const email of [resetEmail, unknownEmail]) {
  const resends = await Promise.all(Array.from({ length: 4 }, (_, index) =>
    request('password-reset-requests', [202, 429], { email: index % 2 ? email.toUpperCase() : email })));
  assert.deepEqual(resends.map(reply => reply.status).sort(), [202, 202, 202, 429]);
  for (const reply of resends) {
    if (reply.status === 202) await getReceipt(reply);
    else {
      const seconds = Number(reply.headers.get('retry-after'));
      assert.ok(Number.isInteger(seconds) && seconds >= 1 && seconds <= 900);
      assert.equal((await reply.json()).code, 'PASSWORD_RESET_RESEND_LIMIT');
    }
  }
}

const otherResetToken = await pollMailbox(resetEmail, true, seen);
const [first, second, racingLogin] = await Promise.all([
  request('password-resets', [204, 410], { token: firstResetToken, newPassword }),
  request('password-resets', [204, 410], { token: firstResetToken, newPassword: nextPassword }),
  request('auth/sessions', [200, 401], resetCredentials),
  request('auth/sessions/current', [200, 401], undefined, { accessToken: oldSession.accessToken }),
]);
assert.deepEqual([first.status, second.status].sort(), [204, 410]);
assert.equal(await (first.status === 204 ? first : second).text(), '');
await request('password-resets', 410, { token: otherResetToken, newPassword });
await request('password-resets', 410, { token: firstResetToken, newPassword });
await request('auth/sessions/current', 401, undefined, { accessToken: oldSession.accessToken });
await request('auth/sessions/current', 401, undefined, { accessToken: spareSession.accessToken });
if (racingLogin.status === 200) {
  const { accessToken } = await racingLogin.json();
  await request('auth/sessions/current', 401, undefined, { accessToken });
}
await request('auth/sessions', 401, resetCredentials);
await request('auth/sessions', 200, { email: resetEmail, password: first.status === 204 ? newPassword : nextPassword });

await getReceipt(await request('password-reset-requests', 202, { email: address }));
const lockedReset = await pollMailbox(address, true);
await request('password-resets', 204, { token: lockedReset, newPassword });
await request('auth/sessions', 429, { email: address, password: newPassword });
await request('auth/sessions/current', 401, undefined, survivingSession);

const listed = await fetch(`${mailbox}/api/v1/messages?limit=100`, { signal: AbortSignal.timeout(4000) });
assert.ok(listed.ok);
const { messages } = await listed.json();
assert.ok(!messages.some(message => message.To.some(recipient => recipient.Address === unknownEmail)));

console.log(`UC03 Gateway checks passed: receipt, Mailpit, quota, reset, token purpose, concurrency and sessions. Sample 202=${acceptedMs} ms, mail observed=${deliveredMs} ms.`);
