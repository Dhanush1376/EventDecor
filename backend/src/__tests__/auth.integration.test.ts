import mongoose from 'mongoose';
import User from '../models/User';
import OtpVerification from '../models/OtpVerification';
import OtpRequestLog from '../models/OtpRequestLog';
import RefreshToken from '../models/RefreshToken';
import UsedRefreshToken from '../models/UsedRefreshToken';
import FailedLoginAttempt from '../models/FailedLoginAttempt';
import OtpAuthService from '../services/OtpAuthService';
import SessionAuthService from '../services/SessionAuthService';
import AdminAuthService from '../services/AdminAuthService';
import bcrypt from 'bcryptjs';

// Setup Mock for redis
jest.mock('../utils/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    isReady: true,
  },
  pingRedis: jest.fn().mockResolvedValue(true),
}));

jest.mock('../utils/otpVerifyCache', () => ({
  cacheOtpSession: jest.fn(),
  getCachedOtpSession: jest.fn().mockResolvedValue(null),
}));

describe('Auth Services Integration Tests', () => {
  let testUser: any;

  beforeAll(async () => {
    // Setup in-memory MongoDB or connect to local test DB
    // CRITICAL FIX: Always override MONGO_URI for tests to prevent wiping production data
    // if dotenv loaded the production URI from the .env file.
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/eventdecor_test_auth';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({}, { bypassDestructionGuard: true });
    await OtpVerification.deleteMany({}, { bypassDestructionGuard: true });
    await OtpRequestLog.deleteMany({}, { bypassDestructionGuard: true });
    await RefreshToken.deleteMany({}, { bypassDestructionGuard: true });
    await UsedRefreshToken.deleteMany({}, { bypassDestructionGuard: true });
    await FailedLoginAttempt.deleteMany({}, { bypassDestructionGuard: true });

    testUser = await User.create({
      name: 'Test Auth User',
      email: 'testauth@example.com',
      role: 'customer',
      isVerified: true,
      wishlist: [],
      cart: [],
      recentlyViewed: [],
    });
  });

  describe('OtpAuthService', () => {
    it('should generate an OTP and store it hashed', async () => {
      const email = 'newuser@example.com';
      const otp = await OtpAuthService.generateOTP(email, '127.0.0.1');

      expect(otp).toHaveLength(6);
      const records = await OtpVerification.find({ email });
      expect(records).toHaveLength(1);

      const isMatch = await bcrypt.compare(otp, records[0].otpHash);
      expect(isMatch).toBe(true);
    });

    it('should verify a valid OTP and consume it', async () => {
      const email = 'testauth@example.com';
      const otp = await OtpAuthService.generateOTP(email, '127.0.0.1');

      const result = await OtpAuthService.verifyOTP(email, otp, '127.0.0.1');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');

      // OTP should be consumed
      const remaining = await OtpVerification.find({ email });
      expect(remaining).toHaveLength(0);
    });

    it('should enforce OTP max attempts', async () => {
      const email = 'testauth@example.com';
      const otp = await OtpAuthService.generateOTP(email, '127.0.0.1');

      for (let i = 0; i < 4; i++) {
        await expect(OtpAuthService.verifyOTP(email, '000000', '127.0.0.1')).rejects.toThrow(
          'Invalid or expired OTP',
        );
      }

      await expect(OtpAuthService.verifyOTP(email, '000000', '127.0.0.1')).rejects.toThrow(
        'Max verification attempts exceeded',
      );

      const record = await OtpVerification.findOne({ email });
      expect(record?.exhausted).toBe(true);
    });
  });

  describe('SessionAuthService', () => {
    it('should create and refresh a session correctly', async () => {
      const session = await SessionAuthService.createSession(testUser, 'JestBrowser');
      expect(session.accessToken).toBeDefined();
      expect(session.refreshToken).toBeDefined();

      const refreshed = await SessionAuthService.refreshSession(
        session.refreshToken,
        'JestBrowser',
      );
      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.refreshToken).not.toBe(session.refreshToken);

      // Verify old refresh token is marked as used
      const tokenHash = SessionAuthService.hashRefreshToken(session.refreshToken);
      const used = await UsedRefreshToken.findOne({ tokenHash });
      expect(used).toBeDefined();
    });

    it('should throw an error on refresh token replay', async () => {
      const session = await SessionAuthService.createSession(testUser, 'JestBrowser');
      await SessionAuthService.refreshSession(session.refreshToken, 'JestBrowser');

      // Advance time by 20 seconds to bypass the 15-second grace period
      const originalDateNow = Date.now;
      jest.spyOn(Date, 'now').mockReturnValue(originalDateNow() + 20000);

      try {
        // Attempting to use it again should throw and revoke all
        await expect(
          SessionAuthService.refreshSession(session.refreshToken, 'JestBrowser'),
        ).rejects.toThrow();

        // Check if sessions are revoked
        const remaining = await RefreshToken.find({ userId: testUser._id });
        expect(remaining).toHaveLength(0);
      } finally {
        jest.restoreAllMocks();
      }
    });
  });

  describe('AdminAuthService', () => {
    it('should enforce admin login constraints', async () => {
      await expect(
        AdminAuthService.adminLogin('admin@example.com', 'wrongpassword', '127.0.0.1', 'jest'),
      ).rejects.toThrow(); // Invalid credentials or locked
    });
  });
});
