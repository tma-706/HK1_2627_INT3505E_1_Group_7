import type { IncomingMessage, ServerResponse } from 'node:http';
import { bearerToken, sendInvalidSession } from '../identity/routes.js';
import type { Sessions } from '../identity/sessions.js';
import { getMyProfile, InvalidRead, listMyItems } from './reads.js';

export async function handleMyArea(req: IncomingMessage, res: ServerResponse, sessions?: Sessions) {
  const url = req.url ?? '';
  const queryStart = url.indexOf('?');
  const path = queryStart === -1 ? url : url.slice(0, queryStart);
  if (req.method !== 'GET' || (path !== '/me/profile' && path !== '/me/items')) return false;

  const started = performance.now();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const send = (status: number, body: object) => {
    res.setHeader('Server-Timing', `core;dur=${(performance.now() - started).toFixed(1)}`);
    res.writeHead(status).end(JSON.stringify(body));
  };
  const bearer = bearerToken(req);
  if (!bearer) {
    sendInvalidSession(res);
    return true;
  }
  if (!sessions) {
    send(503, { code: 'READ_UNAVAILABLE' });
    return true;
  }

  try {
    const result = await sessions.withCurrentSession<object>(bearer, (client, accountId) =>
      path === '/me/profile'
        ? getMyProfile(client, accountId)
        : listMyItems(client, accountId, new URLSearchParams(queryStart === -1 ? '' : url.slice(queryStart + 1))),
    );
    if (result) send(200, result.result);
    else sendInvalidSession(res);
  } catch (error) {
    if (error instanceof InvalidRead) send(400, { code: error.code });
    else send(503, { code: 'READ_UNAVAILABLE' });
  }
  return true;
}
