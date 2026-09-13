import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { parsePhoneNumberWithError, ParseError } from 'libphonenumber-js';
import mongoose from 'mongoose';
import User from '../models/User';
import AuthIdentity from '../models/AuthIdentity';
import OtpChallenge from '../models/OtpChallenge';
import { getSmsProvider } from './SmsProviderService';
import { SecurityAuditService } from './SecurityAuditService';
import { isAdministrativeRole } from '../config/adminConfig';
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

    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV PHONE OTP] Verification code for ${normalizedPhone}: ${otp}`);
    }

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

    const canonicalPhone = this.normalizePhone(challenge.identifier);
    const rawDigits = canonicalPhone.replace(/\D/g, '').slice(-10);

    const identity = await AuthIdentity.findOne({
      provider: 'phone',
      $or: [{ providerSubjectId: canonicalPhone }, { providerSubjectId: rawDigits }],
    });

    let user;
    let eventType: 'LOGIN_SUCCESS' | 'SIGNUP_SUCCESS' = 'LOGIN_SUCCESS';

    if (identity) {
      user = await User.findById(identity.userId);
      if (!user || user.isDeleted) {
        throw new ApiError(401, 'Authentication failed. Please try again.');
      }
      if (isAdministrativeRole(user.role)) {
        throw new ApiError(403, 'Administrative accounts must sign in via the Admin Portal.');
      }
      // Migrate legacy phone representation to canonical E.164
      if (user.phone !== canonicalPhone) {
        user.phone = canonicalPhone;
      }
      if (!user.phoneVerified) {
        user.phoneVerified = true;
      }
      if (!user.isVerified) {
        user.isVerified = true;
      }
      user.lastLogin = new Date();
      await user.save();

      if (identity.providerSubjectId !== canonicalPhone) {
        identity.providerSubjectId = canonicalPhone;
        await identity.save();
      }
    } else {
      // Check if an existing User already has this phone (legacy or from orders/email)
      const existingUser = await User.findOne({
        $or: [{ phone: canonicalPhone }, { phone: rawDigits }],
        isDeleted: { $ne: true },
      });

      if (existingUser) {
        if (isAdministrativeRole(existingUser.role)) {
          throw new ApiError(403, 'Administrative accounts must sign in via the Admin Portal.');
        }
        user = existingUser;
        // Migrate to canonical E.164
        user.phone = canonicalPhone;
        user.phoneVerified = true;
        if (!user.isVerified) {
          user.isVerified = true;
        }
        user.lastLogin = new Date();
        await user.save();

        await AuthIdentity.findOneAndUpdate(
          { provider: 'phone', providerSubjectId: canonicalPhone },
          { $set: { userId: user._id, verifiedAt: new Date() } },
          { upsert: true, new: true },
        );
        eventType = 'LOGIN_SUCCESS';
      } else {
        eventType = 'SIGNUP_SUCCESS';
        try {
          // Transaction to create new user + identity
          user = await mongoose.connection.transaction(async (txSession) => {
            const newUser = new User({
              phone: canonicalPhone,
              role: 'customer',
              isVerified: true,
              phoneVerified: true,
              name: '', // Empty name prompt will be shown post-login for customers
              wishlist: [],
              cart: [],
              recentlyViewed: [],
              notificationPreferences: { email: true, marketing: true },
              accountPreferences: { theme: 'light', language: 'en' },
              lastLogin: new Date(),
            });
            await newUser.save({ session: txSession });

            await AuthIdentity.create(
              [
                {
                  userId: newUser._id,
                  provider: 'phone',
                  providerSubjectId: canonicalPhone,
                  verifiedAt: new Date(),
                },
              ],
              { session: txSession },
            );

            return newUser;
          });
        } catch (createErr: any) {
          // Concurrent account-creation safety: recover from duplicate key race
          if (
            createErr.code === 11000 ||
            createErr.name === 'MongoServerError' ||
            String(createErr.message || '').includes('E11000')
          ) {
            logger.info(
              `[PhoneAuthService] Concurrent account-creation race detected for ${canonicalPhone}. Recovering existing account...`,
            );
            const recoveredIdentity = await AuthIdentity.findOne({
              provider: 'phone',
              providerSubjectId: canonicalPhone,
            });
            if (recoveredIdentity) {
              const existingRecovered = await User.findById(recoveredIdentity.userId);
              if (existingRecovered && !existingRecovered.isDeleted) {
                if (isAdministrativeRole(existingRecovered.role)) {
                  throw new ApiError(
                    403,
                    'Administrative accounts must sign in via the Admin Portal.',
                  );
                }
                user = existingRecovered;
                user.phoneVerified = true;
                user.lastLogin = new Date();
                await user.save();
                eventType = 'LOGIN_SUCCESS';
              }
            } else {
              const existingRecoveredUser = await User.findOne({
                phone: canonicalPhone,
                isDeleted: { $ne: true },
              });
              if (existingRecoveredUser) {
                if (isAdministrativeRole(existingRecoveredUser.role)) {
                  throw new ApiError(
                    403,
                    'Administrative accounts must sign in via the Admin Portal.',
                  );
                }
                user = existingRecoveredUser;
                user.phoneVerified = true;
                user.lastLogin = new Date();
                await user.save();
                eventType = 'LOGIN_SUCCESS';
              }
            }
          }
          if (!user) {
            throw createErr;
          }
        }
      }
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
      identifier: canonicalPhone,
    });

    return sessionData;
  }
}
