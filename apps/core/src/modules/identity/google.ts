import { createRemoteJWKSet, errors, jwtVerify } from 'jose';

export class GoogleTokenRejected extends Error {}

export interface GoogleIdentity {
  sub: string;
  expiresAt: Date;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export type VerifyGoogleToken = (token: string) => Promise<GoogleIdentity>;

const googleKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
  { timeoutDuration: 5000 },
);

export function verifyGoogleToken(audience: string): VerifyGoogleToken {
  return async (idToken) => {
    const { payload } = await jwtVerify(idToken, googleKeys, {
      algorithms: ['RS256'],
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience,
      requiredClaims: ['sub', 'exp'],
    }).catch((error: unknown) => {
      if (
        error instanceof errors.JWTInvalid ||
        error instanceof errors.JWSInvalid ||
        error instanceof errors.JOSEAlgNotAllowed ||
        error instanceof errors.JWTClaimValidationFailed ||
        error instanceof errors.JWTExpired ||
        error instanceof errors.JWSSignatureVerificationFailed ||
        error instanceof errors.JWKSNoMatchingKey
      ) {
        throw new GoogleTokenRejected();
      }
      throw error;
    });
    if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.exp !== 'number') {
      throw new GoogleTokenRejected();
    }

    // GAP-AUTH-005: the pilot accepts profiles conforming to EI-05.
    if (typeof payload.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(payload.email) ||
        typeof payload.name !== 'string' || !payload.name.trim() || [...payload.name].length > 100) {
      throw new Error('Google profile outside pilot scope');
    }

    let avatarUrl = null;
    if (typeof payload.picture === 'string') {
      const url = URL.parse(payload.picture);
      if (url?.protocol === 'https:' && !url.username && !url.password) avatarUrl = url.href;
    }
    return {
      sub: payload.sub,
      expiresAt: new Date(payload.exp * 1000),
      email: payload.email,
      displayName: payload.name,
      avatarUrl,
    };
  };
}
