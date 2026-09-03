import '../setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

import OtpAuthService from '../../../src/services/OtpAuthService';
import { PhoneAuthService } from '../../../src/services/PhoneAuthService';
import GoogleAuthService from '../../../src/services/GoogleAuthService';
import { AccountLinkingService } from '../../../src/services/AccountLinkingService';
import User from '../../../src/models/User';
import AuthIdentity from '../../../src/models/AuthIdentity';
import OtpChallenge from '../../../src/models/OtpChallenge';

// Mock SMS Provider so we don't actually send SMS
vi.mock('../../../src/services/notificationService', () => ({
  sendDirectEmailProcessor: vi.fn().mockResolvedValue(true),
  sendDirectEmail: vi.fn(),
  createAdminNotification: vi.fn().mockResolvedValue(true),
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

describe('Phase 6: Unified Authentication Flows (Integration)', () => {
  const ip = '127.0.0.1';
  const userAgent = 'vitest';

  beforeEach(async () => {
    await User.deleteMany({});
    await AuthIdentity.deleteMany({});
    await OtpChallenge.deleteMany({});

    // Mock crypto.randomInt to always return 123456 for predictable OTPs
    vi.spyOn(crypto, 'randomInt').mockReturnValue(123456 as any);
  });

  describe('1. Unified Email Authentication Tests', () => {
    it('should complete email requestOtp -> verifyOtp -> session creation for a NEW user', async () => {
      const email = 'newuser@example.com';

      // 1. Request OTP
      const { challengeId } = await OtpAuthService.generateOTP(email, ip);
      expect(challengeId).toBeDefined();

      const challenge = await OtpChallenge.findOne({ challengeId });
      expect(challenge).toBeDefined();
      expect(challenge?.purpose).toBe('AUTHENTICATE_EMAIL');

      // 2. Verify OTP
      const session = await OtpAuthService.verifyOTP(challengeId, '123456', ip, userAgent);
      expect(session).toBeDefined();
      expect(session.accessToken).toBeDefined();
      expect(session.user).toBeDefined();

      // Verify identities created
      const identity = await AuthIdentity.findOne({ provider: 'email', providerSubjectId: email });
      expect(identity).toBeDefined();
      expect(identity?.userId.toString()).toBe(session.user._id.toString());

      const user = await User.findById(session.user._id);
      expect(user?.email).toBe(email);
    });

    it('should complete email requestOtp -> verifyOtp -> session creation for an EXISTING user', async () => {
      const email = 'existing@example.com';

      // Seed an existing user and identity
      const existingUser = await User.create({ email, isVerified: true, role: 'customer' });
      await AuthIdentity.create({
        userId: existingUser._id,
        provider: 'email',
        providerSubjectId: email,
        verifiedAt: new Date(),
      });

      // 1. Request OTP
      const { challengeId } = await OtpAuthService.generateOTP(email, ip);

      // 2. Verify OTP
      const session = await OtpAuthService.verifyOTP(challengeId, '123456', ip, userAgent);
      expect(session.user._id.toString()).toBe(existingUser._id.toString());

      // Verify no duplicate users created
      const count = await User.countDocuments({ email });
      expect(count).toBe(1);
    });
  });

  describe('2. Unified Phone Authentication Tests', () => {
    it('should complete phone requestOtp -> verifyOtp -> session creation for a NEW user', async () => {
      const phone = '9876543210';
      const expectedNormalizedPhone = '+919876543210';

      // 1. Request OTP
      const { challengeId } = await PhoneAuthService.requestOtp(phone, ip);
      expect(challengeId).toBeDefined();

      const challenge = await OtpChallenge.findOne({ challengeId });
      expect(challenge).toBeDefined();
      expect(challenge?.purpose).toBe('AUTHENTICATE_PHONE');

      // 2. Verify OTP
      const session = await PhoneAuthService.authenticateWithPhone(
        challengeId,
        '123456',
        ip,
        userAgent,
      );
      expect(session).toBeDefined();

      // Verify identities created
      const identity = await AuthIdentity.findOne({
        provider: 'phone',
        providerSubjectId: expectedNormalizedPhone,
      });
      expect(identity).toBeDefined();
      expect(identity?.userId.toString()).toBe(session.user._id.toString());

      const user = await User.findById(session.user._id);
      expect(user?.phone).toBe(expectedNormalizedPhone);
      // New phone user has no email! (tests the sparse index)
      expect(user?.email).toBeUndefined();
    });

    it('should complete phone requestOtp -> verifyOtp for an EXISTING user', async () => {
      const phone = '+919999999999';

      const existingUser = await User.create({ phone, isVerified: true, role: 'customer' });
      await AuthIdentity.create({
        userId: existingUser._id,
        provider: 'phone',
        providerSubjectId: phone,
        verifiedAt: new Date(),
      });

      const { challengeId } = await PhoneAuthService.requestOtp('9999999999', ip);
      const session = await PhoneAuthService.authenticateWithPhone(
        challengeId,
        '123456',
        ip,
        userAgent,
      );

      expect(session.user._id.toString()).toBe(existingUser._id.toString());
      const count = await User.countDocuments({ phone });
      expect(count).toBe(1);
    });
  });

  describe('3. Google Authentication Tests', () => {
    const mockGoogleProfile = {
      googleId: 'google-sub-123',
      email: 'googleuser@example.com',
      name: 'Google User',
      picture: 'https://example.com/avatar.jpg',
    };

    beforeEach(() => {
      vi.spyOn(GoogleAuthService, 'verifyIdToken').mockResolvedValue(mockGoogleProfile as any);
    });

    it('should create new account when Google identity is completely new', async () => {
      const session = (await GoogleAuthService.authenticateWithGoogle(
        'fake-token',
        ip,
        userAgent,
      )) as any;
      expect(session.user).toBeDefined();
      expect(session.isNewUser).toBe(true);
      expect(session.user.email).toBe(mockGoogleProfile.email);

      // Verify both Google and Email identities were created transactionally
      const googleId = await AuthIdentity.findOne({
        provider: 'google',
        providerSubjectId: mockGoogleProfile.googleId,
      });
      expect(googleId).toBeDefined();
      expect(googleId?.userId.toString()).toBe(session.user._id.toString());

      const emailId = await AuthIdentity.findOne({
        provider: 'email',
        providerSubjectId: mockGoogleProfile.email,
      });
      expect(emailId).toBeDefined();
      expect(emailId?.userId.toString()).toBe(session.user._id.toString());
    });

    it('should login existing user when Google identity matches', async () => {
      const user = await User.create({ email: mockGoogleProfile.email, isVerified: true });
      await AuthIdentity.create({
        userId: user._id,
        provider: 'google',
        providerSubjectId: mockGoogleProfile.googleId,
        verifiedAt: new Date(),
      });

      const session = (await GoogleAuthService.authenticateWithGoogle(
        'fake-token',
        ip,
        userAgent,
      )) as any;
      expect(session.user._id.toString()).toBe(user._id.toString());
    });

    it('should AUTO-LINK if Google email matches an unlinked account (User requested ecosystem merge)', async () => {
      // User registered with email OTP but NEVER linked Google
      const user = await User.create({ email: mockGoogleProfile.email, isVerified: true });
      await AuthIdentity.create({
        userId: user._id,
        provider: 'email',
        providerSubjectId: mockGoogleProfile.email,
        verifiedAt: new Date(),
      });

      const session = (await GoogleAuthService.authenticateWithGoogle(
        'fake-token',
        ip,
        userAgent,
      )) as any;

      // Must merge! User explicitly requested they should be able to login from OAuth to existing account
      expect(session.user._id.toString()).toBe(user._id.toString());

      // Verify identity was created
      const identity = await AuthIdentity.findOne({ userId: user._id, provider: 'google' });
      expect(identity).toBeTruthy();
    });
  });
});
