import OtpAuthService from '../services/OtpAuthService';
import User from '../models/User';
import OtpRequestLog from '../models/OtpRequestLog';
import OtpVerification from '../models/OtpVerification';
import FailedLoginAttempt from '../models/FailedLoginAttempt';
import { cacheOtpSession, getCachedOtpSession } from '../utils/otpVerifyCache';
import { recordOtpVerifyFailure } from '../utils/otpRateLimit';
import SessionAuthService from '../services/SessionAuthService';
import bcrypt from 'bcryptjs';

jest.mock('../models/User');
jest.mock('../models/OtpRequestLog');
jest.mock('../models/OtpVerification');
jest.mock('../models/FailedLoginAttempt');
jest.mock('../utils/otpVerifyCache');
jest.mock('../utils/otpRateLimit');
jest.mock('../services/SessionAuthService');
jest.mock('../services/notificationService', () => ({
  sendDirectEmail: jest.fn(),
}));

describe('OtpAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production'; // Test prod behavior
  });

  describe('generateOTP', () => {
    it('throws error if account is locked out', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // Locked for 10m
      (FailedLoginAttempt.findOne as jest.Mock).mockResolvedValue({ lockoutUntil: futureDate });

      await expect(OtpAuthService.generateOTP('test@example.com', '1.1.1.1')).rejects.toThrow(
        /temporarily locked/,
      );
    });

    it('throws error if too many requests from same IP', async () => {
      (FailedLoginAttempt.findOne as jest.Mock).mockResolvedValue(null);
      (OtpRequestLog.countDocuments as jest.Mock).mockResolvedValueOnce(3); // 3 hits from IP

      await expect(OtpAuthService.generateOTP('test@example.com', '1.1.1.1')).rejects.toThrow(
        'Too many OTP requests from this IP. Please try again after 15 minutes.',
      );
    });

    it('generates OTP successfully and creates DB records', async () => {
      (FailedLoginAttempt.findOne as jest.Mock).mockResolvedValue(null);
      (OtpRequestLog.countDocuments as jest.Mock).mockResolvedValue(0);
      (OtpVerification.create as jest.Mock).mockResolvedValue({ createdAt: new Date() });

      const otp = await OtpAuthService.generateOTP('test@example.com', '1.1.1.1');

      expect(otp).toHaveLength(6);
      expect(OtpVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com', exhausted: false, type: 'auth' }),
      );
      expect(OtpRequestLog.create).toHaveBeenCalledWith({
        ip: '1.1.1.1',
        email: 'test@example.com',
        action: 'request',
      });
    });
  });

  describe('verifyOTP', () => {
    it('returns cached session on exact duplicate verify race', async () => {
      const mockCached = { token: 'mockToken' };
      (getCachedOtpSession as jest.Mock).mockResolvedValue(mockCached);

      const result = await OtpAuthService.verifyOTP('test@example.com', '123456');
      expect(result).toBe(mockCached);
      expect(OtpVerification.find).not.toHaveBeenCalled();
    });

    it('throws error on max failed attempts from IP', async () => {
      (getCachedOtpSession as jest.Mock).mockResolvedValue(null);
      (OtpRequestLog.countDocuments as jest.Mock).mockResolvedValueOnce(5);

      await expect(
        OtpAuthService.verifyOTP('test@example.com', '123456', '1.1.1.1'),
      ).rejects.toThrow('Too many failed verification attempts');
    });

    it('throws error if OTP is completely wrong', async () => {
      (getCachedOtpSession as jest.Mock).mockResolvedValue(null);
      (OtpRequestLog.countDocuments as jest.Mock).mockResolvedValue(0);

      const salt = await bcrypt.genSalt(4);
      const hash = await bcrypt.hash('654321', salt); // Different OTP

      (OtpVerification.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: 'record1',
            email: 'test@example.com',
            otpHash: hash,
            attempts: 0,
          },
        ]),
      });

      await expect(
        OtpAuthService.verifyOTP('test@example.com', '123456', '1.1.1.1'),
      ).rejects.toThrow('Invalid or expired OTP');

      expect(OtpRequestLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'verify_fail' }),
      );
      expect(recordOtpVerifyFailure).toHaveBeenCalledWith('1.1.1.1');
    });

    it('consumes OTP and creates session on success', async () => {
      (getCachedOtpSession as jest.Mock).mockResolvedValue(null);
      (OtpRequestLog.countDocuments as jest.Mock).mockResolvedValue(0);

      const otp = '123456';
      const salt = await bcrypt.genSalt(4);
      const hash = await bcrypt.hash(otp, salt);

      (OtpVerification.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: 'record1',
            email: 'test@example.com',
            otpHash: hash,
            attempts: 0,
          },
        ]),
      });

      (OtpVerification.findOneAndDelete as jest.Mock).mockResolvedValue({ attempts: 0 });
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: 'user1',
        email: 'test@example.com',
        save: jest.fn(),
      });
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'user1', twoFactorEnabled: false }),
      });
      (SessionAuthService.createSession as jest.Mock).mockResolvedValue({ token: 'success' });

      const result = await OtpAuthService.verifyOTP('test@example.com', otp, '1.1.1.1', 'JestTest');

      expect(result).toEqual({ token: 'success' });
      expect(SessionAuthService.createSession).toHaveBeenCalled();
      expect(OtpVerification.findOneAndDelete).toHaveBeenCalled();
      expect(cacheOtpSession).toHaveBeenCalled();
    });
  });
});
