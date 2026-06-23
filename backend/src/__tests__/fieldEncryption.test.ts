import { decryptField, encryptField } from '../utils/security/fieldEncryption';

describe('fieldEncryption', () => {
  const prev = process.env.JWT_SECRET;
  beforeAll(() => {
    process.env.JWT_SECRET = 'test_encryption_secret_must_be_32_chars_minimum';
  });
  afterAll(() => {
    process.env.JWT_SECRET = prev;
  });

  it('round-trips TOTP secrets', () => {
    const plain = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptField(plain);
    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toBe(plain);
    expect(decryptField(encrypted)).toBe(plain);
  });

  it('returns legacy plaintext when not encrypted', () => {
    expect(decryptField('legacy-plain-secret')).toBe('legacy-plain-secret');
  });
});
