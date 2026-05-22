import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const decodeBase32 = (input: string): Buffer => {
  const cleaned = input.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const char of cleaned) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
};

const hotp = (secret: Buffer, counter: number): string => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
};

export const generateTotpSecret = (): string => {
  const raw = crypto.randomBytes(20);
  let secret = '';
  for (let i = 0; i < raw.length; i += 5) {
    const block = raw.slice(i, i + 5);
    let buffer = 0;
    let bits = 0;
    for (const byte of block) {
      buffer = (buffer << 8) | byte;
      bits += 8;
    }
    while (bits >= 5) {
      bits -= 5;
      secret += BASE32_ALPHABET[(buffer >> bits) & 31];
    }
  }
  return secret.slice(0, 32);
};

export const buildOtpAuthUrl = (email: string, secret: string): string => {
  const issuer = encodeURIComponent('Siri Arts & Crafts');
  const label = encodeURIComponent(email);
  return `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
};

export const verifyTotpToken = (secret: string, token: string, window = 1): boolean => {
  const normalized = String(token).replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;

  const key = decodeBase32(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);

  for (let w = -window; w <= window; w++) {
    if (hotp(key, counter + w) === normalized) return true;
  }
  return false;
};
