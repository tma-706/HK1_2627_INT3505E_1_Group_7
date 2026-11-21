import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { importJWK, SignJWT } from 'jose';

export async function prepareIdentityFixture(origin, privateJwk, users = 3) {
  assert.match(origin, /^https:\/\/127\.0\.0\.1:\d+$/u);
  assert.ok(Number.isSafeInteger(users) && users > 0);
  const key = await importJWK(privateJwk, 'RS256');
  const sessions = await Promise.all(Array.from({ length: users }, async () => {
    const subject = 'uc01-perf-' + randomUUID();
    const token = await new SignJWT({ email: subject + '@example.test', name: 'UC-01 performance fixture' })
      .setProtectedHeader({ alg: 'RS256', kid: 'uc01-local-key' })
      .setIssuer('https://accounts.google.com').setAudience('uc01-local-fixture')
      .setSubject(subject).setExpirationTime('5m').sign(key);
    return { token };
  }));
  return { origin, sessions };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const directory = 'dist/uc01-local';
  const origin = `https://127.0.0.1:${process.env.UC01_HTTPS_PORT || 8443}`;
  const jwk = JSON.parse(await readFile(`${directory}/fixture-key.json`, 'utf8'));
  const fixture = await prepareIdentityFixture(origin, jwk, Number(process.argv[2] ?? 3));
  const path = `${directory}/uc01-perf-${randomUUID()}.json`;
  await writeFile(path, JSON.stringify(fixture), { flag: 'wx', mode: 0o600 });
  console.log(path);
}
