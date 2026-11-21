import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleTokenRejected } from './google.js';
import { LoginAttemptConflict, type LoginRequest, type Sessions } from './sessions.js';

const routes = new Set([
  'POST /auth/sessions',
  'POST /auth/sessions/current/validate',
  'DELETE /auth/sessions/current',
]);
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu;

function send(res: ServerResponse, status: number, body: object): void {
  res.writeHead(status).end(JSON.stringify(body));
}

async function readLogin(req: IncomingMessage): Promise<LoginRequest | null> {
  if (req.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    req.resume();
    return null;
  }

  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    length += chunk.length;
    if (length > 64 * 1024) {
      req.resume();
      return null;
    }
    chunks.push(chunk);
  }

  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value.idToken !== 'string' || !value.idToken ||
        (value.deviceType !== 'ios' && value.deviceType !== 'android') ||
        typeof value.attemptId !== 'string' || !uuid.test(value.attemptId)) {
      return null;
    }
    return { idToken: value.idToken, deviceType: value.deviceType, attemptId: value.attemptId.toLowerCase() };
  } catch {
    return null;
  }
}

export function bearerToken(req: IncomingMessage): string | undefined {
  return /^Bearer +([A-Za-z0-9_-]{43})$/iu.exec(req.headers.authorization ?? '')?.[1];
}

export function sendInvalidSession(res: ServerResponse): void {
  res.setHeader('WWW-Authenticate', 'Bearer');
  send(res, 401, { code: 'SESSION_INVALID' });
}

export async function handleIdentity(
  req: IncomingMessage,
  res: ServerResponse,
  sessions?: Sessions,
): Promise<boolean> {
  const route = `${req.method} ${req.url}`;
  if (!routes.has(route)) return false;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (route === 'POST /auth/sessions') {
      const input = await readLogin(req);
      if (!input) send(res, 400, { code: 'INVALID_REQUEST' });
      else if (!sessions) send(res, 503, { code: 'AUTH_UNAVAILABLE' });
      else send(res, 200, await sessions.create(input));
      return true;
    }

    const bearer = bearerToken(req);
    if (!bearer) sendInvalidSession(res);
    else if (!sessions) send(res, 503, { code: 'AUTH_UNAVAILABLE' });
    else if (route === 'DELETE /auth/sessions/current') {
      if (await sessions.revoke(bearer)) res.writeHead(204).end();
      else sendInvalidSession(res);
    } else {
      const current = await sessions.withCurrentSession(bearer, async () => undefined);
      if (current) send(res, 200, current.session);
      else sendInvalidSession(res);
    }
  } catch (error) {
    if (error instanceof GoogleTokenRejected) send(res, 400, { code: 'GOOGLE_TOKEN_REJECTED' });
    else if (error instanceof LoginAttemptConflict) send(res, 409, { code: 'LOGIN_ATTEMPT_CONFLICT' });
    else send(res, 503, { code: 'AUTH_UNAVAILABLE' });
  }
  return true;
}
