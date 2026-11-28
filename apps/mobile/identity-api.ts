import type { PublicPost } from '@lost-found/public-feed';
import type { IdentityRequests, PasswordSession } from './identity-api.generated';

function gateway(path: string) {
  const origin = process.env.EXPO_PUBLIC_GATEWAY_URL?.trim().replace(/\/+$/, '');
  if (!origin || !/^https:\/\/[^/?#@]+$/i.test(origin)) throw new Error('Gateway HTTPS chưa được cấu hình.');
  return `${origin}/api/v1/${path}`;
}

async function post(path: string, body: object, signal: AbortSignal) {
  return fetch(gateway(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, application/problem+json' },
    signal,
    body: JSON.stringify(body),
  });
}

export async function login(body: IdentityRequests['createPasswordSession'], signal: AbortSignal) {
  const response = await post('auth/sessions', body, signal);
  const retryAfter = Number(response.headers.get('Retry-After'));
  if (response.status !== 200) return { response, retryAfter };
  const session: PasswordSession = await response.json();
  if (!session || typeof session.accountId !== 'string' || !session.accountId
    || (session.role !== 'member' && session.role !== 'admin')
    || typeof session.accessToken !== 'string' || !/^[a-zA-Z0-9_-]{43}$/.test(session.accessToken)
    || session.tokenType !== 'Bearer' || typeof session.expiresAt !== 'string'
    || !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= Date.now()) {
    throw new Error('Phiên đăng nhập không hợp lệ.');
  }
  return { response, retryAfter, session };
}

export async function revoke(accessToken: string, signal: AbortSignal) {
  return fetch(gateway('auth/sessions/current'), {
    method: 'DELETE', signal, headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function loadPost(postId: string, accessToken: string | undefined, signal: AbortSignal) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(gateway(`posts/${encodeURIComponent(postId)}`), { headers, signal });
  if (response.status === 404) return null;
  if (response.status !== 200) throw new Error('Chưa tải được bài.');
  const post: PublicPost = await response.json();
  if (!post || post.postId !== postId || (post.type !== 'lost' && post.type !== 'found')
    || post.status !== 'open' || post.visibility !== 'visible') throw new Error('Chi tiết bài không hợp lệ.');
  return post;
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

export function requestPasswordReset(body: IdentityRequests['requestPasswordReset'], signal: AbortSignal) {
  return post('password-reset-requests', body, signal);
}

export function resetPassword(body: IdentityRequests['resetPassword'], signal: AbortSignal) {
  return post('password-resets', body, signal);
}

function readIdentityLink(url: string, destination: string) {
  try {
    const received = new URL(url);
    const expected = new URL(destination);
    if (received.protocol !== expected.protocol || received.host !== expected.host || received.pathname !== expected.pathname
      || received.username || received.password || received.search) return undefined;
    return { token: new URLSearchParams(received.hash.slice(1)).get('token') };
  } catch {
    return undefined;
  }
}

export function verificationLink(url: string) {
  return readIdentityLink(url, process.env.EXPO_PUBLIC_VERIFICATION_LINK_URL ?? 'campus-lost-found://verify-email');
}

export function passwordResetLink(url: string) {
  return readIdentityLink(url, process.env.EXPO_PUBLIC_PASSWORD_RESET_LINK_URL ?? 'campus-lost-found://reset-password');
}
