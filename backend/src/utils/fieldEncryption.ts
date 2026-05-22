import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

const deriveKey = (): Buffer => {
  const raw = process.env.FIELD_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY (or JWT_SECRET ≥32 chars) is required to encrypt sensitive fields at rest'
    );
  }
  return crypto.createHash('sha256').update(raw).digest();
};

export const encryptField = (plaintext: string): string => {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext;

  const iv = crypto.randomBytes(12);
  const key = deriveKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
};

export const decryptField = (stored: string): string => {
  if (!stored) return stored;
  if (!stored.startsWith(PREFIX)) return stored;

  const payload = stored.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) return stored;

  const key = deriveKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivB64, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
};
