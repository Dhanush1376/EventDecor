import RefreshToken from '../models/RefreshToken';
import OtpVerification from '../models/OtpVerification';
import UsedRefreshToken from '../models/UsedRefreshToken';
import FailedLoginAttempt from '../models/FailedLoginAttempt';

const hasTtlOnExpiresAt = (indexes: [Record<string, number>, { expireAfterSeconds?: number }][]) =>
  indexes.some(
    ([keys, opts]) =>
      keys.expiresAt === 1 && opts?.expireAfterSeconds === 0
  );

describe('MongoDB TTL indexes (auto-expire ephemeral documents)', () => {
  it('RefreshToken expiresAt TTL', () => {
    expect(hasTtlOnExpiresAt(RefreshToken.schema.indexes())).toBe(true);
  });

  it('OtpVerification expiresAt TTL', () => {
    expect(hasTtlOnExpiresAt(OtpVerification.schema.indexes())).toBe(true);
  });

  it('UsedRefreshToken expiresAt TTL', () => {
    expect(hasTtlOnExpiresAt(UsedRefreshToken.schema.indexes())).toBe(true);
  });

  it('FailedLoginAttempt expiresAt TTL', () => {
    expect(hasTtlOnExpiresAt(FailedLoginAttempt.schema.indexes())).toBe(true);
  });
});
