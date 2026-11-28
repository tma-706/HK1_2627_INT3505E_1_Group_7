import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { loadOutboxKey } from './modules/identity/credentials.js';
import { createEmailWorker, mailpitSender } from './modules/identity/email-jobs.js';

const key = loadOutboxKey(process.env.LF_IDENTITY_OUTBOX_KEY);
const mailUrl = new URL(process.env.LF_TEST_MAIL_API_URL ?? '');
const linkUrl = new URL(process.env.LF_VERIFICATION_LINK_URL ?? 'campus-lost-found://verify-email');
const resetUrl = new URL(process.env.LF_PASSWORD_RESET_LINK_URL ?? 'campus-lost-found://reset-password');
if (!['http:', 'https:'].includes(mailUrl.protocol) || mailUrl.username || mailUrl.password
  || [linkUrl, resetUrl].some(url => !['campus-lost-found:', 'https:'].includes(url.protocol)
    || url.username || url.password || url.search || url.hash) || linkUrl.href === resetUrl.href) {
  throw new Error('Invalid local mailbox or Identity link URL configuration');
}

const db = new pg.Pool({ connectionTimeoutMillis: 1500, query_timeout: 2500, statement_timeout: 2300 });
db.on('error', () => console.error('Idle email worker database connection failed'));
const verificationWorker = createEmailWorker(db, key, mailpitSender(mailUrl, linkUrl));
const resetWorker = createEmailWorker(db, key, mailpitSender(mailUrl, resetUrl, 'passwordReset'), undefined, 'passwordReset');
let stopping = false;
process.once('SIGINT', () => { stopping = true; });
process.once('SIGTERM', () => { stopping = true; });

try {
  while (!stopping) {
    try {
      const outcomes = await Promise.allSettled([verificationWorker.processNext(), resetWorker.processNext()]);
      for (const result of outcomes) {
        if (result.status === 'rejected') console.error('Identity email worker could not process a job');
        else if (result.value !== 'idle') console.info(`Identity email job: ${result.value}`);
      }
      if (outcomes.some(result => result.status === 'rejected')) await delay(1500);
      else if (outcomes.every(result => result.status === 'fulfilled' && result.value === 'idle')) await delay(500);
    } catch {
      console.error('Identity email worker could not process a job');
      await delay(1500);
    }
  }
} finally {
  await db.end();
}
