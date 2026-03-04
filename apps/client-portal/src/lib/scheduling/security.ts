import crypto from 'crypto';

const TOKEN_TTL_DAYS = 30;

function getEncryptionSecret(): string {
  const secret = process.env.SCHEDULING_ENCRYPTION_KEY || '';
  if (!secret) {
    throw new Error('Missing SCHEDULING_ENCRYPTION_KEY');
  }
  return secret;
}

function keyFromSecret(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function encryptSensitive(value: string): string {
  const secret = getEncryptionSecret();
  const key = keyFromSecret(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSensitive(value: string): string {
  const secret = getEncryptionSecret();
  const key = keyFromSecret(secret);
  const [ivB64, tagB64, encryptedB64] = value.split('.');
  if (!ivB64 || !tagB64 || !encryptedB64) throw new Error('Invalid encrypted payload format');

  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const encrypted = Buffer.from(encryptedB64, 'base64url');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export interface ManageTokenParts {
  bookingId: string;
  nonce: string;
  token: string;
  hash: string;
  expiresAt: string;
}

export function createManageToken(bookingId: string, ttlDays = TOKEN_TTL_DAYS): ManageTokenParts {
  const nonce = crypto.randomBytes(20).toString('base64url');
  const token = `${bookingId}_${nonce}`;
  const hash = sha256Hex(nonce);
  const expires = new Date();
  expires.setDate(expires.getDate() + ttlDays);

  return {
    bookingId,
    nonce,
    token,
    hash,
    expiresAt: expires.toISOString(),
  };
}

export function parseManageToken(token: string): { bookingId: string; nonce: string } | null {
  const idx = token.indexOf('_');
  if (idx <= 0 || idx === token.length - 1) return null;
  const bookingId = token.slice(0, idx);
  const nonce = token.slice(idx + 1);
  if (!bookingId || !nonce) return null;
  return { bookingId, nonce };
}

export function isManageTokenValid(input: {
  providedNonce: string;
  storedHash: string;
  expiresAt: string;
}): boolean {
  if (!input.storedHash || !input.expiresAt) return false;
  if (new Date(input.expiresAt).getTime() < Date.now()) return false;
  return sha256Hex(input.providedNonce) === input.storedHash;
}

export function createSignedState(payload: Record<string, string>): string {
  const secret = getEncryptionSecret();
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySignedState<T = Record<string, string>>(state: string): T | null {
  const secret = getEncryptionSecret();
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (sig !== expected) return null;

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}
