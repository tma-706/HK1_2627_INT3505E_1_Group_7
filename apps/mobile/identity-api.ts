import type { IdentityRequests } from './identity-api.generated';

async function post(path: string, body: object, signal: AbortSignal) {
  const origin = process.env.EXPO_PUBLIC_GATEWAY_URL?.trim().replace(/\/+$/, '');
  if (!origin || !/^https:\/\/[^/?#@]+$/i.test(origin)) throw new Error('Gateway HTTPS chưa được cấu hình.');
  return fetch(`${origin}/api/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, application/problem+json' },
    signal,
    body: JSON.stringify(body),
  });
}

export function register(body: IdentityRequests['registerAccount'], signal: AbortSignal) {
  return post('accounts', body, signal);
}

export function resend(body: IdentityRequests['requestVerificationEmail'], signal: AbortSignal) {
  return post('email-verification-requests', body, signal);
}

export function verify(body: IdentityRequests['verifyAccountEmail'], signal: AbortSignal) {
  return post('email-verifications', body, signal);
}

export function verificationLink(url: string) {
  try {
    const received = new URL(url);
    const expected = new URL(process.env.EXPO_PUBLIC_VERIFICATION_LINK_URL ?? 'campus-lost-found://verify-email');
    if (received.protocol !== expected.protocol || received.host !== expected.host || received.pathname !== expected.pathname
      || received.username || received.password || received.search) return undefined;
    return { token: new URLSearchParams(received.hash.slice(1)).get('token') };
  } catch {
    return undefined;
  }
}
