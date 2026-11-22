import { IdentityError, requestCore } from './identity-api';

export const tabs = ['lost', 'found', 'claims'] as const;
export type Tab = typeof tabs[number];
export interface Profile { displayName: string; email: string; avatarUrl: string | null }
export interface Post { id: string; title: string; status: string; postedAt: string; thumbnailUrl?: string }
export interface Claim { id: string; title: string; status: string; sentAt: string; role: 'sent' | 'received' }
export type Item = Post | Claim;
export interface Page { tab: Tab; items: Item[]; nextCursor: string | null }

export interface MyAreaApi {
  profile(token: string, signal: AbortSignal): Promise<Profile>;
  items(token: string, tab: Tab, cursor: string | null, signal: AbortSignal): Promise<Page>;
}

export function myAreaApi(baseUrl: string | undefined): MyAreaApi {
  const request = requestCore(baseUrl);
  return {
    async profile(token, signal) {
      const body = await request('/me/profile', 'GET', { token, signal });
      if (typeof body?.displayName !== 'string' || typeof body.email !== 'string' ||
          (body.avatarUrl !== null && typeof body.avatarUrl !== 'string')) {
        throw new IdentityError('READ_UNAVAILABLE');
      }
      return { displayName: body.displayName, email: body.email, avatarUrl: body.avatarUrl };
    },
    async items(token, tab, cursor, signal) {
      const query = new URLSearchParams({ tab });
      if (cursor !== null) query.set('cursor', cursor);
      const body = await request('/me/items?' + query.toString(), 'GET', { token, signal });
      if (body?.tab !== tab || !Array.isArray(body.items) || body.items.length > 20 ||
          (body.nextCursor !== null && (typeof body.nextCursor !== 'string' || !body.nextCursor))) {
        throw new IdentityError('READ_UNAVAILABLE');
      }
      const items = body.items.map((row: unknown): Item => {
        if (!row || typeof row !== 'object') throw new IdentityError('READ_UNAVAILABLE');
        const { id, title, status, postedAt, sentAt, thumbnailUrl, role } = row as Record<string, unknown>;
        if (typeof id !== 'string' || !id || typeof title !== 'string' || typeof status !== 'string') {
          throw new IdentityError('READ_UNAVAILABLE');
        }
        if (tab === 'claims' && typeof sentAt === 'string' && Number.isFinite(Date.parse(sentAt)) &&
            (role === 'sent' || role === 'received')) {
          return { id, title, status, sentAt, role };
        }
        if (tab !== 'claims' && typeof postedAt === 'string' && Number.isFinite(Date.parse(postedAt)) &&
            (thumbnailUrl === undefined || typeof thumbnailUrl === 'string')) {
          return { id, title, status, postedAt, thumbnailUrl };
        }
        throw new IdentityError('READ_UNAVAILABLE');
      });
      return { tab, items, nextCursor: body.nextCursor };
    },
  };
}
