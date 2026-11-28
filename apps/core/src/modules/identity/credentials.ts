import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const scryptParameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const hashBytes = 32;

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize('NFC'), salt, hashBytes, scryptParameters, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return ['scrypt', '32768', '8', '3', salt.toString('base64url'), key.toString('base64url')].join('$');
}

const fallbackSalt = randomBytes(16);
const fallbackHash = randomBytes(hashBytes);

export async function passwordMatches(password: string, stored: string | undefined) {
  const parts = stored?.split('$');
  const salt = parts ? Buffer.from(parts[4] ?? '', 'base64url') : fallbackSalt;
  const expected = parts ? Buffer.from(parts[5] ?? '', 'base64url') : fallbackHash;
  const usable = parts?.slice(0, 4).join('$') === 'scrypt$32768$8$3'
    && salt.length === 16 && expected.length === hashBytes;
  const key = await deriveKey(password, usable ? salt : fallbackSalt);
  const match = timingSafeEqual(key, usable ? expected : fallbackHash);
  return usable && match;
}

export function loadOutboxKey(value: string | undefined) {
  if (!value || !/^[\da-fA-F]{64}$/.test(value)) {
    throw new Error('LF_IDENTITY_OUTBOX_KEY must contain 32 bytes in hexadecimal');
  }
  return Buffer.from(value, 'hex');
}

export function tokenDigest(token: string) {
  return createHash('sha256').update(token).digest();
}

export function encryptToken(token: string, key: Buffer, eventId: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(eventId));
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

export function decryptToken(envelope: string, key: Buffer, eventId: string) {
  const bytes = Buffer.from(envelope, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(eventId));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
}
