import { createHash, createHmac, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { GoogleTokenRejected, type VerifyGoogleToken } from './google.js';

export type DeviceType = 'android' | 'ios';
export interface LoginRequest {
  idToken: string;
  deviceType: DeviceType;
  attemptId: string;
}
export interface CurrentSession {
  accountId: string;
  expiresAt: string;
}
export interface GoogleSession extends CurrentSession {
  sessionToken: string;
}
interface SessionRow {
  id: string;
  account_id: string;
  expires_at: Date;
  revoked_at: Date | null;
}
interface AttemptRow extends SessionRow {
  google_sub: string;
  google_token_fingerprint: Buffer;
  device_type: DeviceType;
  replay_key_version: string;
}

export class LoginAttemptConflict extends Error {}

const expiry = (qualifier = '') => `LEAST(${qualifier}last_activity_at + interval '720 hours', ${qualifier}created_at + interval '2160 hours')`;
const sha256 = (value: string) => createHash('sha256').update(value).digest();

export interface ReplayKeys {
  current: string;
  keys: ReadonlyMap<string, Buffer>;
}

export function readReplayKeys(current: string, config: string): ReplayKeys {
  const parsed: unknown = JSON.parse(config);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid replay keys');
  const keys = new Map<string, Buffer>();
  for (const [version, encoded] of Object.entries(parsed)) {
    if (!version || typeof encoded !== 'string' || !/^[A-Za-z0-9_-]{43}$/u.test(encoded)) {
      throw new Error('Invalid replay key');
    }
    const key = Buffer.from(encoded, 'base64url');
    if (key.toString('base64url') !== encoded) throw new Error('Invalid replay key encoding');
    keys.set(version, key);
  }
  if (!keys.has(current)) throw new Error('Missing active replay key');
  return { current, keys };
}

export class Sessions {
  constructor(
    private readonly db: Pool,
    private readonly verifier: VerifyGoogleToken,
    private readonly replayKeys: ReplayKeys,
  ) {}

  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  private derive(version: string, input: LoginRequest, fingerprint: Buffer, sub: string): string {
    const key = this.replayKeys.keys.get(version);
    if (!key) throw new Error('Replay key unavailable');
    return createHmac('sha256', key)
      .update(JSON.stringify(['lost-found/core-session/v1', input.attemptId, fingerprint.toString('hex'), input.deviceType, sub]))
      .digest('base64url');
  }

  async create(input: LoginRequest): Promise<GoogleSession> {
    const identity = await this.verifier(input.idToken);
    const fingerprint = sha256(input.idToken);
    return this.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [input.attemptId]);
      const { rows: [prior] } = await client.query<AttemptRow>(`
        SELECT s.id, s.account_id, s.revoked_at, ${expiry('s.')} AS expires_at, s.device_type,
               l.google_token_fingerprint, l.replay_key_version, a.google_sub
        FROM login_attempts l JOIN sessions s ON s.id = l.session_id
        JOIN accounts a ON a.id = s.account_id
        WHERE l.attempt_id = $1 FOR UPDATE OF s
      `, [input.attemptId]);

      if (prior) {
        const { rows: [{ now }] } = await client.query<{ now: Date }>('SELECT clock_timestamp() AS now');
        if (identity.expiresAt <= now) throw new GoogleTokenRejected();
        if (!prior.google_token_fingerprint.equals(fingerprint) || prior.device_type !== input.deviceType ||
            prior.google_sub !== identity.sub || prior.revoked_at || prior.expires_at <= now) {
          throw new LoginAttemptConflict();
        }
        return {
          accountId: prior.account_id,
          expiresAt: prior.expires_at.toISOString(),
          sessionToken: this.derive(prior.replay_key_version, input, fingerprint, identity.sub),
        };
      }

      const { rows: [account] } = await client.query<{ id: string }>(`
        INSERT INTO accounts (id, google_sub, email, display_name, avatar_url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, clock_timestamp(), clock_timestamp())
        ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url, updated_at = clock_timestamp()
        RETURNING id
      `, [randomUUID(), identity.sub, identity.email, identity.displayName, identity.avatarUrl]);
      const { rows: [{ now }] } = await client.query<{ now: Date }>('SELECT clock_timestamp() AS now');
      if (identity.expiresAt <= now) throw new GoogleTokenRejected();
      const sessionToken = this.derive(this.replayKeys.current, input, fingerprint, identity.sub);
      const { rows: [session] } = await client.query<SessionRow>(`
        INSERT INTO sessions (id, account_id, token_hash, device_type, created_at, last_activity_at)
        VALUES ($1, $2, $3, $4, $5, $5) RETURNING id, ${expiry()} AS expires_at
      `, [randomUUID(), account.id, sha256(sessionToken), input.deviceType, now]);
      await client.query(`
        INSERT INTO login_attempts
          (attempt_id, session_id, google_token_fingerprint, original_token_expires_at, replay_key_version, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [input.attemptId, session.id, fingerprint, identity.expiresAt, this.replayKeys.current, now]);

      return { accountId: account.id, expiresAt: session.expires_at.toISOString(), sessionToken };
    });
  }

  private async lockSession(client: PoolClient, sessionToken: string): Promise<SessionRow | undefined> {
    const { rows: [session] } = await client.query<SessionRow>(`
      SELECT id, account_id, revoked_at, ${expiry()} AS expires_at
      FROM sessions WHERE token_hash = $1 FOR UPDATE
    `, [sha256(sessionToken)]);
    return session;
  }

  // UC-02 can use this transaction boundary for authenticated reads.
  async withCurrentSession<T>(
    sessionToken: string,
    read: (client: PoolClient, accountId: string) => Promise<T>,
  ): Promise<{ session: CurrentSession; result: T } | null> {
    return this.transaction(async (client) => {
      const session = await this.lockSession(client, sessionToken);
      if (!session || session.revoked_at) return null;
      const { rows: [updated] } = await client.query<{ expires_at: Date }>(`
        WITH instant AS MATERIALIZED (SELECT clock_timestamp() AS now)
        UPDATE sessions SET last_activity_at = GREATEST(last_activity_at, instant.now)
        FROM instant WHERE id = $1 AND ${expiry()} > instant.now
        RETURNING ${expiry()} AS expires_at
      `, [session.id]);
      if (!updated) return null;
      const result = await read(client, session.account_id);
      return { session: { accountId: session.account_id, expiresAt: updated.expires_at.toISOString() }, result };
    });
  }

  async revoke(sessionToken: string): Promise<boolean> {
    return this.transaction(async (client) => {
      const session = await this.lockSession(client, sessionToken);
      if (!session) return false;
      if (session.revoked_at) return true;
      const { rowCount } = await client.query(`
        WITH instant AS MATERIALIZED (SELECT clock_timestamp() AS now)
        UPDATE sessions SET revoked_at = instant.now
        FROM instant WHERE id = $1 AND ${expiry()} > instant.now
      `, [session.id]);
      return rowCount === 1;
    });
  }
}
