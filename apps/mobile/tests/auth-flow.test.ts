import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuthFlow, type AuthDependencies } from '../src/auth-flow';
import { IdentityError, type GoogleSession, type LoginAttempt } from '../src/identity-api';

const session = { accountId: 'fixture-account', expiresAt: '2030-01-01T00:00:00Z', sessionToken: 'fixture-token' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function fixture() {
  const stored = { accepted: false, token: null as string | null };
  const attempts: LoginAttempt[] = [];
  let cleanup = 0;
  let ids = 0;
  let revocations = 0;
  const deps: AuthDependencies = {
    installation: {
      load: async () => ({ ...stored }),
      prepareSave: async () => undefined,
      save: async (token, needsConsent) => {
        stored.token = token;
        if (needsConsent) stored.accepted = true;
      },
      clear: async () => { stored.token = null; },
    },
    api: {
      create: async (attempt) => { attempts.push(attempt); return session; },
      validate: async () => session,
      revoke: async () => { ++revocations; },
    },
    selectGoogle: async () => 'fixture-google-token',
    online: async () => true,
    attemptId: () => 'fixture-attempt-' + (++ids),
    deviceType: 'android',
    clearPersonalData: () => { ++cleanup; },
    mark: () => undefined,
  };
  return { deps, stored, attempts, cleanups: () => cleanup, revocations: () => revocations };
}
const turn = () => new Promise<void>((resolve) => setImmediate(resolve));

test('uses the consent screen per installation, keeps cancellations local and persists only on success', async () => {
  const f = fixture();
  const flow = new AuthFlow(f.deps);
  await flow.restore();
  f.deps.selectGoogle = async () => null;
  await flow.select();
  assert.deepEqual(flow.getState(), { screen: 'signedOut' });
  f.deps.selectGoogle = async () => 'fixture-google-token';
  await flow.select();
  assert.equal(flow.getState().screen, 'consent');
  flow.rejectTerms();
  assert.equal(f.attempts.length, 0);
  assert.equal(f.stored.accepted, false);
  await flow.select();
  await flow.acceptTerms();
  assert.equal(flow.getState().screen, 'home');
  assert.equal(f.stored.accepted, true);
  assert.equal(f.stored.token, session.sessionToken);
  flow.openProfile();
  flow.openLogout();
  flow.cancelLogout();
  const afterCancel = flow.getState();
  assert.equal(afterCancel.screen === 'home' && afterCancel.page === 'profile', true);
  assert.equal(f.revocations(), 0);
  flow.openLogout();
  flow.confirmLogout();
  await turn();
  assert.equal(f.stored.token, null);
  assert.equal(f.stored.accepted, true);
  await flow.select();
  assert.equal(flow.getState().screen, 'home');
});

test('same attempt retries on a dependency failure and a late response cannot save an older attempt', async () => {
  const f = fixture();
  const flow = new AuthFlow(f.deps);
  const originalCreate = f.deps.api.create;
  f.deps.api.create = async (attempt) => {
    f.attempts.push(attempt);
    throw new IdentityError('AUTH_UNAVAILABLE');
  };
  await flow.restore();
  await flow.select();
  await flow.acceptTerms();
  assert.equal(f.stored.accepted, false);
  f.deps.api.create = originalCreate;
  await flow.retryAttempt();
  assert.deepEqual(f.attempts[0], f.attempts[1]);
  flow.openProfile();
  flow.openLogout();
  flow.confirmLogout();
  await turn();
  const late = deferred<GoogleSession>();
  f.deps.api.create = () => late.promise;
  const first = flow.select();
  await turn();
  flow.chooseAgain();
  f.deps.api.create = async () => ({ ...session, accountId: 'fixture-b', sessionToken: 'fixture-token-b' });
  await flow.select();
  late.resolve(session);
  await first;
  assert.equal(f.stored.token, 'fixture-token-b');
});

test('cold start hides personal state on a temporary failure, then clears an invalid session', async () => {
  const f = fixture();
  f.stored.accepted = true;
  f.stored.token = session.sessionToken;
  f.deps.api.validate = async () => { throw new IdentityError('AUTH_UNAVAILABLE'); };
  const flow = new AuthFlow(f.deps);
  await flow.restore();
  assert.equal(flow.getState().screen, 'blocked');
  assert.equal(f.stored.token, session.sessionToken);
  f.deps.api.validate = async () => { throw new IdentityError('SESSION_INVALID'); };
  await flow.restore();
  await turn();
  assert.equal(flow.getState().screen, 'signedOut');
  assert.equal(f.stored.token, null);
  assert.equal(f.cleanups(), 1);
});

test('local logout finishes before unavailable Core and ignores a pending personal read', async () => {
  const f = fixture();
  f.stored.accepted = true;
  f.stored.token = session.sessionToken;
  const revoke = deferred<void>();
  const read = deferred<string>();
  f.deps.api.revoke = () => revoke.promise;
  const flow = new AuthFlow(f.deps);
  await flow.restore();
  const pending = flow.withCurrentToken(() => read.promise);
  flow.openProfile();
  flow.openLogout();
  flow.confirmLogout();
  await turn();
  assert.deepEqual(flow.getState(), { screen: 'signedOut', notice: 'Đã đăng xuất khỏi ứng dụng trên thiết bị này' });
  assert.equal(f.stored.token, null);
  read.resolve('fixture personal data');
  assert.equal(await pending, undefined);
  revoke.resolve();
  await turn();
  assert.deepEqual(flow.getState(), { screen: 'signedOut' });
});

test('keeps private UI hidden when saving and cleanup fail, then allows a cleanup retry', async () => {
  const f = fixture();
  f.deps.installation.save = async () => {
    f.stored.token = session.sessionToken;
    throw new Error('fixture store write failed');
  };
  const clear = f.deps.installation.clear;
  f.deps.installation.clear = async () => { throw new Error('fixture store delete failed'); };
  const flow = new AuthFlow(f.deps);
  await flow.restore();
  await flow.select();
  await flow.acceptTerms();
  const blocked = flow.getState();
  assert.equal(blocked.screen === 'blocked' && blocked.retry === 'clear', true);
  assert.equal(f.stored.accepted, false);
  await flow.select();
  assert.equal(flow.getState().screen, 'blocked');

  f.deps.installation.clear = clear;
  await flow.retryClear();
  const result = flow.getState();
  assert.equal(result.screen === 'signedOut' && result.notice?.startsWith('Không thể lưu phiên'), true);
  assert.equal(f.stored.token, null);
});
