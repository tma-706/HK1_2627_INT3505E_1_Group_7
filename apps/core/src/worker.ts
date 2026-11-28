import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { loadOutboxKey } from './modules/identity/credentials.js';
import { createEmailWorker, mailpitSender } from './modules/identity/email-jobs.js';

const key = loadOutboxKey(process.env.LF_IDENTITY_OUTBOX_KEY);
const mailUrl = new URL(process.env.LF_TEST_MAIL_API_URL ?? '');
const linkUrl = new URL(process.env.LF_VERIFICATION_LINK_URL ?? 'campus-lost-found://verify-email');
if (!['http:', 'https:'].includes(mailUrl.protocol) || mailUrl.username || mailUrl.password
  || !['campus-lost-found:', 'https:'].includes(linkUrl.protocol) || linkUrl.username || linkUrl.password
  || linkUrl.search || linkUrl.hash) {
  throw new Error('Invalid local mailbox or verification URL configuration');
}

const db = new pg.Pool({ connectionTimeoutMillis: 1500, query_timeout: 2500, statement_timeout: 2300 });
db.on('error', () => console.error('Idle email worker database connection failed'));
const worker = createEmailWorker(db, key, mailpitSender(mailUrl, linkUrl));
let stopping = false;
process.once('SIGINT', () => { stopping = true; });
process.once('SIGTERM', () => { stopping = true; });

try {
  while (!stopping) {
    try {
      const result = await worker.processNext();
      if (result === 'idle') await delay(500);
      else console.info(`Verification email job: ${result}`);
    } catch {
      console.error('Verification email worker could not process a job');
      await delay(1500);
    }
  }
} finally {
  await db.end();
}
