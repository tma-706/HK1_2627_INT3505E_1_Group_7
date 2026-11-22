import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { GoogleTokenRejected, verifyGoogleToken } from '../../apps/core/dist/modules/identity/google.js';

const { privateKey, publicKey } = await generateKeyPair('RS256');
const publicJwk = await exportJWK(publicKey);
const audience = 'lost-found-fixture';
const verify = verifyGoogleToken(audience, createLocalJWKSet({ keys: [{ ...publicJwk, kid: 'fixture' }] }));

function token(options = {}) {
  return new SignJWT({ name: 'Nguyễn Minh Anh', email: 'anh@example.test' })
    .setProtectedHeader({ alg: 'RS256', kid: 'fixture' })
    .setSubject('google-fixture')
    .setIssuer(options.issuer ?? 'https://accounts.google.com')
    .setAudience(options.audience ?? audience)
    .setExpirationTime(options.expiration ?? '2m')
    .sign(options.key ?? privateKey);
}

test('returns only the verified identity and supported profile fields', async () => {
  const identity = await verify(await token());
  assert.equal(identity.sub, 'google-fixture');
  assert.equal(identity.displayName, 'Nguyễn Minh Anh');
  assert.equal(identity.email, 'anh@example.test');
  assert.ok(identity.expiresAt > new Date());
  assert.equal(identity.avatarUrl, null);
});

test('rejects fixture credentials outside the signature, issuer, audience and expiry contract', async () => {
  const different = await generateKeyPair('RS256');
  for (const options of [
    { key: different.privateKey },
    { issuer: 'https://issuer.example.test' },
    { audience: 'another-test-app' },
    { expiration: '1s ago' },
  ]) {
    await assert.rejects(verify(await token(options)), GoogleTokenRejected);
  }
});
