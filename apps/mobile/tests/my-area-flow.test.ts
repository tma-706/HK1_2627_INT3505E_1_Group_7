import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuthFlow } from '../src/auth-flow';
import { IdentityError } from '../src/identity-api';
import type { MyAreaApi, Page, Post } from '../src/my-area-api';
import { MyAreaFlow } from '../src/my-area-flow';

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
const post = (id: string): Post => ({ id, title: id, status: 'Đang tìm', postedAt: '2026-11-21T00:00:00Z' });
const page = (id: string, nextCursor: string | null = null, tab: Page['tab'] = 'lost'): Page => ({
  tab, nextCursor, items: [post(id)],
});

async function setup(items: MyAreaApi['items'], profile: MyAreaApi['profile'] = async () => ({
  displayName: 'Nguyễn Minh Anh', email: 'a@example.test', avatarUrl: null,
})) {
  let stored = 'fixture-a';
  const auth = new AuthFlow({
    api: {
      async create() { throw new Error('Use the restored fixture session'); },
      async validate() { return { accountId: 'fixture', expiresAt: '2099-01-01T00:00:00Z' }; },
      async revoke() {},
    },
    installation: {
      async load() { return { accepted: true, token: stored || null }; },
      async prepareSave() {},
      async save() {},
      async clear() { stored = ''; },
    },
    async online() { return true; },
    async selectGoogle() { return null; },
    attemptId: () => 'fixture',
    deviceType: 'android',
    clearPersonalData: () => flow.clear(),
    mark() {},
  });
  const flow = new MyAreaFlow(auth, {
    items,
    profile,
  }, async () => true);
  await auth.restore();
  auth.openProfile();
  void flow.openProfile();
  return { auth, flow, stored: () => stored };
}

test('refresh supersedes an in-flight next page and tab changes discard stale errors', async () => {
  const requests: { tab: Page['tab']; cursor: string | null; signal: AbortSignal;
    resolve: (value: Page) => void; reject: (error: Error) => void }[] = [];
  const { flow } = await setup((_token, tab, cursor, signal) => new Promise((resolve, reject) => {
    requests.push({ tab, cursor, signal, resolve, reject });
  }));
  assert.equal(requests[0].tab, 'lost');
  requests[0].resolve(page('original', 'next-token'));
  await settle();
  flow.next();
  flow.next();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].cursor, 'next-token');
  flow.refresh();
  assert.equal(requests[1].signal.aborted, true);
  assert.equal(requests[2].cursor, null);
  requests[2].resolve(page('refreshed'));
  requests[1].resolve(page('stale'));
  await settle();
  assert.deepEqual(flow.getState().list?.items.map(({ id }) => id), ['refreshed']);
  flow.refresh();
  flow.selectTab('found');
  requests[4].resolve(page('found', null, 'found'));
  requests[3].reject(new IdentityError('READ_UNAVAILABLE'));
  await settle();
  assert.equal(flow.getState().list?.tab, 'found');
  assert.equal(flow.getState().list?.error, undefined);
  flow.openPost(post('found'));
  assert.equal(flow.getState().detail?.post.id, 'found');
  assert.equal(flow.getState().detail?.tab, 'found');
});

test('invalid cursor restarts at page one, retains content on failure and retries the restart', async () => {
  const cursors: (string | null)[] = [];
  const { flow } = await setup(async (_token, _tab, cursor) => {
    cursors.push(cursor);
    if (cursor) throw new IdentityError('INVALID_CURSOR');
    if (cursors.length === 3) throw new IdentityError('READ_UNAVAILABLE');
    return cursors.length === 1 ? page('original', 'next') : page('replacement');
  });
  await settle();
  flow.next();
  await settle();
  assert.deepEqual(cursors, [null, 'next', null]);
  assert.equal(flow.getState().list?.error?.retry, 'refresh');
  assert.equal(flow.getState().list?.items[0].id, 'original');
  flow.retry();
  await settle();
  assert.deepEqual(cursors, [null, 'next', null, null]);
  assert.equal(flow.getState().list?.items[0].id, 'replacement');
  assert.equal(flow.getState().list?.nextCursor, null);
});

test('current session invalidation clears the profile, list and stored session', async () => {
  const { auth, flow, stored } = await setup(async () => { throw new IdentityError('SESSION_INVALID'); });
  await settle();
  assert.deepEqual(flow.getState(), { screen: 'home' });
  assert.equal(auth.getState().screen, 'signedOut');
  assert.equal(stored(), '');
});

test('logout discards the invalid-session result of a pending old read', async () => {
  let complete!: (error: Error) => void;
  const { auth, flow } = await setup(async () => new Promise((_resolve, reject) => { complete = reject; }));
  auth.openLogout();
  auth.confirmLogout();
  complete(new IdentityError('SESSION_INVALID'));
  await settle();
  assert.equal(auth.getState().screen, 'signedOut');
  assert.deepEqual(flow.getState(), { screen: 'home' });
});

test('one profile entry loads its list before the profile finishes and retries only the failed region', async () => {
  let failProfile!: (error: Error) => void;
  let profileCalls = 0;
  let listCalls = 0;
  const { flow } = await setup(async () => {
    ++listCalls;
    return page('first');
  }, async () => {
    if (++profileCalls === 1) return new Promise((_resolve, reject) => { failProfile = reject; });
    return { displayName: 'Hồ sơ mẫu', email: 'test@example.test', avatarUrl: null };
  });
  await settle();
  assert.equal(flow.getState().profileLoading, true);
  assert.equal(flow.getState().list?.items[0].id, 'first');
  failProfile(new IdentityError('READ_UNAVAILABLE'));
  await settle();
  flow.retryProfile();
  await settle();
  assert.equal(flow.getState().profile?.displayName, 'Hồ sơ mẫu');
  assert.equal(listCalls, 1);
});

test('an already received 401 on a previous tab ends the current session', async () => {
  let rejectOld!: (error: Error) => void;
  const { auth, flow } = await setup(async (_token, tab) => {
    if (tab === 'lost') return new Promise((_resolve, reject) => { rejectOld = reject; });
    return page('found', null, 'found');
  });
  flow.selectTab('found');
  await settle();
  rejectOld(new IdentityError('SESSION_INVALID'));
  await settle();
  assert.equal(auth.getState().screen, 'signedOut');
  assert.deepEqual(flow.getState(), { screen: 'home' });
});
