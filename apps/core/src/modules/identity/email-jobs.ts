import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { decryptToken } from './credentials.js';
import { passwordResetMinutes, verificationMinutes } from './service.js';

const maxAttempts = 4;
const leaseMs = 30_000;
const retryDelayMs = 5000;

type Job = { event_id: string; encrypted_token: string; lease_id: string; attempts: number };
type Target = { email_normalized: string; expires_at: Date; invalidated: boolean };
type EmailPurpose = 'verification' | 'passwordReset';
type Send = (mail: { email: string; token: string; eventId: string }) => Promise<void>;

export function mailpitSender(apiUrl: URL, linkUrl: URL, purpose: EmailPurpose = 'verification'): Send {
  const reset = purpose === 'passwordReset';
  const minutes = reset ? passwordResetMinutes : verificationMinutes;
  return async ({ email, token, eventId }) => {
    const link = new URL(linkUrl);
    link.hash = new URLSearchParams({ token }).toString();
    const response = await fetch(new URL('/api/v1/send', apiUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        From: { Email: 'no-reply@campus-lost-found.test', Name: 'Campus Lost & Found' },
        To: [{ Email: email }],
        Subject: reset ? 'Đặt lại mật khẩu Campus Lost & Found' : 'Xác thực email Campus Lost & Found',
        Text: `Mở liên kết trong ${minutes} phút kể từ khi liên kết được cấp.\n${link.href}`,
        Headers: { 'Message-ID': `<${eventId}@campus-lost-found.test>` },
      }),
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error('Identity email could not be delivered');
  };
}

export function createEmailWorker(
  db: Pool, outboxKey: Buffer, send: Send, now = () => new Date(), purpose: EmailPurpose = 'verification',
) {
  const reset = purpose === 'passwordReset';
  const jobs = reset ? 'identity_password_reset_jobs' : 'identity_email_jobs';
  const tokens = reset ? 'identity_password_reset_tokens' : 'identity_verification_tokens';
  const invalidated = reset
    ? `token.consumed_at IS NOT NULL OR token.revoked_at IS NOT NULL OR account.verified_at IS NULL
       OR COALESCE(account.moderation_until > $3, false)`
    : 'account.verified_at IS NOT NULL';
  async function reap(nowAt: Date) {
    await db.query(`WITH due AS (
        SELECT job.event_id, CASE WHEN token.expires_at <= $1 THEN 'expired' ELSE 'delivery_failed' END AS reason
        FROM public.${jobs} job
        JOIN public.${tokens} token ON token.token_digest = job.token_digest
        WHERE (job.state = 'PENDING' OR (job.state = 'SENDING' AND job.lease_until <= $1))
          AND (token.expires_at <= $1 OR job.attempts >= $2)
        LIMIT 100 FOR UPDATE OF job SKIP LOCKED
      ) UPDATE public.${jobs} job
      SET state = 'DEAD', terminal_reason = due.reason, lease_id = NULL, lease_until = NULL, encrypted_token = NULL
      FROM due WHERE job.event_id = due.event_id`, [nowAt, maxAttempts]);
  }

  async function claim(nowAt: Date) {
    const leaseId = randomUUID();
    const leaseUntil = new Date(nowAt.getTime() + leaseMs);
    const result = await db.query<Job>(`WITH candidate AS (
        SELECT event_id FROM public.${jobs}
        WHERE ((state = 'PENDING' AND next_attempt_at <= $1) OR (state = 'SENDING' AND lease_until <= $1))
          AND attempts < $2
        ORDER BY next_attempt_at, event_id LIMIT 1 FOR UPDATE SKIP LOCKED
      ) UPDATE public.${jobs} AS job SET state = 'SENDING', attempts = attempts + 1,
        lease_id = $3, lease_until = $4
      FROM candidate WHERE job.event_id = candidate.event_id
      RETURNING job.event_id, job.encrypted_token, job.attempts, job.lease_id`,
    [nowAt, maxAttempts, leaseId, leaseUntil]);
    return result.rows[0];
  }

  async function complete(job: Job, state: 'SENT' | 'DEAD', reason?: string) {
    await db.query(`UPDATE public.${jobs} SET state = $3, terminal_reason = $4,
      lease_id = NULL, lease_until = NULL, encrypted_token = NULL
      WHERE event_id = $1 AND lease_id = $2`, [job.event_id, job.lease_id, state, reason ?? null]);
  }

  return {
    async processNext() {
      const nowAt = now();
      await reap(nowAt);
      const job = await claim(nowAt);
      if (!job) return 'idle';

      const target = (await db.query<Target>(`SELECT account.email_normalized, token.expires_at,
        (${invalidated}) AS invalidated
        FROM public.${jobs} job
        JOIN public.${tokens} token ON token.token_digest = job.token_digest
        JOIN public.identity_accounts account ON account.account_id = token.account_id
        WHERE job.event_id = $1 AND job.lease_id = $2`,
      reset ? [job.event_id, job.lease_id, now()] : [job.event_id, job.lease_id])).rows[0];
      if (!target) return 'lease_lost';
      if (target.invalidated || target.expires_at <= now()) {
        await complete(job, 'DEAD', target.invalidated ? (reset ? 'invalidated' : 'verified') : 'expired');
        return 'closed';
      }

      try {
        await send({ email: target.email_normalized, token: decryptToken(job.encrypted_token, outboxKey, job.event_id), eventId: job.event_id });
      } catch {
        const nextAttempt = new Date(now().getTime() + retryDelayMs * 2 ** (job.attempts - 1));
        if (job.attempts >= maxAttempts || nextAttempt >= target.expires_at) {
          await complete(job, 'DEAD', job.attempts >= maxAttempts ? 'delivery_failed' : 'expired');
          return 'dead';
        }
        await db.query(`UPDATE public.${jobs} SET state = 'PENDING', next_attempt_at = $3,
          lease_id = NULL, lease_until = NULL WHERE event_id = $1 AND lease_id = $2`,
        [job.event_id, job.lease_id, nextAttempt]);
        return 'retry';
      }

      await complete(job, 'SENT');
      return 'sent';
    },
  };
}
