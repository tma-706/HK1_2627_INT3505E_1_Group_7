export interface CurrentSession {
  accountId: string;
  expiresAt: string;
}
export interface GoogleSession extends CurrentSession {
  sessionToken: string;
}
export interface LoginAttempt {
  idToken: string;
  attemptId: string;
  deviceType: 'android' | 'ios';
}

export class IdentityError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export function requestCore(baseUrl: string | undefined) {
  return async (path: string, method: string, options: {
    token?: string;
    body?: LoginAttempt;
    signal?: AbortSignal;
  }) => {
    const base = baseUrl ? new URL(baseUrl) : undefined;
    if (base?.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
      throw new IdentityError('AUTH_UNAVAILABLE');
    }
    const abort = new AbortController();
    const cancel = () => abort.abort();
    if (options.signal?.aborted) cancel();
    else options.signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, 15_000);
    try {
      const response = await fetch(base.href.replace(/\/$/u, '') + path, {
        method,
        redirect: 'error',
        ...(method === 'GET' ? { cache: 'no-store' } : {}),
        signal: abort.signal,
        headers: options.token ? { Authorization: `Bearer ${options.token}` }
          : options.body ? { 'Content-Type': 'application/json' } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      if (method === 'DELETE' && response.status === 204) return;
      if (method === 'GET' && response.status === 401) throw new IdentityError('SESSION_INVALID');
      if (response.ok && (method === 'DELETE' || response.status !== 200)) {
        throw new IdentityError('AUTH_UNAVAILABLE');
      }
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) {
        const code = typeof body?.code === 'string' ? body.code : 'AUTH_UNAVAILABLE';
        if (response.status === 401 && code === 'SESSION_INVALID') throw new IdentityError(code);
        if (method === 'GET') {
          if (response.status === 400 && code === 'INVALID_CURSOR') throw new IdentityError(code);
          throw new IdentityError('READ_UNAVAILABLE');
        }
        if (response.status === 400 && (code === 'INVALID_REQUEST' || code === 'GOOGLE_TOKEN_REJECTED')) {
          throw new IdentityError(code);
        }
        if (response.status === 409 && code === 'LOGIN_ATTEMPT_CONFLICT') throw new IdentityError(code);
        throw new IdentityError('AUTH_UNAVAILABLE');
      }
      return body;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
    }
  };
}

export function identityApi(baseUrl: string | undefined) {
  const request = requestCore(baseUrl);

  function decodeSession(body: Awaited<ReturnType<typeof request>>): CurrentSession {
    if (typeof body?.accountId !== 'string' || !body.accountId ||
        typeof body.expiresAt !== 'string' || !Number.isFinite(Date.parse(body.expiresAt))) {
      throw new IdentityError('AUTH_UNAVAILABLE');
    }
    return { accountId: body.accountId, expiresAt: body.expiresAt };
  }

  return {
    async create(attempt: LoginAttempt): Promise<GoogleSession> {
      const body = await request('/auth/sessions', 'POST', { body: attempt });
      if (typeof body?.sessionToken !== 'string' || !body.sessionToken) throw new IdentityError('AUTH_UNAVAILABLE');
      return { ...decodeSession(body), sessionToken: body.sessionToken };
    },
    async validate(token: string): Promise<CurrentSession> {
      return decodeSession(await request('/auth/sessions/current/validate', 'POST', { token }));
    },
    async revoke(token: string): Promise<void> {
      const body = await request('/auth/sessions/current', 'DELETE', { token });
      if (body !== undefined) throw new IdentityError('AUTH_UNAVAILABLE');
    },
  };
}
