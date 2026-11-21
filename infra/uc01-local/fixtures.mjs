import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { exportJWK, generateKeyPair, importJWK, SignJWT } from 'jose';

const [action, directory] = process.argv.slice(2);
const audience = 'uc01-local-fixture';
const issuer = 'https://accounts.google.com';
const kid = 'uc01-local-key';

if (action === 'init') {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const publicJwk = { ...await exportJWK(publicKey), kid, alg: 'RS256' };
  const privateJwk = await exportJWK(privateKey);
  const secret = randomBytes(32).toString('base64url');
  const seed = `GOOGLE_CLIENT_ID=${audience}
SESSION_REPLAY_KEY_VERSION=local
SESSION_REPLAY_KEYS='{"local":"${secret}"}'
`;
  const preload = `
const fetchNetwork = globalThis.fetch;
globalThis.fetch = (input, init) => {
  if (String(input) === 'https://www.googleapis.com/oauth2/v3/certs') {
    return Promise.resolve(Response.json(${JSON.stringify({ keys: [publicJwk] })}));
  }
  return fetchNetwork(input, init);
};
`;
  await writeFile(`${directory}/fixture-key.json`, JSON.stringify(privateJwk), { mode: 0o600 });
  await writeFile(`${directory}/google-jwks.mjs`, preload, { mode: 0o644 });
  await writeFile(`${directory}/compose.env`, seed, { mode: 0o600 });
} else if (action === 'check') {
  const base = process.argv[4];
  assert.match(base, /^https:\/\/127\.0\.0\.1:\d+$/u);
  const privateJwk = JSON.parse(await readFile(`${directory}/fixture-key.json`, 'utf8'));
  const key = await importJWK(privateJwk, 'RS256');
  const subject = `local-${randomUUID()}`;
  const idToken = await new SignJWT({ email: 'uc01@example.test', name: 'Người dùng kiểm thử' })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuer(issuer).setAudience(audience).setSubject(subject)
    .setExpirationTime('5m').sign(key);

  async function request(path, method = 'GET', options = {}) {
    const { body, token } = options;
    return fetch(base + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  }

  assert.equal((await request('/api/health/ready')).status, 200);
  assert.equal((await request('/test-terms')).status, 200);
  assert.equal((await request('/test-privacy')).status, 200);

  const create = (deviceType, attemptId) => request('/api/auth/sessions', 'POST', {
    body: { idToken, deviceType, attemptId },
  });
  const attempt = randomUUID();
  const firstRes = await create('android', attempt);
  assert.equal(firstRes.status, 200);
  assert.equal(firstRes.headers.get('cache-control'), 'no-store');
  const first = await firstRes.json();

  const retry = await create('android', attempt);
  assert.equal(retry.status, 200);
  const repeated = await retry.json();
  assert.equal(repeated.accountId, first.accountId);
  assert.equal(repeated.expiresAt, first.expiresAt);
  assert.ok(repeated.sessionToken === first.sessionToken, 'Lượt lặp phải nhận cùng mã phiên');
  const secondRes = await create('ios', randomUUID());
  assert.equal(secondRes.status, 200);
  const second = await secondRes.json();
  assert.equal(second.accountId, first.accountId);
  assert.ok(second.sessionToken !== first.sessionToken, 'Phiên hai thiết bị phải độc lập');

  const validate = (session) => request('/api/auth/sessions/current/validate', 'POST', { token: session.sessionToken });
  const revoke = (session) => request('/api/auth/sessions/current', 'DELETE', { token: session.sessionToken });
  const validation = await validate(first);
  assert.equal(validation.status, 200);
  assert.equal(validation.headers.get('cache-control'), 'no-store');
  for (let trial = 0; trial < 2; trial++) {
    const revoked = await revoke(first);
    assert.equal(revoked.status, 204);
    assert.equal(await revoked.text(), '');
  }
  const denied = await validate(first);
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get('www-authenticate'), 'Bearer');
  assert.equal((await validate(second)).status, 200);
  assert.equal((await revoke(second)).status, 204);
  console.log('HTTPS fixture đạt: readiness, hai liên kết, cấp/lặp, xác minh, thu hồi lặp và cách ly hai phiên.');
} else {
  throw new Error('Expected init or check');
}
