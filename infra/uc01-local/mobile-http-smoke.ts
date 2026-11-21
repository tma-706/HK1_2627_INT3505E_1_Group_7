import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import { importJWK, SignJWT } from 'jose';
import { AuthFlow, type AuthDependencies } from '../../apps/mobile/src/auth-flow';
import { identityApi } from '../../apps/mobile/src/identity-api';

async function main() {
  const [directory, base] = process.argv.slice(2);
  assert.match(base, /^https:\/\/127\.0\.0\.1:\d+$/u);
  const privateJwk = JSON.parse(await readFile(`${directory}/fixture-key.json`, 'utf8'));
  const key = await importJWK(privateJwk, 'RS256');
  const idToken = await new SignJWT({email: 'mobile-flow@example.test', name: 'Người dùng kiểm thử'})
    .setProtectedHeader({alg: 'RS256', kid: 'uc01-local-key'}).setAudience('uc01-local-fixture')
    .setIssuer('https://accounts.google.com').setSubject(`mobile-${randomUUID()}`).setExpirationTime('5m').sign(key);
  const api = identityApi(`${base}/api`);
  const store = { accepted: false, token: null as string | null };
  let calls = 0;
  let revocation: Promise<void> | undefined;
  const dependencies: AuthDependencies = {
    installation: {
      load: async () => ({ ...store }),
      prepareSave: async () => undefined,
      save: async (token, needsConsent) => {
        store.token = token;
        if (needsConsent) store.accepted = true;
      },
      clear: async () => { store.token = null; },
    },
    api: {
      create: async (attempt) => { ++calls; return api.create(attempt); },
      validate: api.validate,
      revoke: (token) => (revocation = api.revoke(token)),
    },
    online: async () => true,
    selectGoogle: async () => idToken,
    attemptId: randomUUID,
    deviceType: 'ios',
    clearPersonalData: () => undefined,
    mark: () => undefined,
  };

  const flow = new AuthFlow(dependencies);
  await flow.restore();
  await flow.select();
  assert.equal(flow.getState().screen, 'consent');
  flow.rejectTerms();
  assert.equal(calls, 0);
  await flow.select();
  await flow.acceptTerms();
  assert.equal(flow.getState().screen, 'home');
  assert.equal(store.accepted, true);
  assert.ok(store.token);
  const token = store.token;

  const restored = new AuthFlow(dependencies);
  await restored.restore();
  assert.equal(restored.getState().screen, 'home');
  restored.openLogout();
  restored.cancelLogout();
  assert.equal(revocation, undefined);
  restored.openLogout();
  restored.confirmLogout();
  await revocation;
  await setImmediate();
  assert.ok(!store.token);
  assert.equal(restored.getState().screen, 'signedOut');
  await assert.rejects(api.validate(token), { code: 'SESSION_INVALID' });
  console.log('Mobile AuthFlow + identity client + HTTPS Core passed: cancel terms, issue, restore, cancel logout, revoke.');
}
void main().catch((error) => { console.error(error.message); process.exitCode=1; });
