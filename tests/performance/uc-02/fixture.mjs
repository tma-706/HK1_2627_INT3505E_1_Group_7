import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { importJWK, SignJWT } from 'jose';

const tabs = ['lost', 'found', 'claims'];

export async function prepareFixture(origin, privateJwk, seed, itemsPerTab = 21) {
  assert.match(origin, /^https:\/\/127\.0\.0\.1:\d+$/u);
  assert.ok(Number.isSafeInteger(itemsPerTab) && itemsPerTab > 0);
  const key = await importJWK(privateJwk, 'RS256');
  async function createAccount() {
    const subject = 'uc02-perf-' + randomUUID();
    const email = subject + '@example.test';
    const idToken = await new SignJWT({ email, name: 'UC-02 performance fixture' })
      .setProtectedHeader({ alg: 'RS256', kid: 'uc01-local-key' })
      .setIssuer('https://accounts.google.com').setAudience('uc01-local-fixture')
      .setSubject(subject).setExpirationTime('5m').sign(key);
    const response = await fetch(origin + '/api/auth/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, deviceType: 'android', attemptId: randomUUID() }),
      signal: AbortSignal.timeout(5000), redirect: 'error',
    });
    assert.equal(response.status, 200, 'Fixture session creation failed');
    const session = await response.json();
    assert.match(session.accountId, /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u);
    assert.equal(typeof session.sessionToken, 'string');
    return { id: session.accountId, token: session.sessionToken, email };
  }

  const peer = await createAccount();
  const sessions = [];
  const sql = ['BEGIN;'];
  for (let index = 0; index < 3; index += 1) {
    const account = await createAccount();
    const items = {};
    for (const tab of tabs) {
      const ids = Array.from({ length: itemsPerTab }, () => randomUUID()).sort().reverse();
      items[tab] = ids;
      const rows = ids.map((id, rowIndex) => {
        if (tab === 'claims') {
          const [sender, owner] = rowIndex % 2 === 0 ? [account.id, peer.id] : [peer.id, account.id];
          return `('${id}', '${sender}', '${owner}', 'Fixture claim', '2026-01-01T00:00:00Z', 'Pending')`;
        }
        return `('${id}', '${tab}', '${account.id}', 'Fixture post', '2026-01-01T00:00:00Z', 'Open')`;
      });
      const table = tab === 'claims'
        ? 'my_area_fixture_claims (id, sender_id, post_owner_id, title, sent_at, status)'
        : 'my_area_fixture_posts (id, tab, author_id, title, created_at, status)';
      sql.push(`INSERT INTO ${table} VALUES ${rows.join(',\n')};`);
    }
    sessions.push({ token: account.token, email: account.email, items });
  }
  sql.push('COMMIT;');
  await seed(sql.join('\n'));
  return { origin, sessions };
}

async function main() {
  const fixtureDirectory = 'dist/uc01-local';
  const origin = `https://127.0.0.1:${process.env.UC01_HTTPS_PORT || 8443}`;
  const jwk = JSON.parse(await readFile(`${fixtureDirectory}/fixture-key.json`, 'utf8'));
  const fixtureEnv = { ...process.env };
  for (const name of ['GOOGLE_CLIENT_ID', 'SESSION_REPLAY_KEY_VERSION', 'SESSION_REPLAY_KEYS', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD']) {
    delete fixtureEnv[name];
  }
  const itemsPerTab = Number(process.argv[2] ?? 21);
  const fixture = await prepareFixture(origin, jwk, (sql) => {
    const result = spawnSync('docker', [
      'compose', '-p', 'lf-uc01-local', '--env-file', '.env.example', '--env-file', `${fixtureDirectory}/compose.env`,
      '-f', 'compose.yaml', '-f', 'infra/uc01-local/compose.yaml', 'exec', '-T', 'db',
      'psql', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'lost_found', '-d', 'lost_found',
    ], { input: sql, encoding: 'utf8', env: fixtureEnv });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, result.stderr);
  }, itemsPerTab);
  const sessionsPath = `${fixtureDirectory}/uc02-perf-${randomUUID()}.json`;
  await writeFile(sessionsPath, JSON.stringify(fixture), { flag: 'wx', mode: 0o600 });
  console.log(sessionsPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
