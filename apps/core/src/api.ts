import Fastify from 'fastify';
import pg from 'pg';
import { loadOutboxKey } from './modules/identity/credentials.js';
import { registerIdentityRoutes } from './modules/identity/routes.js';
import { createIdentityService } from './modules/identity/service.js';
import { registerMedia } from './modules/media/routes.js';
import { createMediaStorage } from './modules/media/storage.js';
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

const identityPassword = process.env.LF_IDENTITY_DB_PASSWORD;
const identityDb = identityPassword ? new pg.Pool({
  user: 'core_identity', password: identityPassword,
  connectionTimeoutMillis: 1500, query_timeout: 2500, statement_timeout: 2300,
}) : undefined;

if (identityDb) {
  const identity = createIdentityService(identityDb, loadOutboxKey(process.env.LF_IDENTITY_OUTBOX_KEY));
  identityDb.on('error', () => app.log.error('Idle Identity database connection failed'));
  app.addHook('onClose', async () => identityDb.end());
  app.register(scope => registerIdentityRoutes(scope, identity));
}

const media = process.env.LF_S3_ENDPOINT ? createMediaStorage() : undefined;
const mediaDb = media && new pg.Pool({
  connectionTimeoutMillis: 1500, query_timeout: 2000, statement_timeout: 1800,
  user: 'core_media', password: process.env.LF_MEDIA_DB_PASSWORD,
});
if (media && mediaDb) {
  mediaDb.on('error', () => app.log.error('Idle media PostgreSQL connection failed'));
  app.addHook('onClose', async () => {
    media.close();
    await mediaDb.end();
  });
  app.register(scope => registerMedia(scope, mediaDb, media));
}

app.get('/ready', async (_request, reply) => {
  try {
    await Promise.all([
      db.query('SELECT 1 FROM public.posts LIMIT 1'),
      identityDb?.query('SELECT 1 FROM public.identity_email_receipts LIMIT 1'),
      mediaDb?.query('SELECT 1 FROM public.media_uploads LIMIT 1'),
      media?.ready(),
    ]);
    return { status: 'ready' };
  } catch {
    return reply.code(503).send({ status: 'unavailable' });
  }
});
registerPosts(app, db, cursorSecret);

process.once('SIGTERM', () => void app.close());
process.once('SIGINT', () => void app.close());
await app.listen({ host: '0.0.0.0', port: 4010 });
