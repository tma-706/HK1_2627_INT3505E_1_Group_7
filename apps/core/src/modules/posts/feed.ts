import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Pool } from 'pg';

interface FeedQuery {
  q?: string;
  type?: 'lost' | 'found';
  categoryId?: string;
  areaId?: string;
  from?: string;
  to?: string;
  sort?: 'newest';
  cursor?: string;
  limit: number;
}

interface FeedRow {
  postId: string;
  type: 'lost' | 'found';
  title: string;
  description: string;
  categoryId: string;
  areaId: string;
  occurredAt: Date;
  publishedAt: Date;
  status: 'open';
  visibility: 'visible';
  author: { displayName: string };
  shareUrl: string;
  custody: string | null;
}

const nonempty = { type: 'string', minLength: 1 };
const dateTime = { type: 'string', format: 'date-time' };

function problem(reply: FastifyReply, status: 400 | 503) {
  const [slug, code, title] = status === 400
    ? ['invalid-request', 'INVALID_REQUEST', 'Tham số hoặc dữ liệu gửi lên không hợp lệ.']
    : ['service-unavailable', 'SERVICE_UNAVAILABLE', 'Dịch vụ hoặc phụ thuộc tạm thời không khả dụng.'];
  return reply.code(status).type('application/problem+json').send({
    type: 'urn:campus-lost-found:problem:' + slug, title, status, code,
  });
}

export function registerPosts(app: FastifyInstance, db: Pool, cursorSecret: string) {
  app.get<{ Querystring: FeedQuery }>('/api/v1/posts', {
    attachValidation: true,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          q: nonempty, categoryId: nonempty, areaId: nonempty,
          type: { type: 'string', enum: ['lost', 'found'] },
          from: dateTime, to: dateTime,
          sort: { type: 'string', enum: ['newest'] },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          cursor: { ...nonempty, maxLength: 2048 },
        },
      },
    },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (request.validationError) return problem(reply, 400);

    const { limit, q, type, categoryId, areaId, from, to, cursor } = request.query;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if ((fromDate && !Number.isFinite(+fromDate)) ||
        (toDate && !Number.isFinite(+toDate)) ||
        (fromDate && toDate && fromDate >= toDate)) {
      return problem(reply, 400);
    }

    // The first slice serves only public data. Every caller uses the same guest scope.
    const scope = JSON.stringify(['guest', q, type, categoryId, areaId, fromDate, toDate, 'newest', limit]);
    const sign = (payload: string) => createHmac('sha256', cursorSecret).update(scope + '.' + payload).digest();
    let after: [string, string] | undefined;
    if (cursor) {
      const [payload, signature, extra] = cursor.split('.');
      if (!payload || !signature || extra !== undefined) return problem(reply, 400);
      const expected = sign(payload);
      const provided = Buffer.from(signature, 'base64url');
      if (provided.length !== expected.length || !timingSafeEqual(provided, expected) ||
          provided.toString('base64url') !== signature) return problem(reply, 400);
      after = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as [string, string];
    }

    try {
      const { rows } = await db.query<FeedRow>(`
        SELECT post_id AS "postId", type, title, description, category_id AS "categoryId",
               area_id AS "areaId", occurred_at AS "occurredAt", published_at AS "publishedAt",
               status, visibility, json_build_object('displayName', author_display_name) AS author,
               share_url AS "shareUrl", custody
        FROM public.posts
        WHERE status = 'open' AND visibility = 'visible'
          AND ($1::text IS NULL OR strpos(lower(title || ' ' || description), lower($1)) > 0)
          AND ($2::text IS NULL OR type = $2)
          AND ($3::text IS NULL OR category_id = $3)
          AND ($4::text IS NULL OR area_id = $4)
          AND ($5::timestamptz IS NULL OR occurred_at >= $5)
          AND ($6::timestamptz IS NULL OR occurred_at < $6)
          AND ($7::timestamptz IS NULL OR (published_at, post_id) < ($7, $8::text))
        ORDER BY published_at DESC, post_id DESC
        LIMIT $9
      `, [q, type, categoryId, areaId, fromDate, toDate, after?.[0], after?.[1], limit + 1]);

      const page = rows.slice(0, limit);
      let nextCursor = null;
      if (rows.length > limit) {
        const last = page[page.length - 1];
        const payload = Buffer.from(JSON.stringify([last.publishedAt, last.postId])).toString('base64url');
        nextCursor = payload + '.' + sign(payload).toString('base64url');
      }
      const items = page.map(({ custody, ...post }) => custody ? { ...post, custody } : post);
      return { items: items.map(post => ({ ...post, photos: [] })), nextCursor };
    } catch {
      request.log.error('Public feed database query failed');
      return problem(reply, 503);
    }
  });
}
