import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const gateway = process.env.LF_TEST_GATEWAY_URL ?? 'https://127.0.0.1:8443';
const mailbox = process.env.LF_TEST_MAILBOX_URL ?? 'http://127.0.0.1:8025';
const address = `uc01-${randomUUID()}@example.test`;
const password = 'mat-khau-uc01-demo-an-toan';

async function request(path, status, input) {
  const response = await fetch(`${gateway}/api/v1/${path}`, {
    method: input ? 'POST' : 'GET',
    headers: input ? { 'Content-Type': 'application/json' } : {},
    body: input ? JSON.stringify(input) : undefined,
    signal: AbortSignal.timeout(6000),
  });
  assert.equal(response.status, status, `Expected HTTP ${status} for ${path.split('/')[0]}`);
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

async function pollMailbox() {
  for (let attempt = 0; attempt < 30; attempt++) {
    const listed = await fetch(`${mailbox}/api/v1/messages?limit=50`, { signal: AbortSignal.timeout(4000) });
    assert.ok(listed.ok, 'Mailbox API was unavailable');
    const { messages } = await listed.json();
    const message = messages.find(entry => entry.To.some(recipient => recipient.Address === address));
    if (message) {
      const opened = await fetch(`${mailbox}/api/v1/message/${encodeURIComponent(message.ID)}`);
      assert.ok(opened.ok, 'Mailbox message could not be opened');
      const { Text: content } = await opened.json();
      const token = content.match(/#token=([a-zA-Z0-9_-]{43})(?:\s|$)/)?.[1];
      assert.ok(token, 'Verification link did not have the expected format');
      return token;
    }
    await delay(500);
  }
  throw new Error('The test mailbox did not receive a verification email');
}

const [registered, duplicate] = await Promise.all([
  request('accounts', 202, { email: address, password }),
  request('accounts', 202, { email: address.toUpperCase(), password }),
]);
assert.notEqual(await getReceipt(registered), await getReceipt(duplicate));
await request('accounts', 400, { email: address, password: 'too-short' });
const token = await pollMailbox();
await request('email-verifications', 204, { token });
assert.equal((await (await request('email-verifications', 410, { token })).json()).code, 'LINK_NO_LONGER_VALID');

for (let attempt = 0; attempt < 3; attempt++) {
  await getReceipt(await request('email-verification-requests', 202, { email: address }));
}
const limited = await request('email-verification-requests', 429, { email: address.toUpperCase() });
assert.match(limited.headers.get('retry-after') ?? '', /^\d+$/);
assert.equal((await limited.json()).code, 'VERIFICATION_RESEND_LIMIT');
console.log('UC-01 HTTPS, registration, opaque receipt, mailbox, verification, replay and quota checks passed.');
