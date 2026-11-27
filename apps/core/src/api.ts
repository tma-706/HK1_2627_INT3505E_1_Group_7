import Fastify from 'fastify';
import pg from 'pg';
import { registerPosts } from './modules/posts/feed.js';

const cursorSecret = process.env.LF_CURSOR_SECRET;
if (!cursorSecret) throw new Error('LF_CURSOR_SECRET is required');

const app = Fastify({
  logger: { serializers: { req: req => ({ method: req.method }) } },
  ajv: { customOptions: { coerceTypes: true } },
});
const db = new pg.Pool({ connectionTimeoutMillis: 1500, query_timeout: 2000, statement_timeout: 1800 });
db.on('error', () => app.log.error('Idle PostgreSQL connection failed'));
app.addHook('onClose', async () => db.end());

app.get('/ready', async (_request, reply) => {
  try {
    await db.query('SELECT 1 FROM public.posts LIMIT 1');
    return { status: 'ready' };
  } catch {
    return reply.code(503).send({ status: 'unavailable' });
  }
});
registerPosts(app, db, cursorSecret);

process.once('SIGTERM', () => void app.close());
process.once('SIGINT', () => void app.close());
await app.listen({ host: '0.0.0.0', port: 4010 });
