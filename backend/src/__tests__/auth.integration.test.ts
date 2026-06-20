import bcrypt from 'bcryptjs';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

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
  let replset: MongoMemoryReplSet;
  let mongoose: any;
  let User: any;
  let OtpVerification: any;
  let OtpRequestLog: any;
  let RefreshToken: any;
  let UsedRefreshToken: any;
  let FailedLoginAttempt: any;
  let OtpAuthService: any;
  let SessionAuthService: any;
  let AdminAuthService: any;

  beforeAll(async () => {
    // Clear Jest module registry to prevent mock pollution from other tests
    jest.resetModules();

    // Dynamically require mongoose AFTER resetModules so it matches the instance used by models
    mongoose = require('mongoose');

    // Setup in-memory MongoDB Replica Set for transactions
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replset.getUri();
    process.env.MONGO_URI = uri;
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    await mongoose.connect(uri);

    // Dynamically require models and services
    User = require('../models/User').default;
    OtpVerification = require('../models/OtpVerification').default;
    OtpRequestLog = require('../models/OtpRequestLog').default;
    RefreshToken = require('../models/RefreshToken').default;
    UsedRefreshToken = require('../models/UsedRefreshToken').default;
    FailedLoginAttempt = require('../models/FailedLoginAttempt').default;
    OtpAuthService = require('../services/OtpAuthService').default;
    SessionAuthService = require('../services/SessionAuthService').default;
    AdminAuthService = require('../services/AdminAuthService').default;
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await replset.stop();
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
      const _otp = await OtpAuthService.generateOTP(email, '127.0.0.1');

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
