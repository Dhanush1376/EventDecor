import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { parsePhoneNumberWithError, ParseError } from 'libphonenumber-js';
import mongoose from 'mongoose';
import User from '../models/User';
import AuthIdentity from '../models/AuthIdentity';
import OtpChallenge from '../models/OtpChallenge';
import { getSmsProvider } from './SmsProviderService';
import { SecurityAuditService } from './SecurityAuditService';
import SessionAuthService from './SessionAuthService';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { setTwoFactorPending } from '../utils/security/twoFactorPending';
import { cacheOtpSession } from '../utils/cache/otpVerifyCache';
import {
  isOtpVerifyBlocked,
  recordOtpVerifyFailure,
  checkPhoneOtpSendAllowed,
} from '../utils/security/otpRateLimit';

export class PhoneAuthService {
  static normalizePhone(phone: string, countryCode: any = 'IN'): string {
    try {
      const phoneNumber = parsePhoneNumberWithError(phone, countryCode);
      if (!phoneNumber.isValid()) {
        throw new ApiError(400, 'Invalid phone number format');
      }
      return phoneNumber.format('E.164');
    } catch (error) {
      if (error instanceof ParseError) {
        throw new ApiError(400, `Invalid phone number: ${error.message}`);
      }
      throw new ApiError(400, 'Invalid phone number');
    }
  }

  static async requestOtp(phone: string, ip: string): Promise<{ challengeId: string }> {
    const normalizedPhone = this.normalizePhone(phone);
    const purpose = 'AUTHENTICATE_PHONE';

    // Anti-SMS Bombing Layer 3 & 5 (DB side): Check recent challenges
    const recentChallenge = await OtpChallenge.findOne({
      identifier: normalizedPhone,
      purpose,
      createdAt: { $gt: new Date(Date.now() - 30 * 1000) }, // 30 sec cooldown
    });

    if (recentChallenge) {
      throw new ApiError(429, 'Please wait before requesting another code');
    }

    const isAllowed = await checkPhoneOtpSendAllowed(normalizedPhone);
    if (!isAllowed) {
      throw new ApiError(429, 'Too many SMS requests. Please try again later.');
    }

    const hourlyCount = await OtpChallenge.countDocuments({
      identifier: normalizedPhone,
      purpose,
      createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) }, // 1 hour
    });

    if (hourlyCount >= 5) {
      SecurityAuditService.log({
        eventType: 'SMS_ABUSE_DETECTED',
        success: false,
        ip,
        userAgent: 'unknown',
        identifier: normalizedPhone,
        reason: 'hourly_limit_exceeded',
      });
      throw new ApiError(429, 'Too many requests. Please try again later.');
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 12);
    const challengeId = crypto.randomUUID();

    // Invalidate previous challenges for this identifier/purpose
    await OtpChallenge.updateMany(
      { identifier: normalizedPhone, purpose, exhausted: false, consumedAt: null },
      { $set: { exhausted: true } },
    );

    const otpRecord = await OtpChallenge.create({
      challengeId,
      purpose,
      identifier: normalizedPhone,
      identifierType: 'phone',
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    const smsResult = await getSmsProvider().sendOtp(normalizedPhone, otp);

    if (!smsResult.success) {
      logger.error(`[PhoneAuthService] SMS Dispatch Error: ${smsResult.error}`);
      await OtpChallenge.updateOne({ _id: otpRecord._id }, { $set: { exhausted: true } });
      throw new ApiError(500, 'Failed to send SMS code. Please try again.');
    }

    SecurityAuditService.log({
      eventType: 'OTP_REQUESTED',
      success: true,
      ip,
      userAgent: 'unknown',
      identifier: normalizedPhone,
      challengeId,
    });

    return { challengeId };
  }

  static async authenticateWithPhone(
    challengeId: string,
    otp: string,
    ip: string,
    userAgent: string,
  ): Promise<any> {
    if (await isOtpVerifyBlocked(ip)) {
      throw new ApiError(429, 'Too many failed verification attempts. Please try again later.');
    }

    const challenge = await OtpChallenge.findOneAndUpdate(
      { challengeId },
      { $inc: { attempts: 1 } },
      { new: true },
    );

    if (!challenge || challenge.purpose !== 'AUTHENTICATE_PHONE') {
      throw new ApiError(400, 'Invalid or expired verification code');
    }

    if (challenge.exhausted || challenge.consumedAt || challenge.expiresAt < new Date()) {
      throw new ApiError(400, 'Invalid or expired verification code');
    }

    if (challenge.attempts > challenge.maxAttempts) {
      if (!challenge.exhausted) {
        challenge.exhausted = true;
        await challenge.save();
      }
      SecurityAuditService.log({
        eventType: 'OTP_EXHAUSTED',
        success: false,
        ip,
        userAgent,
        identifier: challenge.identifier,
        challengeId,
        reason: 'max_attempts_reached',
      });
      throw new ApiError(400, 'Too many failed attempts. Please request a new code.');
    }

    const isMatch = await bcrypt.compare(otp, challenge.otpHash);
    if (!isMatch) {
      if (challenge.attempts >= challenge.maxAttempts) {
        challenge.exhausted = true;
        await challenge.save();
      }
      await recordOtpVerifyFailure(ip);
      SecurityAuditService.log({
        eventType: challenge.exhausted ? 'OTP_EXHAUSTED' : 'OTP_FAILED',
        success: false,
        ip,
        userAgent,
        identifier: challenge.identifier,
        challengeId,
        reason: 'invalid_otp',
      });
      throw new ApiError(400, 'Invalid verification code');
    }

    const updated = await OtpChallenge.findOneAndUpdate(
      { _id: challenge._id, consumedAt: null },
      { $set: { consumedAt: new Date() } },
      { new: true },
    );
    if (!updated) {
      throw new ApiError(400, 'This verification code has already been used');
    }

    await OtpChallenge.deleteMany({
      identifier: challenge.identifier,
      purpose: challenge.purpose,
      _id: { $ne: challenge._id },
    });

    SecurityAuditService.log({
      eventType: 'OTP_VERIFIED',
      success: true,
      ip,
      userAgent,
      identifier: challenge.identifier,
      challengeId,
    });

    const normalizedPhone = challenge.identifier;

    const identity = await AuthIdentity.findOne({
      provider: 'phone',
      providerSubjectId: normalizedPhone,
    });

    let user;
    let eventType: 'LOGIN_SUCCESS' | 'SIGNUP_SUCCESS' = 'LOGIN_SUCCESS';

    if (identity) {
      user = await User.findById(identity.userId);
      if (!user || !user.isVerified) {
        throw new ApiError(401, 'Authentication failed. Please try again.');
      }
    } else {
      eventType = 'SIGNUP_SUCCESS';
      // Transaction to create new user + identity
      user = await mongoose.connection.transaction(async (txSession) => {
        const newUser = new User({
          phone: normalizedPhone,
          role: 'customer',
          isVerified: true,
        });
        await newUser.save({ session: txSession });

        await AuthIdentity.create(
          [
            {
              userId: newUser._id,
              provider: 'phone',
              providerSubjectId: normalizedPhone,
              verifiedAt: new Date(),
            },
          ],
          { session: txSession },
        );

        return newUser;
      });
    }

    const userWith2fa = await User.findById(user._id).select('+twoFactorEnabled');
    if (userWith2fa?.twoFactorEnabled) {
      await setTwoFactorPending(user._id.toString());
      const pendingResult = {
        requires2FA: true as const,
        user: userWith2fa.toObject(),
        refreshToken: '',
        accessToken: '',
      };
      await cacheOtpSession(challengeId, 'pending', pendingResult);
      return pendingResult;
    }

    const sessionData = await SessionAuthService.createSession(user, userAgent);
    await cacheOtpSession(challengeId, 'verified', sessionData);

    SecurityAuditService.log({
      userId: user._id.toString(),
      eventType,
      success: true,
      ip,
      userAgent,
      provider: 'phone',
      identifier: normalizedPhone,
    });

    return sessionData;
  }
}
