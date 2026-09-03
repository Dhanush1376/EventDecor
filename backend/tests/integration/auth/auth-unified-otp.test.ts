import '../setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

import OtpAuthService from '../../../src/services/OtpAuthService';
import { PhoneAuthService } from '../../../src/services/PhoneAuthService';
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
    getSmsProvider: vi.fn().mockReturnValue({
      sendOtp: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-id' }),
    }),
  };
});

describe('Unified OTP Authentication Integration Tests', () => {
  const ip = '127.0.0.1';
  const userAgent = 'vitest';

  beforeEach(async () => {
    await User.deleteMany({});
    await AuthIdentity.deleteMany({});
    await OtpChallenge.deleteMany({});

    vi.spyOn(crypto, 'randomInt').mockReturnValue(123456 as any);
  });

  describe('Email OTP Flow', () => {
    it('should successfully request and verify an email OTP', async () => {
      const email = 'testuser@example.com';

      const { challengeId } = await OtpAuthService.generateOTP(email, ip);
      expect(challengeId).toBeDefined();

      const challenge = await OtpChallenge.findOne({ challengeId });
      expect(challenge).toBeDefined();
      expect(challenge?.identifier).toBe(email);

      const session = await OtpAuthService.verifyOTP(challengeId, '123456', ip, userAgent);
      expect(session).toBeDefined();
      expect(session.accessToken).toBeDefined();
      expect(session.refreshToken).toBeDefined();

      // Check if user and identity were created
      const user = await User.findOne({ _id: session.user._id });
      expect(user).toBeDefined();

      const identity = await AuthIdentity.findOne({ userId: user?._id });
      expect(identity).toBeDefined();
      expect(identity?.provider).toBe('email');
    });
  });

  describe('Phone OTP Flow', () => {
    it('should successfully request and verify a phone OTP', async () => {
      const phone = '9998887776';

      const { challengeId } = await PhoneAuthService.requestOtp(phone, ip);
      expect(challengeId).toBeDefined();

      const challenge = await OtpChallenge.findOne({ challengeId });
      expect(challenge).toBeDefined();
      expect(challenge?.identifier).toBe('+919998887776');

      const session = await PhoneAuthService.authenticateWithPhone(
        challengeId,
        '123456',
        ip,
        userAgent,
      );
      expect(session).toBeDefined();
      expect(session.accessToken).toBeDefined();
      expect(session.refreshToken).toBeDefined();

      // Check if user and identity were created
      const user = await User.findOne({ _id: session.user._id });
      expect(user).toBeDefined();

      const identity = await AuthIdentity.findOne({ userId: user?._id });
      expect(identity).toBeDefined();
      expect(identity?.provider).toBe('phone');
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('Concurrent verifications for same challenge should result in exactly 1 success', async () => {
      const phone = '9998887771';
      const { challengeId } = await PhoneAuthService.requestOtp(phone, ip);

      // Simulate 5 concurrent clicks on the "Verify" button
      const promises = Array.from({ length: 5 }).map(
        () =>
          PhoneAuthService.authenticateWithPhone(challengeId, '123456', ip, userAgent).catch(
            (err) => err,
          ), // Catch errors to allow Promise.all to finish
      );

      const results = await Promise.all(promises);

      const successes = results.filter((r) => r && r.accessToken);
      const errors = results.filter((r) => r instanceof Error);

      expect(successes.length).toBe(1);
      expect(errors.length).toBe(4);
    });

    it('Concurrent requests for duplicate account creation should create exactly 1 user', async () => {
      const phone = '9998887772';
      const { challengeId } = await PhoneAuthService.requestOtp(phone, ip);

      // Generate multiple valid challenges manually to simulate different browser sessions trying to create the same account
      const challengeId2 = crypto.randomUUID();
      await OtpChallenge.create({
        challengeId: challengeId2,
        purpose: 'AUTHENTICATE_PHONE',
        identifier: '+919998887772',
        identifierType: 'phone',
        otpHash: (await OtpChallenge.findOne({ challengeId }))?.otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const promises = [
        PhoneAuthService.authenticateWithPhone(challengeId, '123456', ip, userAgent).catch(
          (err) => err,
        ),
        PhoneAuthService.authenticateWithPhone(challengeId2, '123456', ip, userAgent).catch(
          (err) => err,
        ),
      ];

      const results = await Promise.all(promises);

      const usersCount = await User.countDocuments({ phone: '+919998887772' });
      const identityCount = await AuthIdentity.countDocuments({
        providerSubjectId: '+919998887772',
      });

      expect(usersCount).toBe(1);
      expect(identityCount).toBe(1);
    });
  });
});
