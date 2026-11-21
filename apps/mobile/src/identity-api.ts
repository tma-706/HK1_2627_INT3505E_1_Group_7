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

export function identityApi(baseUrl: string | undefined) {
  async function request(path: string, method: string, options: { token?: string; body?: LoginAttempt }) {
    const base = baseUrl ? new URL(baseUrl) : undefined;
    if (base?.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
      throw new IdentityError('AUTH_UNAVAILABLE');
    }
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 15_000);
    try {
      const response = await fetch(base.href.replace(/\/$/u, '') + path, {
        method,
        redirect: 'error',
        signal: abort.signal,
        headers: options.token ? { Authorization: `Bearer ${options.token}` }
          : options.body ? { 'Content-Type': 'application/json' } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      if (response.status === 204) return;
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new IdentityError(typeof body?.code === 'string' ? body.code : 'AUTH_UNAVAILABLE');
      return body;
    } finally {
      clearTimeout(timer);
    }
  }

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
