import assert from 'node:assert/strict';
import pg from '/app/node_modules/pg/lib/index.js';
import { loadOutboxKey } from '/app/dist/modules/identity/credentials.js';
import { createEmailWorker } from '/app/dist/modules/identity/email-jobs.js';

const db = new pg.Pool();
const key = loadOutboxKey(process.env.LF_IDENTITY_OUTBOX_KEY);
const fixture = JSON.parse(process.env.UC03_RETRY_FIXTURE);
let time = fixture.issuedAt;
const sent = [];
const retried = [];
const worker = createEmailWorker(db, key, async mail => {
  if (mail.email === fixture.recoveredEmail) {
    retried.push(mail);
    if (retried.length === 2) return;
  } else {
    assert.equal(mail.email, fixture.email);
    sent.push(mail);
  }
  throw new Error('controlled delivery failure');
}, () => new Date(time), 'passwordReset');

try {
  for (const [index, delay] of [0, 5000, 10000, 20000].entries()) {
    time += delay;
    assert.equal(await worker.processNext(), index < 3 ? 'retry' : 'dead');
  }
  assert.equal(sent.length, 4);
  assert.ok(sent.every(item => item.eventId === sent[0].eventId && item.token === sent[0].token));
  const { rows: [record] } = await db.query(`SELECT job.state, job.terminal_reason, job.attempts,
    job.encrypted_token IS NULL AS cleared, token.expires_at FROM public.identity_password_reset_jobs job
    JOIN public.identity_password_reset_tokens token USING (token_digest) WHERE job.event_id = $1`, [sent[0].eventId]);
  assert.equal(record.state, 'DEAD');
  assert.equal(record.terminal_reason, 'delivery_failed');
  assert.equal(record.attempts, 4);
  assert.equal(record.cleared, true);
  assert.equal(+record.expires_at, fixture.issuedAt + 30 * 60_000);
  assert.equal((await db.query('SELECT 1 FROM public.identity_password_reset_jobs WHERE event_id = $1',
    [fixture.rejectedJob])).rowCount, 0);
  time = fixture.issuedAt + 60_000;
  assert.equal(await worker.processNext(), 'retry');
  time += 5000;
  assert.equal(await worker.processNext(), 'sent');
  assert.equal(retried.length, 2);
  assert.ok(retried.every(item => item.eventId === retried[0].eventId && item.token === retried[0].token));
  time = fixture.issuedAt + 120_000;
  assert.equal(await worker.processNext(), 'closed');
  const { rows: [closed] } = await db.query(`SELECT job.state, job.terminal_reason, job.encrypted_token IS NULL AS cleared
    FROM public.identity_password_reset_jobs job JOIN public.identity_password_reset_tokens token USING (token_digest)
    JOIN public.identity_accounts account USING (account_id) WHERE account.email_normalized = $1`, [fixture.revokedEmail]);
  assert.deepEqual(closed, { state: 'DEAD', terminal_reason: 'invalidated', cleared: true });
  console.log('Controlled Worker checks passed: temporary recovery, four attempts, stable token, expiry, invalidation and outbox rollback/cleanup.');
} finally {
  await db.end();
}
