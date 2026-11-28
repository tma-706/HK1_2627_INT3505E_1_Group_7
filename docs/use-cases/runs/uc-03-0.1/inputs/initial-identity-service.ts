import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { encryptToken, hashPassword, passwordMatches, tokenDigest } from './credentials.js';

export const verificationMinutes = 15;
export const passwordResetMinutes = 30;
const resendWindowMs = 15 * 60_000;
const maxResends = 3;
const loginWindowMs = 15 * 60_000;
const sessionLifetimeMs = 8 * 60 * 60_000;
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
type ResetToken = VerificationRow & { revoked_at: Date | null };
type ResetWindow = { first_at: Date | null; resent_at: Date[] };
type LoginWindow = { failures: Date[]; locked_until: Date | null };
type LoginAccount = AccountRow & { role: 'member' | 'admin'; moderation_until: Date | number | null };
type StoredSession = { expires_at: Date; revoked_at: Date | null };

function canUseSession(account: LoginAccount, at: Date) {
  return Boolean(account.verified_at) && (account.moderation_until === null || +account.moderation_until <= +at);
}

function sessionView(account: LoginAccount, expiresAt: Date) {
  return { accountId: account.account_id, role: account.role, expiresAt: expiresAt.toISOString() };
}

export function createIdentityService(db: Pool, outboxKey: Buffer, now = () => new Date()) {
  async function currentSession(token: string, revoke: boolean) {
    return transaction(db, async client => {
      const digest = tokenDigest(token);
      const owner = (await client.query<{ account_id: string }>(`
        SELECT account_id FROM public.identity_sessions WHERE token_digest = $1`, [digest])).rows[0];
      if (!owner) return { status: 'invalidSession' } as const;
      const account = (await client.query<LoginAccount>(`
        SELECT account_id, verified_at, role, moderation_until FROM public.identity_accounts
        WHERE account_id = $1 FOR SHARE`, [owner.account_id])).rows[0];
      const session = (await client.query<StoredSession>(`
        SELECT expires_at, revoked_at FROM public.identity_sessions
        WHERE token_digest = $1 AND account_id = $2 FOR UPDATE`, [digest, owner.account_id])).rows[0];
      const at = now();
      if (!account || !session || +session.expires_at <= +at || (!revoke && session.revoked_at)) {
        return { status: 'invalidSession' } as const;
      }
      if (!canUseSession(account, at)) return { status: 'forbidden' } as const;
      if (!revoke) return { status: 'current', session: sessionView(account, session.expires_at) } as const;
      if (!session.revoked_at) {
        await client.query('UPDATE public.identity_sessions SET revoked_at = $2 WHERE token_digest = $1', [digest, at]);
      }
      return { status: 'revoked' } as const;
    });
  }

  async function enqueueEmail(client: PoolClient, accountId: string, issuedAt: Date, reset = false) {
    const token = randomBytes(32).toString('base64url');
    const digest = tokenDigest(token);
    const eventId = randomUUID();
    const expiresAt = new Date(+issuedAt + (reset ? passwordResetMinutes : verificationMinutes) * 60_000);
    const tokens = reset ? 'identity_password_reset_tokens' : 'identity_verification_tokens';
    const jobs = reset ? 'identity_password_reset_jobs' : 'identity_email_jobs';
    await client.query(`INSERT INTO public.${tokens}
      (token_digest, account_id, issued_at, expires_at) VALUES ($1, $2, $3, $4)`,
    [digest, accountId, issuedAt, expiresAt]);
    await client.query(`INSERT INTO public.${jobs}
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

    async requestPasswordReset(email: string) {
      return transaction(db, async client => {
        const window = (await client.query<ResetWindow>(`
          INSERT INTO public.identity_password_reset_windows (email_normalized, discard_after) VALUES ($1, $2)
          ON CONFLICT (email_normalized) DO UPDATE SET email_normalized = EXCLUDED.email_normalized
          RETURNING first_at, resent_at`, [email, new Date(+now() + resendWindowMs)])).rows[0];
        const account = (await client.query<LoginAccount>(`
          SELECT account_id, verified_at, role, moderation_until FROM public.identity_accounts
          WHERE email_normalized = $1 FOR SHARE`, [email])).rows[0];
        const at = now();
        const cutoff = +at - resendWindowMs;
        const first = window.first_at && +window.first_at > cutoff ? window.first_at : null;
        const resends = window.resent_at.filter(time => +time > cutoff);
        if (resends.length >= maxResends) {
          const retryAfter = Math.ceil((+resends[0] - cutoff) / 1000);
          return { retryAfter } as const;
        }
        const isFirst = !first && resends.length === 0;
        await client.query(`UPDATE public.identity_password_reset_windows
          SET first_at = $2, resent_at = $3, discard_after = $4 WHERE email_normalized = $1`,
        [email, isFirst ? at : first, isFirst ? [] : [...resends, at], new Date(+at + resendWindowMs)]);
        if (account && canUseSession(account, at)) await enqueueEmail(client, account.account_id, at, true);
        return { receipt: await writeReceipt(client, at) } as const;
      });
    },

    async resetPassword(token: string, password: string) {
      const digest = tokenDigest(token);
      return transaction(db, async client => {
        const owner = (await client.query<{ account_id: string }>(`
          SELECT account_id FROM public.identity_password_reset_tokens WHERE token_digest = $1`, [digest])).rows[0];
        if (!owner) return 'invalid';
        const account = (await client.query<LoginAccount>(`
          SELECT account_id, verified_at, role, moderation_until FROM public.identity_accounts
          WHERE account_id = $1 FOR UPDATE`, [owner.account_id])).rows[0];
        const reset = (await client.query<ResetToken>(`
          SELECT account_id, expires_at, consumed_at, revoked_at FROM public.identity_password_reset_tokens
          WHERE token_digest = $1`, [digest])).rows[0];
        const at = now();
        if (!account || !reset) return 'invalid';
        if (reset.consumed_at || reset.revoked_at || +reset.expires_at <= +at) return 'gone';
        if (!canUseSession(account, at)) return 'invalid';

        const hash = await hashPassword(password);
        const changedAt = now();
        if (+reset.expires_at <= +changedAt) return 'gone';
        await client.query('UPDATE public.identity_accounts SET password_hash = $2 WHERE account_id = $1',
          [account.account_id, hash]);
        await client.query('UPDATE public.identity_password_reset_tokens SET consumed_at = $2 WHERE token_digest = $1',
          [digest, changedAt]);
        await client.query(`UPDATE public.identity_password_reset_tokens SET revoked_at = $2
          WHERE account_id = $1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > $2`,
        [account.account_id, changedAt]);
        await client.query(`UPDATE public.identity_sessions SET revoked_at = $2
          WHERE account_id = $1 AND revoked_at IS NULL AND expires_at > $2`, [account.account_id, changedAt]);
        return 'reset';
      });
    },

    async createPasswordSession(email: string, password: string) {
      return transaction(db, async client => {
        const window = (await client.query<LoginWindow>(`
          INSERT INTO public.identity_login_windows (email_normalized, discard_after) VALUES ($1, $2)
          ON CONFLICT (email_normalized) DO UPDATE SET email_normalized = EXCLUDED.email_normalized
          RETURNING failures, locked_until`, [email, new Date(+now() + loginWindowMs)])).rows[0];
        const checkedAt = now();
        if (window.locked_until && +window.locked_until > +checkedAt) {
          return { status: 'locked', retryAfter: Math.ceil((+window.locked_until - +checkedAt) / 1000) } as const;
        }

        const account = (await client.query<LoginAccount & { password_hash: string }>(`
          SELECT account_id, verified_at, role, moderation_until, password_hash
          FROM public.identity_accounts WHERE email_normalized = $1 FOR SHARE`, [email])).rows[0];
        const matches = await passwordMatches(password, account?.password_hash);
        const at = now();
        if (!matches || !account) {
          const failures = window.failures.filter(time => +time > +at - loginWindowMs);
          failures.push(at);
          const locked = failures.length >= 5;
          const discardAfter = new Date(+at + loginWindowMs);
          await client.query(`UPDATE public.identity_login_windows
            SET failures = $2, locked_until = $3, discard_after = $4 WHERE email_normalized = $1`,
          [email, locked ? [] : failures, locked ? discardAfter : null, discardAfter]);
          return locked ? { status: 'locked', retryAfter: loginWindowMs / 1000 } as const
            : { status: 'invalidCredentials' } as const;
        }
        if (!canUseSession(account, at)) return { status: 'forbidden' } as const;

        await client.query(`UPDATE public.identity_login_windows
          SET failures = '{}', locked_until = NULL, discard_after = $2 WHERE email_normalized = $1`,
        [email, new Date(+at + loginWindowMs)]);
        const accessToken = randomBytes(32).toString('base64url');
        const expiresAt = new Date(+at + sessionLifetimeMs);
        await client.query(`INSERT INTO public.identity_sessions (token_digest, account_id, issued_at, expires_at)
          VALUES ($1, $2, $3, $4)`, [tokenDigest(accessToken), account.account_id, at, expiresAt]);
        return { status: 'created', session: { ...sessionView(account, expiresAt), accessToken, tokenType: 'Bearer' } } as const;
      });
    },

    getCurrentSession(token: string) {
      return currentSession(token, false);
    },

    revokeCurrentSession(token: string) {
      return currentSession(token, true);
    },

    async prunePasswordSessions() {
      const at = now();
      await db.query(`DELETE FROM public.identity_sessions WHERE token_digest IN (
        SELECT token_digest FROM public.identity_sessions WHERE expires_at <= $1
        ORDER BY expires_at LIMIT 1000 FOR UPDATE SKIP LOCKED)`, [at]);
      await db.query(`DELETE FROM public.identity_login_windows WHERE email_normalized IN (
        SELECT email_normalized FROM public.identity_login_windows WHERE discard_after <= $1
        ORDER BY discard_after LIMIT 1000 FOR UPDATE SKIP LOCKED)`, [at]);
      await db.query(`DELETE FROM public.identity_password_reset_windows WHERE email_normalized IN (
        SELECT email_normalized FROM public.identity_password_reset_windows WHERE discard_after <= $1
        ORDER BY discard_after LIMIT 1000 FOR UPDATE SKIP LOCKED)`, [at]);
    },
  };
}

export type IdentityService = ReturnType<typeof createIdentityService>;
