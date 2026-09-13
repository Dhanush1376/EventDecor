import '../setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import OtpAuthService from '../../../src/services/OtpAuthService';
import { PhoneAuthService } from '../../../src/services/PhoneAuthService';
import User from '../../../src/models/User';
import AuthIdentity from '../../../src/models/AuthIdentity';
import OtpChallenge from '../../../src/models/OtpChallenge';
import ApiError from '../../../src/utils/ApiError';

vi.mock('../../../src/services/notificationService', () => ({
  sendDirectEmailProcessor: vi.fn().mockResolvedValue(true),
  sendDirectEmail: vi.fn(),
  createAdminNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../src/services/SmsProviderService', () => ({
  default: vi.fn().mockImplementation(() => ({
    sendOtp: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-sms-id' }),
  })),
  getSmsProvider: vi.fn().mockReturnValue({
    sendOtp: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-sms-id' }),
  }),
}));

describe('Customer Account Reuse & Duplicate Prevention Specification', () => {
  const ip = '127.0.0.1';
  const userAgent = 'vitest-agent';

  beforeEach(async () => {
    await User.deleteMany({});
    await AuthIdentity.deleteMany({});
    await OtpChallenge.deleteMany({});

    // Predictable OTP generation
    vi.spyOn(crypto, 'randomInt').mockReturnValue(123456 as any);
  });

  describe('1. Phone Login — Reuse Existing Customer Account', () => {
    it('Existing customer with phone → phone OTP returns the exact same User ID', async () => {
      const canonicalPhone = '+919876543210';
      const existingUser = await User.create({
        phone: canonicalPhone,
        role: 'customer',
        name: 'Alice Phone',
        email: 'alice@example.com',
        cart: [{ quantity: 2, variant: 'Default' }],
        isVerified: true,
        phoneVerified: true,
      });

      await AuthIdentity.create({
        userId: existingUser._id,
        provider: 'phone',
        providerSubjectId: canonicalPhone,
        verifiedAt: new Date(),
      });

      const { challengeId } = await PhoneAuthService.requestOtp('9876543210', ip);
      const session = await PhoneAuthService.authenticateWithPhone(
        challengeId,
        '123456',
        ip,
        userAgent,
      );

      expect(session.user._id.toString()).toBe(existingUser._id.toString());
      expect(session.user.name).toBe('Alice Phone');
      expect(session.user.email).toBe('alice@example.com');

      // Verify no duplicate users created
      const userCount = await User.countDocuments({ phone: canonicalPhone });
      expect(userCount).toBe(1);
    });
  });

  describe('2. Email Login — Reuse Existing Customer Account', () => {
    it('Existing customer with email → email OTP returns the exact same User ID', async () => {
      const cleanEmail = 'customer@example.com';
      const existingUser = await User.create({
        email: cleanEmail,
        role: 'customer',
        name: 'Bob Email',
        phone: '+919123456780',
        cart: [{ quantity: 3, variant: 'Default' }],
        isVerified: true,
        emailVerified: true,
      });

      await AuthIdentity.create({
        userId: existingUser._id,
        provider: 'email',
        providerSubjectId: cleanEmail,
        verifiedAt: new Date(),
      });

      const { challengeId } = await OtpAuthService.generateOTP(cleanEmail, ip);
      const session = await OtpAuthService.verifyOTP(challengeId, '123456', ip, userAgent);

      expect(session.user._id.toString()).toBe(existingUser._id.toString());
      expect(session.user.name).toBe('Bob Email');
      expect(session.user.phone).toBe('+919123456780');

      // Verify no duplicate users created
      const userCount = await User.countDocuments({ email: cleanEmail });
      expect(userCount).toBe(1);
    });
  });

  describe('3. Dual-Credential Convergence (Phone + Email)', () => {
    it('Customer with both phone and email returns the exact same User ID via either login method', async () => {
      const canonicalPhone = '+919876543210';
      const cleanEmail = 'shared@example.com';

      // Seed account ABC123
      const userABC = await User.create({
        phone: canonicalPhone,
        email: cleanEmail,
        name: 'Shared Identity Customer',
        role: 'customer',
        isVerified: true,
        phoneVerified: true,
        emailVerified: true,
        wishlist: [],
      });

      await AuthIdentity.create([
        {
          userId: userABC._id,
          provider: 'phone',
          providerSubjectId: canonicalPhone,
          verifiedAt: new Date(),
        },
        {
          userId: userABC._id,
          provider: 'email',
          providerSubjectId: cleanEmail,
          verifiedAt: new Date(),
        },
      ]);

      // 1. Login via Phone OTP
      const phoneChallenge = await PhoneAuthService.requestOtp(canonicalPhone, ip);
      const phoneSession = await PhoneAuthService.authenticateWithPhone(
        phoneChallenge.challengeId,
        '123456',
        ip,
        userAgent,
      );
      expect(phoneSession.user._id.toString()).toBe(userABC._id.toString());

      // 2. Login via Email OTP
      const emailChallenge = await OtpAuthService.generateOTP(cleanEmail, ip);
      const emailSession = await OtpAuthService.verifyOTP(
        emailChallenge.challengeId,
        '123456',
        ip,
        userAgent,
      );
      expect(emailSession.user._id.toString()).toBe(userABC._id.toString());

      // Total user count must strictly remain 1
      const totalUsers = await User.countDocuments({});
      expect(totalUsers).toBe(1);
    });
  });

  describe('4. Name Prompt Conditional Display', () => {
    it('Existing customer with name → user.name intact (frontend skips prompt)', async () => {
      const existingUser = await User.create({
        phone: '+919876543210',
        name: 'Pre-existing Name',
        role: 'customer',
        isVerified: true,
      });

      const { challengeId } = await PhoneAuthService.requestOtp('+919876543210', ip);
      const session = await PhoneAuthService.authenticateWithPhone(
        challengeId,
        '123456',
        ip,
        userAgent,
      );

      expect(session.user._id.toString()).toBe(existingUser._id.toString());
      expect(session.user.name).toBe('Pre-existing Name');
      expect(session.user.name.trim()).not.toBe('');
    });

    it('Existing customer without name → user.name is empty (frontend displays prompt once)', async () => {
      const existingUser = await User.create({
        phone: '+919876543210',
        name: '',
        role: 'customer',
        isVerified: true,
      });

      const { challengeId } = await PhoneAuthService.requestOtp('+919876543210', ip);
      const session = await PhoneAuthService.authenticateWithPhone(
        challengeId,
        '123456',
        ip,
        userAgent,
      );

      expect(session.user._id.toString()).toBe(existingUser._id.toString());
      expect(session.user.name).toBe('');
    });
  });

  describe('5. Conflicting Accounts Protection (No Silent Merge)', () => {
    it('Phone belongs to User A and email belongs to User B → no automatic merge occurs', async () => {
      const phoneA = '+919876543210';
      const emailB = 'customerb@example.com';

      const userA = await User.create({
        phone: phoneA,
        name: 'User A',
        role: 'customer',
        isVerified: true,
      });
      await AuthIdentity.create({
        userId: userA._id,
        provider: 'phone',
        providerSubjectId: phoneA,
      });

      const userB = await User.create({
        email: emailB,
        name: 'User B',
        role: 'customer',
        isVerified: true,
      });
      await AuthIdentity.create({
        userId: userB._id,
        provider: 'email',
        providerSubjectId: emailB,
      });

      // Login with phone -> resolves to User A
      const phoneChallenge = await PhoneAuthService.requestOtp(phoneA, ip);
      const phoneSession = await PhoneAuthService.authenticateWithPhone(
        phoneChallenge.challengeId,
        '123456',
        ip,
        userAgent,
      );
      expect(phoneSession.user._id.toString()).toBe(userA._id.toString());

      // Login with email -> resolves to User B
      const emailChallenge = await OtpAuthService.generateOTP(emailB, ip);
      const emailSession = await OtpAuthService.verifyOTP(
        emailChallenge.challengeId,
        '123456',
        ip,
        userAgent,
      );
      expect(emailSession.user._id.toString()).toBe(userB._id.toString());

      // Both accounts remain distinct
      const refreshA = await User.findById(userA._id);
      const refreshB = await User.findById(userB._id);
      expect(refreshA?.phone).toBe(phoneA);
      expect(refreshA?.email).toBeUndefined();
      expect(refreshB?.email).toBe(emailB);
      expect(refreshB?.phone).toBeUndefined();
      expect(await User.countDocuments({})).toBe(2);
    });
  });

  describe('6. Repeated Logins (Duplicate Prevention)', () => {
    it('Repeated phone login → never creates duplicate User', async () => {
      const phone = '9876543210';
      let firstUserId: string | null = null;

      for (let i = 0; i < 3; i++) {
        await OtpChallenge.deleteMany({ identifier: '+919876543210' });

        const { challengeId } = await PhoneAuthService.requestOtp(phone, ip);
        const session = await PhoneAuthService.authenticateWithPhone(
          challengeId,
          '123456',
          ip,
          userAgent,
        );
        expect(session.user).toBeDefined();
        if (!firstUserId) {
          firstUserId = session.user._id.toString();
        } else {
          expect(session.user._id.toString()).toBe(firstUserId);
        }
      }

      const count = await User.countDocuments({ phone: '+919876543210' });
      expect(count).toBe(1);
    });

    it('Repeated email login → never creates duplicate User', async () => {
      const email = 'repeat@example.com';

      for (let i = 0; i < 3; i++) {
        const { challengeId } = await OtpAuthService.generateOTP(email, ip);
        const session = await OtpAuthService.verifyOTP(challengeId, '123456', ip, userAgent);
        expect(session.user).toBeDefined();
      }

      const count = await User.countDocuments({ email });
      expect(count).toBe(1);
    });
  });

  describe('7. Phone Canonicalization & Legacy Migration', () => {
    it('Phone formatting differences (10-digit vs +91 E.164) resolve to same account and migrate phone to canonical format', async () => {
      // Seed legacy 10-digit phone
      const legacyUser = await User.create({
        phone: '9876543210',
        name: 'Legacy Customer',
        role: 'customer',
        isVerified: true,
      });

      // Login using formatted string: '+91 98765 43210'
      const { challengeId } = await PhoneAuthService.requestOtp('+91 98765 43210', ip);
      const session = await PhoneAuthService.authenticateWithPhone(
        challengeId,
        '123456',
        ip,
        userAgent,
      );

      // Reused existing user
      expect(session.user._id.toString()).toBe(legacyUser._id.toString());

      // Migrated to canonical E.164 in database
      const updatedUser = await User.findById(legacyUser._id);
      expect(updatedUser?.phone).toBe('+919876543210');

      // Canonical AuthIdentity created
      const identity = await AuthIdentity.findOne({
        provider: 'phone',
        providerSubjectId: '+919876543210',
      });
      expect(identity).toBeDefined();
      expect(identity?.userId.toString()).toBe(legacyUser._id.toString());

      // No duplicates created
      expect(await User.countDocuments({})).toBe(1);
    });
  });

  describe('8. Admin/Staff Isolation', () => {
    it('Customer phone login matching an admin/staff record rejects with 403 and does not authenticate as admin', async () => {
      const adminPhone = '+919876543210';
      const adminUser = await User.create({
        phone: adminPhone,
        role: 'admin',
        name: 'System Admin',
        email: 'admin@siriarts.com',
        isVerified: true,
      });

      const { challengeId } = await PhoneAuthService.requestOtp(adminPhone, ip);

      try {
        await PhoneAuthService.authenticateWithPhone(challengeId, '123456', ip, userAgent);
        expect.unreachable('Should have thrown 403');
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toContain('Administrative accounts must sign in via the Admin Portal');
      }

      // Ensure admin user role was not downgraded or modified
      const refetchedAdmin = await User.findById(adminUser._id);
      expect(refetchedAdmin?.role).toBe('admin');
    });

    it('Customer email login matching an admin/staff record rejects with 403', async () => {
      const adminEmail = 'owner@siriarts.com';
      await User.create({
        email: adminEmail,
        role: 'owner',
        name: 'Store Owner',
        isVerified: true,
      });

      const { challengeId } = await OtpAuthService.generateOTP(adminEmail, ip);

      try {
        await OtpAuthService.verifyOTP(challengeId, '123456', ip, userAgent);
        expect.unreachable('Should have thrown 403');
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toContain('Administrative accounts must sign in via the Admin Portal');
      }
    });
  });

  describe('9. Concurrent Account-Creation Race Safety', () => {
    it('Simultaneous OTP verification requests for the same new phone recover gracefully and create exactly 1 user', async () => {
      const phone = '9991112223';
      const { challengeId } = await PhoneAuthService.requestOtp(phone, ip);

      // Simulate 4 simultaneous verification calls for the same challenge
      // In a real environment, network or client race could trigger rapid clicks
      const results = await Promise.allSettled(
        Array.from({ length: 4 }).map(() =>
          PhoneAuthService.authenticateWithPhone(challengeId, '123456', ip, userAgent),
        ),
      );

      // At least one request must succeed
      const successful = results.filter((r) => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThanOrEqual(1);

      // Verify that all successful results return the exact same user ID
      const userIds = successful.map((r: any) => r.value.user._id.toString());
      const uniqueUserIds = [...new Set(userIds)];
      expect(uniqueUserIds.length).toBe(1);

      // In the database, exactly ONE user exists
      const totalCreated = await User.countDocuments({ phone: '+919991112223' });
      expect(totalCreated).toBe(1);
    });
  });
});
