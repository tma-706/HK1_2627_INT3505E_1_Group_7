import { mkdirSync, readFileSync } from 'node:fs';
import { request } from 'node:https';
import { isDeepStrictEqual } from 'node:util';
import { firefox } from 'playwright';
import { expectedPages } from './fixture.mjs';
import { apiPrefix, readJSON } from './model.mjs';
import { command } from './runtime.mjs';

export class WebEvidenceMissing extends Error {}

function requireEvidence(condition, reason) {
  if (!condition) throw new WebEvidenceMissing(reason);
}

async function verifyGateway(origin, ca) {
  const status = await new Promise((resolve) => {
    request(origin + apiPrefix + '/health/ready', {
      ca: readFileSync(ca), signal: AbortSignal.timeout(5_000),
    }, (response) => {
      response.resume();
      resolve(response.statusCode);
    }).on('error', () => resolve(null)).end();
  });
  requireEvidence(status === 200, 'ui-gateway-unavailable');
}

async function buildWeb(run, variant) {
  const path = `${run.fixtureDir}/web/__security/${variant}`;
  const result = await command('bash', ['-c', 'umask 022; exec "$@"', 'expo-web', process.execPath,
    'node_modules/expo/bin/cli', 'export', '--platform', 'web', '--max-workers', '2', '--output-dir', path], {
    cwd: `${run.root}/apps/mobile`, timeout: 180_000,
    env: { ...process.env, LF_SECURITY_WEB_VARIANT: variant, EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1', CI: '1' },
  });
  requireEvidence(result.status === 0, 'ui-build-failed');
}

export function matchBrowserHar(origin, entries, observed) {
  const groups = Map.groupBy(entries, ({ request, response }) => JSON.stringify([request.method, request.url, response.status]));
  const exchanges = [];
  for (const { url, ...exchange } of observed) {
    const key = JSON.stringify([exchange.method, url, exchange.status]);
    const group = groups.get(key);
    requireEvidence(new URL(url).origin === origin && group?.length === 1, 'ui-har-invalid');
    exchanges.push({ ...exchange, har: group[0] });
    groups.delete(key);
  }
  requireEvidence(groups.size === 0, 'ui-har-invalid');
  return exchanges;
}

async function withBrowser(run, ca, variant, journey) {
  const browserDir = `${run.dir}/web/${variant}`;
  const profile = `${browserDir}/profile`;
  const har = `${browserDir}/browser.har`;
  mkdirSync(profile, { recursive: true, mode: 0o700 });
  const db = `sql:${profile}`;
  for (const args of [
    ['-N', '-d', db, '--empty-password'],
    ['-A', '-d', db, '-n', 'Lost & Found fixture CA', '-t', 'C,,', '-i', ca],
  ]) {
    const result = await command('certutil', args, { timeout: 10_000 });
    requireEvidence(result.status === 0, 'ui-ca-setup-failed');
  }
  const context = await firefox.launchPersistentContext(profile, {
    timeout: 30_000, ignoreHTTPSErrors: false, viewport: { width: 390, height: 820 },
    firefoxUserPrefs: { 'security.enterprise_roots.enabled': false },
    recordHar: { path: har, urlFilter: new RegExp(`^${run.origin.replaceAll('.', '\\.')}${apiPrefix}/`, 'u') },
  }).catch(() => { throw new WebEvidenceMissing('ui-browser-failed'); });
  let failure;
  try {
    await context.route((url) => url.origin !== run.origin, (route) => route.abort());
    const page = context.pages()[0] ?? await context.newPage();
    page.setDefaultTimeout(8_000);
    await journey(page, `${run.origin}/__security/${variant}/`);
  } catch (error) {
    failure = error;
  }
  try {
    await context.close();
    return { entries: readJSON(har).log.entries, failure };
  } catch {
    return { entries: null, failure: failure ?? new WebEvidenceMissing('ui-har-invalid') };
  }
}

async function performJourney(page, url, check, observe, details) {
  const button = (name) => page.getByRole('button', { name, exact: true });
  const heading = (name) => page.getByRole('heading', { name, exact: true });
  const text = (value) => page.getByText(value, { exact: true });
  const visible = async (label, target) => {
    check(label, await target.waitFor({ state: 'visible' }).then(() => true, () => false));
  };
  const initial = await page.goto(url).catch(() => null);
  requireEvidence(initial?.ok(), 'ui-browser-failed');

  await visible('signed-out-screen', heading('Chào mừng bạn'));
  await button('Dùng tài khoản mô phỏng').click();
  await visible('terms-screen', heading('Điều khoản và quyền riêng tư'));
  await observe('sign-in', () => button('Đồng ý và tiếp tục').click());
  await visible('home-after-login', heading('Trang chính'));

  await observe('open-profile', () => button('Hồ sơ').click());
  await visible('profile-screen', heading('Hồ sơ'));
  await visible('profile-fixture-name', text(details.profile.displayName));
  await visible('profile-fixture-email', text(details.profile.email));

  await observe('open-items', () => button('Mục của tôi').click());
  await visible('items-screen', heading('Mục của tôi'));
  const lost = page.getByRole('tab', { name: 'Bài báo mất', selected: true });
  await visible('lost-selected', lost);
  const firstRow = text(details.firstTitle).first();
  await visible('items-first-page', firstRow);
  if (details.nextTitle) check('next-page-absent-before-scroll', await text(details.nextTitle).count() === 0);
  const endOfList = text('Đã hiển thị tất cả');
  await observe('next-page', async () => {
    await firstRow.hover();
    // FlatList mounts additional rows as scrolling progresses.
    for (let turn = 0; turn < 6; turn++) {
      await page.mouse.wheel(0, 550);
      const reachedEnd = await endOfList.waitFor({ state: 'visible', timeout: 300 }).then(() => true, () => false);
      if (reachedEnd) break;
    }
  });
  if (details.nextTitle) await visible('items-second-page', text(details.nextTitle));
  await visible('items-end', endOfList);

  await button('Quay lại').click();
  await visible('profile-after-back', heading('Hồ sơ'));
  await button('Đăng xuất').click();
  await visible('logout-confirmation', heading('Bạn muốn đăng xuất?'));
  await observe('confirm-logout', () => button('Đăng xuất').last().click());
  await visible('signed-out-after-logout', heading('Chào mừng bạn'));
  check('private-view-cleared', await text(details.profile.email).count() === 0 && await heading('Hồ sơ').count() === 0);
}

export async function runWebE2E({ check, client, definition, model, run, state, measure = (_stage, work) => work() }) {
  const ca = `${run.fixtureDir}/tls/ca.crt`;
  await verifyGateway(run.origin, ca);
  check('fixture-gateway-ready-with-ca', true);
  await measure('web-build', async () => {
    await buildWeb(run, 'fixture');
    await buildWeb(run, 'preview');
  });

  const preview = await measure('firefox-preview', () => withBrowser(run, ca, 'preview', (page, url) => performJourney(page, url,
    (label, ok) => check('preview-' + label, ok), (_step, act) => act(), {
      profile: { displayName: 'Nguyễn Minh Anh', email: 'minh.anh@example.test' }, firstTitle: 'Ví màu nâu',
    })));
  if (preview.failure) throw preview.failure;
  check('preview-no-core-evidence', preview.entries.length === 0, { observedCount: preview.entries.length, expectedCount: 0 });

  const profile = { displayName: state.webTag, email: `${state.webTag.toLowerCase()}@example.test`, avatarUrl: null };
  const { idToken } = await state.signWebIdentity(profile);
  const pages = expectedPages('lost', 'a', state.webTag);
  const observations = [];
  const browser = await measure('firefox-fixture', () => withBrowser(run, ca, 'fixture', async (page, url) => {
    await page.addInitScript(({ idToken, origin }) => {
      if (location.origin === origin) globalThis.lostFoundFixtureIdToken = idToken;
    }, { idToken, origin: run.origin });
    let token;
    let cursor;
    await performJourney(page, url, check, async (step, act) => {
      const { operation, sessionState, status } = definition.http.find((item) => item.step === step);
      const { method, path, cacheControl } = model.operations.get(operation);
      const pending = page.waitForResponse((response) => {
        const route = new URL(response.url());
        return route.origin === run.origin && route.pathname === path && response.request().method() === method;
      }).catch(() => null);
      await act();
      const response = await pending;
      requireEvidence(response, 'ui-core-evidence-missing');
      observations.push({ source: 'ui', caseId: definition.id, step, operation, sessionState, method, path,
        url: response.url(), status: response.status() });
      // Retain the observed status for reporting even when the corresponding oracle fails.
      check(`${step}-http-status`, response.status() === status);
      if (cacheControl[status]) check(`${step}-no-store`, (await response.headerValue('cache-control')) === cacheControl[status]);
      if (step === 'sign-in') {
        const body = await response.json().catch(() => null);
        token = body?.sessionToken;
        check('sign-in-fixture-account', body?.accountId === state.a.accountId && typeof token === 'string' && token.length > 0);
        return;
      }
      check(`${step}-fixture-bearer`, await response.request().headerValue('authorization') === `Bearer ${token}`);
      if (step === 'confirm-logout') {
        check('confirm-logout-empty', (await response.body()).length === 0);
        return;
      }
      const body = await response.json().catch(() => null);
      if (step === 'open-profile') {
        check('profile-response-fixture', isDeepStrictEqual(body, profile));
      } else {
        const query = new URL(response.url()).searchParams;
        const next = step === 'next-page';
        check(`${step}-cursor-scope`, query.get('tab') === 'lost' && query.get('cursor') === (next ? cursor : null));
        check(`${step}-response-fixture`, body?.tab === 'lost' && isDeepStrictEqual(body.items, pages[next ? 1 : 0]));
        check(`${step}-response-cursor`, next ? body.nextCursor === null : typeof body.nextCursor === 'string' && body.nextCursor.length > 0);
        cursor = body.nextCursor;
      }
    }, { profile, firstTitle: pages[0][0].title, nextTitle: pages[1][0].title });
  }));
  try {
    if (browser.entries) client.exchanges.push(...matchBrowserHar(run.origin, browser.entries, observations));
  } finally {
    if (browser.failure) throw browser.failure;
  }
  check('browser-har-finalized-and-matched', observations.length === definition.http.length);
}
