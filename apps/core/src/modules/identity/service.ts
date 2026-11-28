import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { encryptToken, hashPassword, passwordMatches, tokenDigest } from './credentials.js';

export const verificationMinutes = 15;
const resendWindowMs = 15 * 60_000;
const maxResends = 3;
const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const localPart = /^[a-z0-9!#$%&'*+\-/=?^_`{|}~]+(?:\.[a-z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/i;
const domainLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  const parts = email.split('@');
  if (email.length > 254 || parts.length !== 2) return null;
  const [local, domain] = parts;
  if (local.length > 64 || !localPart.test(local) || !domain.split('.').every(label => domainLabel.test(label))) {
    return null;
  }
  return email;
}

export function isRegistrationPassword(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 256) return false;
  const length = [...value].length;
  return length >= 15 && length <= 128;
}

export function isVerificationToken(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{43}$/.test(value);
}

async function transaction<T>(db: Pool, operation: (client: PoolClient) => Promise<T>) {
  const client = await db.connect();
  let discard = false;
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    client.release(discard);
  }
}

function receipt(requestId: string, receivedAt: Date) {
  return { requestId, receivedAt: receivedAt.toISOString(), status: 'received' as const };
}

async function writeReceipt(client: PoolClient, now: Date) {
  const requestId = randomUUID();
  await client.query('INSERT INTO public.identity_email_receipts VALUES ($1, $2)', [requestId, now]);
  return receipt(requestId, now);
}

type AccountRow = { account_id: string; verified_at: Date | null };
type VerificationRow = { account_id: string; expires_at: Date; consumed_at: Date | null };

export function createIdentityService(db: Pool, outboxKey: Buffer, now = () => new Date()) {
  async function enqueueEmail(client: PoolClient, accountId: string, issuedAt: Date) {
    const token = randomBytes(32).toString('base64url');
    const digest = tokenDigest(token);
    const eventId = randomUUID();
    const expiresAt = new Date(issuedAt.getTime() + verificationMinutes * 60_000);
    await client.query(`INSERT INTO public.identity_verification_tokens
      (token_digest, account_id, issued_at, expires_at) VALUES ($1, $2, $3, $4)`,
    [digest, accountId, issuedAt, expiresAt]);
    await client.query(`INSERT INTO public.identity_email_jobs
      (event_id, token_digest, encrypted_token, next_attempt_at) VALUES ($1, $2, $3, $4)`,
    [eventId, digest, encryptToken(token, outboxKey, eventId), issuedAt]);
  }

  return {
    async register(email: string, password: string) {
      const hash = await hashPassword(password);
      return transaction(db, async client => {
        const result = await client.query<{ account_id: string }>(`INSERT INTO public.identity_accounts
          (account_id, email_normalized, password_hash) VALUES ($1, $2, $3)
          ON CONFLICT (email_normalized) DO NOTHING RETURNING account_id`, [randomUUID(), email, hash]);
        const acceptedAt = now();
        if (result.rows[0]) await enqueueEmail(client, result.rows[0].account_id, acceptedAt);
        return writeReceipt(client, acceptedAt);
      });
    },

    async getReceipt(requestId: string) {
      if (!uuid.test(requestId)) return null;
      const result = await db.query<{ received_at: Date }>(
        'SELECT received_at FROM public.identity_email_receipts WHERE request_id = $1', [requestId]);
      return result.rows[0] ? receipt(requestId, result.rows[0].received_at) : null;
    },

    async verify(token: string) {
      const digest = tokenDigest(token);
      return transaction(db, async client => {
        const tokenOwner = (await client.query<{ account_id: string }>(`SELECT account_id
          FROM public.identity_verification_tokens WHERE token_digest = $1`, [digest])).rows[0];
        if (!tokenOwner) return 'invalid';

        const account = (await client.query<AccountRow>(`SELECT account_id, verified_at
          FROM public.identity_accounts WHERE account_id = $1 FOR UPDATE`, [tokenOwner.account_id])).rows[0];
        const verification = (await client.query<VerificationRow>(`SELECT account_id, expires_at, consumed_at
          FROM public.identity_verification_tokens WHERE token_digest = $1`, [digest])).rows[0];
        const verifiedAt = now();
        if (!account || !verification || account.verified_at || verification.consumed_at
          || verification.expires_at.getTime() <= verifiedAt.getTime()) return 'gone';

        await client.query('UPDATE public.identity_verification_tokens SET consumed_at = $2 WHERE token_digest = $1',
          [digest, verifiedAt]);
        await client.query('UPDATE public.identity_accounts SET verified_at = $2 WHERE account_id = $1',
          [account.account_id, verifiedAt]);
        return 'verified';
      });
    },

    async resend(email: string) {
      return transaction(db, async client => {
        await client.query(`INSERT INTO public.identity_resend_windows (email_normalized) VALUES ($1)
          ON CONFLICT (email_normalized) DO NOTHING`, [email]);
        const window = (await client.query<{ accepted_at: Date[] }>(`SELECT accepted_at
          FROM public.identity_resend_windows WHERE email_normalized = $1 FOR UPDATE`, [email])).rows[0];
        const acceptedAt = now();
        const recent = window.accepted_at.filter(time => time.getTime() > acceptedAt.getTime() - resendWindowMs);
        if (recent.length >= maxResends) {
          const retryMs = recent[0].getTime() + resendWindowMs - acceptedAt.getTime();
          return { retryAfter: Math.max(1, Math.ceil(retryMs / 1000)) } as const;
        }

        await client.query(`UPDATE public.identity_resend_windows SET accepted_at = $2
          WHERE email_normalized = $1`, [email, [...recent, acceptedAt]]);
        const account = (await client.query<AccountRow>(`SELECT account_id, verified_at
          FROM public.identity_accounts WHERE email_normalized = $1 FOR UPDATE`, [email])).rows[0];
        if (account && !account.verified_at) await enqueueEmail(client, account.account_id, now());
        return { receipt: await writeReceipt(client, acceptedAt) } as const;
      });
    },

    async checkPasswordSessionEligibility(email: string, password: string) {
      const account = (await db.query<AccountRow & { password_hash: string }>(`SELECT account_id, verified_at,
        password_hash FROM public.identity_accounts WHERE email_normalized = $1`, [normalizeEmail(email)])).rows[0];
      if (!await passwordMatches(password, account?.password_hash) || !account) {
        return { status: 'invalid_credentials' } as const;
      }
      if (!account.verified_at) return { status: 'forbidden' } as const;
      return { status: 'eligible', accountId: account.account_id } as const;
    },
  };
}

export type IdentityService = ReturnType<typeof createIdentityService>;
