import '../setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

import OtpAuthService from '../../../src/services/OtpAuthService';
import { PhoneAuthService } from '../../../src/services/PhoneAuthService';
import { AccountLinkingService } from '../../../src/services/AccountLinkingService';
import User from '../../../src/models/User';
import AuthIdentity from '../../../src/models/AuthIdentity';
import OtpChallenge from '../../../src/models/OtpChallenge';

vi.mock('../../../src/services/notificationService', () => ({
  sendDirectEmailProcessor: vi.fn().mockResolvedValue(true),
  sendDirectEmail: vi.fn(),
  createAdminNotification: vi.fn(),
}));

vi.mock('../../../src/services/SmsProviderService', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      sendOtp: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-id' }),
    })),
    getSmsProvider: vi.fn().mockReturnValue({
      sendOtp: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-id' }),
    }),
  };
});

describe('Phase 6: OTP Security Tests (Integration)', () => {
  const ip = '127.0.0.1';
  const userAgent = 'vitest';

  beforeEach(async () => {
    await User.deleteMany({});
    await AuthIdentity.deleteMany({});
    await OtpChallenge.deleteMany({});

    vi.spyOn(crypto, 'randomInt').mockReturnValue(123456 as any);
  });

  it('OTP Replay: Consuming the exact same challengeId and OTP twice must fail on the second attempt', async () => {
    const phone = '9998887776';
    const { challengeId } = await PhoneAuthService.requestOtp(phone, ip);

    // First attempt -> SUCCESS
    const session1 = await PhoneAuthService.authenticateWithPhone(
      challengeId,
      '123456',
      ip,
      userAgent,
    );
    expect(session1).toBeDefined();

    // Second attempt -> MUST FAIL (400 or 401)
    await expect(
      PhoneAuthService.authenticateWithPhone(challengeId, '123456', ip, userAgent),
    ).rejects.toThrow(/expired|invalid/i);
  });

  it('OTP Expiry: Attempting to verify an OTP after expiresAt must fail', async () => {
    const phone = '9998887776';
    const { challengeId } = await PhoneAuthService.requestOtp(phone, ip);

    // Fast-forward expiresAt to the past
    await OtpChallenge.updateOne(
      { challengeId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    await expect(
      PhoneAuthService.authenticateWithPhone(challengeId, '123456', ip, userAgent),
    ).rejects.toThrow(/expired|invalid/i);
  });

  it('OTP Exhaustion: Providing the wrong OTP 5 times must exhaust the challenge', async () => {
    const email = 'exhaustion@example.com';
    const { challengeId } = await OtpAuthService.generateOTP(email, ip);

    // Fail 5 times
    for (let i = 0; i < 5; i++) {
      await expect(
        OtpAuthService.verifyOTP(challengeId, '000000', ip, userAgent),
      ).rejects.toThrow();
    }

    const challenge = await OtpChallenge.findOne({ challengeId });
    expect(challenge?.exhausted).toBe(true);

    // 6th attempt with CORRECT OTP -> MUST FAIL because it's exhausted
    await expect(OtpAuthService.verifyOTP(challengeId, '123456', ip, userAgent)).rejects.toThrow(
      /expired|invalid|exceeded|restricted|many/i,
    );
  });

  it('Challenge Isolation: Cannot use LINK_PHONE challenge for AUTHENTICATE_PHONE', async () => {
    const user = await User.create({
      email: 'isolation@example.com',
      isVerified: true,
      role: 'customer',
    });

    // Generate a LINK_PHONE challenge
    const { challengeId } = await AccountLinkingService.requestPhoneLink(
      user._id.toString(),
      '9876543210',
      new Date(),
      ip,
    );

    // Attempt to use it for LOGIN/AUTHENTICATE
    await expect(
      PhoneAuthService.authenticateWithPhone(challengeId, '123456', ip, userAgent),
    ).rejects.toThrow(/expired|invalid/i);
  });

  it('Anti-Enumeration: Existing vs Non-existing phone responses must be identical', async () => {
    const existingPhone = '9876543211';
    const nonExistingPhone = '9876543212';

    await User.create({ phone: '+919876543211', isVerified: true, role: 'customer' });

    const res1 = await PhoneAuthService.requestOtp(existingPhone, ip);
    const res2 = await PhoneAuthService.requestOtp(nonExistingPhone, ip);

    expect(res1).toHaveProperty('challengeId');
    expect(res2).toHaveProperty('challengeId');
    expect((res1 as any).user).toBeUndefined();
    expect((res2 as any).user).toBeUndefined();
  });
});
