import '../setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import mongoose from 'mongoose';

import OtpAuthService from '../../../src/services/OtpAuthService';
import { PhoneAuthService } from '../../../src/services/PhoneAuthService';
import GoogleAuthService from '../../../src/services/GoogleAuthService';
import { AccountLinkingService } from '../../../src/services/AccountLinkingService';
import User from '../../../src/models/User';
import AuthIdentity from '../../../src/models/AuthIdentity';
import OtpChallenge from '../../../src/models/OtpChallenge';

vi.mock('../../../src/services/notificationService', () => ({
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

describe('Phase 6: Auth Concurrency Tests (Integration)', () => {
  const ip = '127.0.0.1';
  const userAgent = 'vitest';

  beforeEach(async () => {
    await User.deleteMany({});
    await AuthIdentity.deleteMany({});
    await OtpChallenge.deleteMany({});

    vi.spyOn(crypto, 'randomInt').mockReturnValue(123456 as any);
  });

  it('Concurrent Verification: Double verifying the same OTP concurrently should result in only one success', async () => {
    const phone = '9998887776';
    const { challengeId } = await PhoneAuthService.requestOtp(phone, ip);

    // Fire 3 concurrent verification requests
    const results = await Promise.allSettled([
      PhoneAuthService.authenticateWithPhone(challengeId, '123456', ip, userAgent),
      PhoneAuthService.authenticateWithPhone(challengeId, '123456', ip, userAgent),
      PhoneAuthService.authenticateWithPhone(challengeId, '123456', ip, userAgent),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    // Due to MongoDB findOneAndUpdate atomic nature in the service (hopefully),
    // only one should succeed!
    // Wait, let's verify if the service uses findOneAndUpdate or findOne + save.
    // If it uses findOne + save, it might have race conditions.
    // However, the test will reveal if it does.

    // Only one should succeed
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(2);
  });

  it('Concurrent Signup: Simulating two concurrent Google signups for the same email', async () => {
    const mockGoogleProfile = {
      googleId: 'google-sub-concurrency',
      email: 'concurrent@example.com',
      name: 'Concurrent User',
      picture: 'https://example.com/avatar.jpg',
    };

    vi.spyOn(GoogleAuthService, 'verifyIdToken').mockResolvedValue(mockGoogleProfile as any);

    const results = await Promise.allSettled([
      GoogleAuthService.authenticateWithGoogle('fake-token-1', ip, userAgent),
      GoogleAuthService.authenticateWithGoogle('fake-token-2', ip, userAgent),
      GoogleAuthService.authenticateWithGoogle('fake-token-3', ip, userAgent),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    // Only one should succeed, others should fail due to MongoDB unique index constraint
    // (provider, providerSubjectId) or email index.

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(2);

    const failedPromises = failures as PromiseRejectedResult[];
    // The failures should be MongoServerError E11000 duplicate key error
    expect(failedPromises[0].reason.name).toBe('MongoServerError');
    expect(failedPromises[0].reason.code).toBe(11000);

    // Verify DB integrity: Only ONE user and ONE identity created
    const userCount = await User.countDocuments({ email: mockGoogleProfile.email });
    expect(userCount).toBe(1);

    const identityCount = await AuthIdentity.countDocuments({
      provider: 'google',
      providerSubjectId: mockGoogleProfile.googleId,
    });
    expect(identityCount).toBe(1);
  });

  it('Account Linking Concurrency: Two concurrent linking attempts should result in only one link', async () => {
    const user1 = await User.create({
      email: 'user1@example.com',
      isVerified: true,
      role: 'customer',
    });
    const user2 = await User.create({
      email: 'user2@example.com',
      isVerified: true,
      role: 'customer',
    });

    const mockGoogleProfile = {
      googleId: 'google-sub-linking',
      email: 'link@example.com',
      name: 'Link User',
      picture: 'https://example.com/avatar.jpg',
    };

    vi.spyOn(GoogleAuthService, 'verifyIdToken').mockResolvedValue(mockGoogleProfile as any);

    // user1 and user2 both try to link the same Google account at the same time
    const results = await Promise.allSettled([
      AccountLinkingService.linkGoogle(user1._id.toString(), 'token', new Date(), ip),
      AccountLinkingService.linkGoogle(user2._id.toString(), 'token', new Date(), ip),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    // One succeeds, one fails with 409
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    const failed = failures[0] as PromiseRejectedResult;
    expect(failed.reason.statusCode).toBe(409); // Conflict ApiError
  });
});
