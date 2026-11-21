import { createServer } from 'node:http';
import { db } from './db.js';

import { verifyGoogleToken } from './modules/identity/google.js';
import { handleIdentity } from './modules/identity/routes.js';
import { readReplayKeys, Sessions } from './modules/identity/sessions.js';

const { GOOGLE_CLIENT_ID, SESSION_REPLAY_KEY_VERSION, SESSION_REPLAY_KEYS } = process.env;
const sessions = (() => {
  if (!GOOGLE_CLIENT_ID || !SESSION_REPLAY_KEY_VERSION || !SESSION_REPLAY_KEYS) return undefined;
  try {
    return new Sessions(db, verifyGoogleToken(GOOGLE_CLIENT_ID), readReplayKeys(SESSION_REPLAY_KEY_VERSION, SESSION_REPLAY_KEYS));
  } catch {
    console.error('Core session key configuration is invalid');
    return undefined;
  }
})();

const port = Number(process.env.PORT ?? 3000);
createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.url === '/health/ready') {
    try {
      await db.query('SELECT 1');
      res.writeHead(200).end(JSON.stringify({ status: 'ok', database: 'ok' }));
    } catch {
      res.writeHead(503).end(JSON.stringify({ status: 'unavailable', database: 'unavailable' }));
    }
    return;
  }
  if (await handleIdentity(req, res, sessions)) return;
  res.writeHead(404).end(JSON.stringify({ error: 'not_found' }));
}).listen(port, '0.0.0.0', () => console.log(`Core API listening on ${port}`));
