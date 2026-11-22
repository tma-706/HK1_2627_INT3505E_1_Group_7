import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { ageSession, expectedPages, fixture, fixtureIdentity, seedItems } from './fixture.mjs';
import { runWebE2E, WebEvidenceMissing } from './web.mjs';

export class AssertionFailure extends Error {
  constructor(assertion) {
    super(assertion);
  }
}

function profile(actor) {
  const { displayName, email, avatarUrl } = fixture.actors[actor];
  return { displayName, email, avatarUrl };
}

function sessionShape(body, withToken) {
  return typeof body?.accountId === 'string' && body.accountId.length > 0 &&
    typeof body.expiresAt === 'string' && Date.parse(body.expiresAt) > Date.now() &&
    (!withToken || (typeof body.sessionToken === 'string' && body.sessionToken.length > 0));
}

export function compareRows(actual, expected) {
  const rows = Array.isArray(actual) ? actual : [];
  const mismatched = expected.filter((value, index) => !isDeepStrictEqual(rows[index], value)).length;
  return {
    ok: Array.isArray(actual) && rows.length === expected.length && mismatched === 0,
    expectedCount: expected.length,
    observedCount: rows.length,
    mismatchCount: mismatched + Math.max(0, rows.length - expected.length),
  };
}

function verifyPage(check, body, tab, expected, continued, step) {
  check(step + '-envelope', isDeepStrictEqual(Object.keys(body ?? {}).sort(), ['items', 'nextCursor', 'tab']) && body.tab === tab);
  const { ok, ...counts } = compareRows(body.items, expected);
  check(step + '-records', ok, counts);
  check(step + '-cursor', continued ? typeof body.nextCursor === 'string' && body.nextCursor.length > 0 : body.nextCursor === null);
  return body.nextCursor;
}

function apiFor(definition, client, check) {
  return async (step, options) => {
    const expected = definition.http.find((entry) => entry.step === step);
    const response = await client.send(definition.id, expected, options);
    check(step + '-http-status', response.status === expected.status);
    return {
      ...response,
      json() {
        try { return JSON.parse(response.body); }
        catch { check(step + '-json', false); }
      },
    };
  };
}

export function verifyError(check, step, response, code) {
  check(step + '-json-header', /^application\/json(?:;|$)/iu.test(response.headers['content-type'] ?? ''));
  if (code === 'SESSION_INVALID') check(step + '-bearer', response.headers['www-authenticate'] === 'Bearer');
  check(step + '-error', isDeepStrictEqual(response.json(), { code }));
}

async function verifyRejectedSession(api, check, prefix, token) {
  for (const name of ['validate', 'profile', 'items', 'revoke']) {
    const step = `${prefix}-${name}`;
    const response = await api(step, { token, ...(name === 'items' && { query: { tab: 'lost' } }) });
    verifyError(check, step, response, 'SESSION_INVALID');
  }
}

async function verifyItems(tab, { api, check, state }) {
  for (const actor of ['a', 'b', 'd']) {
    const pages = expectedPages(tab, actor, state.webTag);
    let cursor;
    for (const [index, expected] of pages.entries()) {
      const step = actor === 'd' ? 'd-empty-page' : `${actor}-page-${index + 1}`;
      const query = { tab, ...(cursor && { cursor }) };
      const response = await api(step, { token: state[actor].sessionToken, query });
      cursor = verifyPage(check, response.json(), tab, expected, index + 1 < pages.length, step);
    }
  }
}

export const handlers = {
  'EDGE-FIXTURE-TLS': async ({ api, check }) => {
    const nginx = readFileSync('infra/uc01-local/nginx.conf', 'utf8');
    const overlay = readFileSync('infra/uc01-local/compose.yaml', 'utf8');
    check('listener-config', /^\s*listen\s+443 ssl;$/mu.test(nginx) && /^\s*ssl_protocols\s+TLSv1\.2 TLSv1\.3;$/mu.test(nginx));
    check('loopback-config', /^\s*ports: \["127\.0\.0\.1:.*:443"\]$/mu.test(overlay) && /^  gateway:\n    ports: !reset \[\]/mu.test(overlay));
    const response = await api('gateway-ready');
    check('ready-json', isDeepStrictEqual(response.json(), { status: 'ok', database: 'ok' }));
  },
  'UC01-SESSION': async ({ api, check, state, fixtureDir }) => {
    const sign = await fixtureIdentity(fixtureDir);
    state.signWebIdentity = (profile) => sign('a', 'android', profile);
    async function enroll(step, actor, deviceType) {
      const data = await sign(actor, deviceType);
      const response = await api(step, { data });
      const body = response.json();
      check(step + '-contract', sessionShape(body, true));
      return body;
    }
    state.a1 = await enroll('first-a', 'aInitial', 'android');
    state.a = await enroll('second-a', 'a', 'ios');
    check('same-account', state.a.accountId === state.a1.accountId);
    check('distinct-sessions', state.a.sessionToken !== state.a1.sessionToken);
    const validated = (await api('validate-a', { token: state.a.sessionToken })).json();
    check('validated-account', sessionShape(validated, false) && validated.accountId === state.a.accountId);
    for (const [step, token] of [['profile-a', state.a.sessionToken], ['profile-a-original-session', state.a1.sessionToken]]) {
      check(step + '-identity', isDeepStrictEqual((await api(step, { token })).json(), profile('a')));
    }
    for (const actor of ['b', 'c', 'd']) state[actor] = await enroll('create-' + actor, actor, 'android');
    check('fixture-actors-distinct', new Set(['a', 'b', 'c', 'd'].map((actor) => state[actor].accountId)).size === 4);
    check('profile-b-identity', isDeepStrictEqual((await api('profile-b', { token: state.b.sessionToken })).json(), profile('b')));
  },
  'UC01-REVOKE': async ({ api, check, state }) => {
    const token = state.a1.sessionToken;
    for (const step of ['revoke-a1', 'repeat-a1']) {
      check(step + '-empty', (await api(step, { token })).body === '');
    }
    for (const step of ['validate-a1-denied', 'profile-a1-denied', 'items-a1-denied']) {
      const response = await api(step, { token, ...(step.startsWith('items') && { query: { tab: 'lost' } }) });
      verifyError(check, step, response, 'SESSION_INVALID');
    }
    const surviving = { token: state.a.sessionToken };
    const validated = (await api('validate-a2', surviving)).json();
    check('surviving-account', sessionShape(validated, false) && validated.accountId === state.a.accountId);
    check('surviving-profile', isDeepStrictEqual((await api('profile-a2', surviving)).json(), profile('a')));
  },
  'UC01-SESSION-ABSENT': ({ api, check }) => verifyRejectedSession(api, check, 'absent'),
  'UC01-SESSION-EXPIRED': async ({ api, check, fixtureDir, seed }) => {
    const sign = await fixtureIdentity(fixtureDir);
    for (const state of ['expired-idle', 'expired-absolute']) {
      const data = await sign('d', 'android');
      const body = (await api(`create-${state}`, { data })).json();
      check(`create-${state}-contract`, sessionShape(body, true));
      await ageSession(data.attemptId, state, seed);
      await verifyRejectedSession(api, check, state, body.sessionToken);
    }
  },
  'UC02-LOST': (context) => verifyItems('lost', context),
  'UC02-FOUND': (context) => verifyItems('found', context),
  'UC02-CLAIMS': (context) => verifyItems('claims', context),
  'UC02-CURSOR': async ({ api, check, state }) => {
    const tab = 'lost';
    const token = state.a.sessionToken;
    const pages = expectedPages(tab, 'a', state.webTag);
    const first = await api('cursor-first', { token, query: { tab } });
    const cursor = verifyPage(check, first.json(), tab, pages[0], true, 'cursor-first');
    const next = await api('cursor-same-tab', { token, query: { tab, cursor } });
    verifyPage(check, next.json(), tab, pages[1], false, 'cursor-same-tab');
    const wrongTab = await api('cursor-other-tab', { token, query: { tab: 'found', cursor } });
    const wrongAccount = await api('cursor-other-account', { token: state.b.sessionToken, query: { tab, cursor } });
    for (const [step, response] of [['other-tab', wrongTab], ['other-account', wrongAccount]]) {
      check(step + '-invalid-cursor', isDeepStrictEqual(response.json(), { code: 'INVALID_CURSOR' }));
    }
  },
  'UC02-INVALID-TAB': async ({ api, check, state }) => {
    const response = await api('missing-tab', { token: state.a.sessionToken });
    verifyError(check, 'missing-tab', response, 'INVALID_REQUEST');
  },
  'UC01-02-WEB-E2E': runWebE2E,
  'MOBILE-SESSION-CLEANUP': async ({ check, command, root }) => {
    const result = await command(process.execPath, ['--import', 'tsx', '--test', '--test-reporter=tap',
      'tests/auth-flow.test.ts', 'tests/my-area-flow.test.ts'], { cwd: root + '/apps/mobile', timeout: 30_000 });
    const executed = Number(/^# tests (\d+)$/mu.exec(result.stdout)?.[1] ?? 0);
    check('flow-tests-executed', executed > 0, { observedCount: executed });
    check('flow-tests-pass', result.status === 0 && /^# fail 0$/mu.test(result.stdout), { observedCount: executed });
    for (const [proof, name] of [
      ['logout-and-late-read', 'local logout finishes before unavailable Core and ignores a pending personal read'],
      ['invalidation-clears-data', 'current session invalidation clears the profile, list and stored session'],
      ['logout-discards-old-error', 'logout discards the invalid-session result of a pending old read'],
    ]) {
      check(proof, result.stdout.split('\n').some((line) => line.startsWith('ok ') && line.endsWith(' - ' + name)));
    }
  },
  'CORE-HTTP-PRIVACY': async ({ check, client, model }) => {
    const operations = [...model.operations.keys()].filter((name) => model.manifest.scope[name].kind === 'business');
    for (const operation of operations) {
      const messages = client.exchanges.filter((item) => item.operation === operation);
      check(operation + '-recorded', messages.length > 0, { observedCount: messages.length });
      for (const { har, sessionState } of messages) {
        const { request, response } = har;
        const queryAllowed = request.queryString.every(({ name }) => operation === 'listMyItems' && ['tab', 'cursor'].includes(name));
        const auth = request.headers.find(({ name }) => name === 'authorization');
        if (operation === 'createGoogleSession') {
          const body = JSON.parse(request.postData?.text ?? '{}');
          check(operation + '-body-only', queryAllowed && !auth && typeof body.idToken === 'string' && !request.url.includes(body.idToken));
        } else if (sessionState === 'absent') {
          check(operation + '-no-credential', queryAllowed && !auth && !request.postData);
        } else {
          check(operation + '-bearer-only', queryAllowed && auth?.value.startsWith('Bearer ') &&
            !request.url.includes(auth.value.slice('Bearer '.length)) && !request.postData);
        }
        if (response.status === 200) {
          check(operation + '-no-store', response.headers.some(({ name, value }) =>
            name === 'cache-control' && value.split(',').some((directive) => directive.trim().toLowerCase() === 'no-store')));
        }
      }
    }
  },
};

export async function executeCases(model, context, onCase = () => {}) {
  const results = new Map();
  const state = { webTag: 'Fixture-' + randomUUID().slice(0, 8) };
  for (const id of ['EDGE-FIXTURE-TLS', 'UC01-SESSION', 'UC01-REVOKE', 'UC01-SESSION-ABSENT', 'UC01-SESSION-EXPIRED',
    'UC02-LOST', 'UC02-FOUND', 'UC02-CLAIMS', 'UC02-CURSOR', 'UC02-INVALID-TAB', 'CORE-HTTP-PRIVACY', 'MOBILE-SESSION-CLEANUP',
    'UC01-02-WEB-E2E']) {
    const definition = model.cases.get(id);
    const assertions = [];
    function check(assertion, ok, counts = {}) {
      assertions.push({ assertion, ok: Boolean(ok), ...counts });
      if (!ok) throw new AssertionFailure(assertion);
    }
    let outcome = 'PASS';
    let reason = 'assertions-passed';
    try {
      if (id !== 'MOBILE-SESSION-CLEANUP' && !context.client) {
        outcome = 'MISSING';
        reason = 'fixture-unavailable';
      } else if ((id.startsWith('UC02-') || definition.source === 'ui') && !state.seeded) {
        outcome = 'MISSING';
        reason = 'item-fixture-unavailable';
      } else if (id === 'UC01-REVOKE' && !state.sessionReady) {
        outcome = 'MISSING';
        reason = 'session-fixture-unavailable';
      } else {
        const api = apiFor(definition, context.client, check);
        await handlers[id]({ ...context, definition, model, api, check, state });
      }
    } catch (error) {
      outcome = error instanceof AssertionFailure ? 'FAIL' : 'MISSING';
      reason = error instanceof AssertionFailure || error instanceof WebEvidenceMissing ? error.message : 'case-execution-error';
      if (!(error instanceof AssertionFailure) && !(error instanceof WebEvidenceMissing)) context.toolErrors.add('case-execution-error');
    }
    results.set(id, { outcome, reason, assertions });
    onCase(id, outcome);
    if (id === 'UC01-SESSION' && outcome === 'PASS') {
      state.sessionReady = true;
      try {
        await seedItems(state, context.seed);
        state.seeded = true;
      } catch {
        context.toolErrors.add('fixture-seed-error');
      }
    }
  }
  return results;
}
