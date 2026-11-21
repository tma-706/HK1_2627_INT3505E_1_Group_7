import { createHash, randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';

export class InvalidRead extends Error {
  constructor(readonly code: 'INVALID_REQUEST' | 'INVALID_CURSOR') {
    super(code);
  }
}

function cursorHash(cursor: string) {
  return createHash('sha256').update(cursor).digest();
}

function readTab(query: URLSearchParams) {
  const values = query.getAll('tab');
  const [tab] = values;
  if (values.length !== 1 || (tab !== 'lost' && tab !== 'found' && tab !== 'claims')) {
    throw new InvalidRead('INVALID_REQUEST');
  }
  return tab;
}

type Tab = ReturnType<typeof readTab>;
interface Boundary { id: string; at: string }
interface ItemRow extends Boundary {
  title: string;
  status: string;
  occurred_at: Date;
}
interface PostRow extends ItemRow { thumbnail_url: string | null }
interface ClaimRow extends ItemRow { role: 'sent' | 'received' }

export async function getMyProfile(client: PoolClient, accountId: string) {
  const { rows: [profile] } = await client.query<{
    displayName: string; email: string; avatarUrl: string | null;
  }>(`
    SELECT display_name AS "displayName", email, avatar_url AS "avatarUrl"
    FROM accounts WHERE id = $1
  `, [accountId]);
  if (!profile) throw new Error('Profile unavailable');
  return profile;
}

async function readBoundary(client: PoolClient, accountId: string, tab: Tab, query: URLSearchParams) {
  const cursors = query.getAll('cursor');
  if (cursors.length === 0) return null;
  const [cursor] = cursors;
  if (cursors.length !== 1 || !/^[A-Za-z0-9_-]{43}$/u.test(cursor)) {
    throw new InvalidRead('INVALID_CURSOR');
  }
  const { rows: [boundary] } = await client.query<Boundary>(`
    SELECT boundary_at::text AS at, boundary_id AS id FROM my_area_cursors
    WHERE token_hash = $1 AND account_id = $2 AND tab = $3 AND expires_at > clock_timestamp()
  `, [cursorHash(cursor), accountId, tab]);
  if (!boundary) throw new InvalidRead('INVALID_CURSOR');
  return boundary;
}

async function issueCursor(client: PoolClient, accountId: string, tab: Tab, boundary: Boundary) {
  const cursor = randomBytes(32).toString('base64url');
  await client.query(`
    INSERT INTO my_area_cursors (token_hash, account_id, tab, boundary_at, boundary_id, expires_at)
    VALUES ($1, $2, $3, $4, $5, clock_timestamp() + interval '24 hours')
  `, [cursorHash(cursor), accountId, tab, boundary.at, boundary.id]);
  return cursor;
}

async function readPosts(client: PoolClient, accountId: string, tab: 'lost' | 'found', boundary: Boundary | null) {
  const { rows } = await client.query<PostRow>(`
    SELECT id, title, status, thumbnail_url, created_at AS occurred_at, created_at::text AS at
    FROM my_area_fixture_posts
    WHERE author_id = $1 AND tab = $2
      AND ($3::timestamptz IS NULL OR (created_at, id) < ($3::timestamptz, $4::uuid))
    ORDER BY created_at DESC, id DESC
    LIMIT 21
  `, [accountId, tab, boundary?.at ?? null, boundary?.id ?? null]);
  return rows;
}

async function readClaims(client: PoolClient, accountId: string, boundary: Boundary | null) {
  const { rows } = await client.query<ClaimRow>(`
    SELECT id, title, status, sent_at AS occurred_at, sent_at::text AS at,
      CASE WHEN sender_id = $1 THEN 'sent' ELSE 'received' END AS role
    FROM my_area_fixture_claims
    WHERE (sender_id = $1 OR post_owner_id = $1)
      AND ($2::timestamptz IS NULL OR (sent_at, id) < ($2::timestamptz, $3::uuid))
    ORDER BY sent_at DESC, id DESC
    LIMIT 21
  `, [accountId, boundary?.at ?? null, boundary?.id ?? null]);
  return rows;
}

async function page<Row extends ItemRow, Item>(
  client: PoolClient, accountId: string, tab: Tab, rows: Row[], publicItem: (row: Row) => Item,
) {
  return {
    tab,
    items: rows.slice(0, 20).map(publicItem),
    nextCursor: rows.length > 20 ? await issueCursor(client, accountId, tab, rows[19]) : null,
  };
}

export async function listMyItems(client: PoolClient, accountId: string, query: URLSearchParams) {
  const tab = readTab(query);
  const boundary = await readBoundary(client, accountId, tab, query);
  if (tab === 'claims') {
    const rows = await readClaims(client, accountId, boundary);
    return page(client, accountId, tab, rows, ({ id, title, status, role, occurred_at }) => ({
      id, title, status, role, sentAt: occurred_at.toISOString(),
    }));
  }
  const rows = await readPosts(client, accountId, tab, boundary);
  return page(client, accountId, tab, rows, ({ id, title, status, occurred_at, thumbnail_url }) => ({
    id, title, status, postedAt: occurred_at.toISOString(),
    ...(thumbnail_url === null ? {} : { thumbnailUrl: thumbnail_url }),
  }));
}
