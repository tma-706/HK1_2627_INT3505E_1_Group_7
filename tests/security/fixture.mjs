import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { importJWK, SignJWT } from 'jose';
import { readJSON } from './model.mjs';

export const fixture = readJSON('tests/security/fixture.json');

export async function fixtureIdentity(fixtureDir) {
  const key = await importJWK(readJSON(`${fixtureDir}/fixture-key.json`), 'RS256');
  const run = randomUUID();
  return async (actor, deviceType) => {
    const { email, displayName, avatarUrl, subject } = fixture.actors[actor];
    const idToken = await new SignJWT({ email, name: displayName, ...(avatarUrl && { picture: avatarUrl }) })
      .setProtectedHeader({ alg: 'RS256', kid: 'uc01-local-key' })
      .setIssuer('https://accounts.google.com').setAudience('uc01-local-fixture')
      .setSubject(`security-${run}-${subject}`).setExpirationTime('5m').sign(key);
    return { idToken, deviceType, attemptId: randomUUID() };
  };
}

function row(tab, actor, n) {
  const tabIndex = fixture.tabs.indexOf(tab) + 1;
  const id = `00000000-0000-4000-8000-${tabIndex}${{ a: 1, b: 2, c: 3 }[actor]}${String(n).padStart(10, '0')}`;
  const time = n === 1 ? fixture.newest : fixture.tied;
  const title = `${tab}-${actor}-${n}`;
  if (tab === 'claims') {
    return { id, title, sentAt: time, status: 'Pending', role: n % 2 ? fixture.claims.oddRole : fixture.claims.evenRole };
  }
  return { id, title, postedAt: time, status: 'Open', ...(tab === 'found' && n % 2 === 1 && {
    thumbnailUrl: `https://media.example.test/processed/${id}.png`,
  }) };
}

export function expectedPages(tab, actor) {
  return fixture.pageOrder[actor].map((indices) => indices.map((n) => row(tab, actor, n)));
}

// This is the only security adapter with DB access. It seeds, then the suite reads exclusively over HTTPS.
export async function seedItems(accounts, compose) {
  const ids = Object.fromEntries(['a', 'b', 'c'].map((actor) => [actor, accounts[actor].accountId]));
  for (const id of Object.values(ids)) assert.match(id, /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u);
  const literal = (value) => value == null ? 'NULL' : `'${value.replaceAll("'", "''")}'`;
  const statements = ['BEGIN;'];
  for (const tab of fixture.tabs) {
    for (const [actor, count] of Object.entries(fixture.countByActor)) {
      if (tab === 'claims' && actor === fixture.claims.otherParty) continue;
      for (let n = 1; n <= count; ++n) {
        const item = row(tab, actor, n);
        if (tab === 'claims') {
          const peer = ids[fixture.claims.otherParty];
          const [sender, owner] = item.role === 'sent' ? [ids[actor], peer] : [peer, ids[actor]];
          const values = [item.id, sender, owner, item.title, item.sentAt, item.status].map(literal);
          statements.push(`INSERT INTO my_area_fixture_claims (id, sender_id, post_owner_id, title, sent_at, status) VALUES (${values.join(', ')});`);
        } else {
          const values = [item.id, tab, ids[actor], item.title, item.postedAt, item.status, item.thumbnailUrl].map(literal);
          statements.push(`INSERT INTO my_area_fixture_posts (id, tab, author_id, title, created_at, status, thumbnail_url) VALUES (${values.join(', ')});`);
        }
      }
    }
  }
  statements.push('COMMIT;');
  await compose(statements.join('\n'));
}
