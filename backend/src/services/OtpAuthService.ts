import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import OtpRequestLog from '../models/OtpRequestLog';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import {
  sendDirectEmailProcessor,
  sendDirectEmail,
  createAdminNotification,
} from './notificationService';
import { canonicalizeEmail } from '../utils/email/emailHelper';
import { setTwoFactorPending } from '../utils/security/twoFactorPending';
import OtpChallenge from '../models/OtpChallenge';
import AuthIdentity from '../models/AuthIdentity';
import mongoose from 'mongoose';
import FailedLoginAttempt from '../models/FailedLoginAttempt';
import { cacheOtpSession } from '../utils/cache/otpVerifyCache';
import { recordOtpVerifyFailure } from '../utils/security/otpRateLimit';
import SessionAuthService from './SessionAuthService';
import { getFrontendUrl } from '../utils/getFrontendUrl';
import { getOtpEmailTemplate } from '../utils/email/emailTemplates';
import { SecurityAuditService } from './SecurityAuditService';

class OtpAuthService {
  static normalizeOtpInput(otp: string): string {
    return String(otp || '')
      .replace(/\D/g, '')
      .slice(0, 6);
  }

  static getOtpExpiryMinutes(): number {
    const parsed = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  }

  static async generateOTP(email: string, ip: string = '127.0.0.1') {
    if (!email || !email.includes('@')) {
      throw new ApiError(400, 'A valid email address is required');
    }

    const cleanEmail = canonicalizeEmail(email);

    const lockoutRecord = await FailedLoginAttempt.findOne({ email: cleanEmail });
    if (lockoutRecord && lockoutRecord.lockoutUntil && lockoutRecord.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil(
        (lockoutRecord.lockoutUntil.getTime() - Date.now()) / 1000 / 60,
      );
      throw new ApiError(
        429,
        `This account is temporarily locked due to excessive failed attempts. Please try again after ${remainingTime} minutes.`,
      );
    }

    const isTestRateLimit = process.env.TEST_RATE_LIMIT === 'true';

    if (!isTestRateLimit && process.env.NODE_ENV !== 'development') {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const ipRequestCount = await OtpRequestLog.countDocuments({
        ip,
        action: 'request',
        createdAt: { $gte: fifteenMinutesAgo },
      });

      if (ipRequestCount >= 3) {
        throw new ApiError(
          429,
          'Too many OTP requests from this IP. Please try again after 15 minutes.',
        );
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const emailRequestCount = await OtpRequestLog.countDocuments({
        identifier: cleanEmail,
        action: 'request',
        createdAt: { $gte: oneHourAgo },
      });

      if (emailRequestCount >= 5) {
        throw new ApiError(
          429,
          'Too many OTP requests for this email address. Please try again in an hour.',
        );
      }
    }

    const twoSecondsAgo = new Date(Date.now() - 2000);
    const recentRequestCount = await OtpRequestLog.countDocuments({
      identifier: cleanEmail,
      action: 'request',
      createdAt: { $gte: twoSecondsAgo },
    });
    if (recentRequestCount > 0) {
      logger.warn(
        `[FRONTEND DUPLICATE REQUEST DETECTED] Multiple OTP requests received for ${SecurityAuditService.hashIdentifier(cleanEmail)} within 2 seconds. This indicates frontend race conditions or duplicate click triggers!`,
      );
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(12);
    const otpHash = await bcrypt.hash(otp, salt);

    const expiryMinutes = this.getOtpExpiryMinutes();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const challengeId = crypto.randomUUID();
    const purpose = 'AUTHENTICATE_EMAIL';

    await OtpChallenge.updateMany(
      { identifier: cleanEmail, purpose, exhausted: false, consumedAt: null },
      { $set: { exhausted: true } },
    );

    const otpRecord = await OtpChallenge.create({
      challengeId,
      purpose,
      identifier: cleanEmail,
      identifierType: 'email',
      otpHash,
      expiresAt,
    });

    logger.info(
      `[OTP CREATED] Active OTP record successfully stored for ${SecurityAuditService.hashIdentifier(cleanEmail)}. Timestamp: ${otpRecord.createdAt}. Expiration: ${expiresAt}.`,
    );

    await OtpRequestLog.create({
      ip,
      identifier: cleanEmail,
      action: 'request',
    });

    try {
      await sendDirectEmailProcessor({
        email: cleanEmail,
        subject: `${otp} is your Siri Arts & Crafts verification code`,
        customHtml: getOtpEmailTemplate(otp, expiryMinutes),
        type: 'security',
        action: 'otp_auth',
      });
    } catch (err: any) {
      logger.error(
        `[OTP EMAIL ERROR] Failed to deliver OTP email for ${SecurityAuditService.hashIdentifier(cleanEmail)}:`,
        err?.message || err,
      );
      // Mark challenge as exhausted so it can't be guessed/used
      await OtpChallenge.updateOne({ _id: otpRecord._id }, { $set: { exhausted: true } });
      throw new ApiError(500, 'Failed to send verification email. Please try again.');
    }

    SecurityAuditService.log({
      eventType: 'OTP_REQUESTED',
      success: true,
      ip,
      userAgent: 'unknown',
      provider: 'email',
      identifier: cleanEmail,
      challengeId,
    });

    if (process.env.NODE_ENV === 'development') {
      logger.info(
        `Verification code successfully generated for ${SecurityAuditService.hashIdentifier(cleanEmail)}`,
      );
    }

    return { challengeId };
  }

  static async verifyOTP(
    challengeId: string,
    otp: string,
    ip: string = '127.0.0.1',
    userAgent: string = '',
  ) {
    if (!challengeId || !otp) {
      throw new ApiError(400, 'Challenge ID and OTP are required');
    }

    const normalizedOtp = this.normalizeOtpInput(otp);
    if (normalizedOtp.length !== 6) {
      throw new ApiError(400, 'Verification code must be exactly 6 digits');
    }

    const challenge = await OtpChallenge.findOneAndUpdate(
      { challengeId },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    if (!challenge) {
      throw new ApiError(400, 'Invalid or expired verification session');
    }

    const cleanEmail = challenge.identifier;

    const isTestRateLimit = process.env.TEST_RATE_LIMIT === 'true';
    if (!isTestRateLimit && process.env.NODE_ENV !== 'development') {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const failedAttemptsCount = await OtpRequestLog.countDocuments({
        ip,
        action: 'verify_fail',
        createdAt: { $gte: fifteenMinutesAgo },
      });

      if (failedAttemptsCount >= 5) {
        throw new ApiError(
          429,
          'Too many failed verification attempts. Your IP has been temporarily restricted for 15 minutes.',
        );
      }
    }

    // Fix #1: We shouldn't hardcode 'AUTHENTICATE_EMAIL' here if we have other auth purposes,
    // but this function is specific to OtpAuthService (email). Actually wait, no!
    // The controller calls OtpAuthService.verifyOTP for BOTH email and phone in the unified endpoint.
    // The master plan says: "OtpAuthService.verifyOTP hardcodes `purpose === 'AUTHENTICATE_EMAIL'` — phone challenges routed here will fail".
    // I should allow both or route appropriately.
    if (
      challenge.purpose !== 'AUTHENTICATE_EMAIL' &&
      challenge.purpose !== 'AUTHENTICATE_PHONE' &&
      challenge.purpose !== 'LINK_PHONE'
    ) {
      throw new ApiError(400, 'Invalid verification purpose');
    }

    if (new Date() > challenge.expiresAt) {
      throw new ApiError(400, 'Verification code has expired');
    }
    if (challenge.exhausted) {
      throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
    }
    if (challenge.consumedAt) {
      throw new ApiError(400, 'This verification code has already been used');
    }

    const isMatch = await bcrypt.compare(normalizedOtp, challenge.otpHash);

    if (!isMatch) {
      if (challenge.attempts >= challenge.maxAttempts && !challenge.exhausted) {
        await OtpChallenge.updateOne({ _id: challenge._id }, { $set: { exhausted: true } });
        challenge.exhausted = true;
      }

      await OtpRequestLog.create({ ip, identifier: cleanEmail, action: 'verify_fail' });
      await recordOtpVerifyFailure(ip);

      SecurityAuditService.log({
        eventType: challenge.exhausted ? 'OTP_EXHAUSTED' : 'OTP_FAILED',
        success: false,
        ip,
        userAgent,
        provider: challenge.identifierType,
        identifier: cleanEmail,
        challengeId,
        reason: 'invalid_otp',
      });

      if (challenge.exhausted) {
        logger.warn('[AUTH_FAILURE] Max OTP verification attempts exceeded', {
          emailHash: SecurityAuditService.hashIdentifier(cleanEmail),
          ip,
        });
        throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
      }

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
      identifier: cleanEmail,
      purpose: challenge.purpose,
      _id: { $ne: challenge._id },
    });

    await OtpRequestLog.create({ ip, identifier: cleanEmail, action: 'verify' });

    SecurityAuditService.log({
      eventType: 'OTP_VERIFIED',
      success: true,
      ip,
      userAgent,
      provider: challenge.identifierType,
      identifier: cleanEmail,
      challengeId,
    });

    let user;
    let isNewUser = false;

    let identity = await AuthIdentity.findOne({
      provider: challenge.identifierType,
      providerSubjectId: cleanEmail,
    });

    if (!identity) {
      const legacyUser = await User.findOne({ email: cleanEmail });
      if (legacyUser) {
        // Auto-migrate legacy user
        identity = await AuthIdentity.create({
          userId: legacyUser._id,
          provider: 'email',
          providerSubjectId: cleanEmail,
          verifiedAt: new Date(),
        });
      }
    }

    if (identity) {
      user = await User.findById(identity.userId);
      if (!user) {
        throw new ApiError(400, 'Account not found');
      }
      user.isVerified = true;
      user.lastLogin = new Date();
      await user.save();
    } else {
      isNewUser = true;
      const namePart = cleanEmail.split('@')[0];
      const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const hash = crypto.createHash('md5').update(cleanEmail).digest('hex');
      const avatar = `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;

      const dbSession = await mongoose.startSession();
      dbSession.startTransaction();

      try {
        user = new User({
          name: capitalizedName,
          email: cleanEmail,
          role: 'customer',
          isVerified: true,
          avatar,
          wishlist: [],
          cart: [],
          recentlyViewed: [],
          notificationPreferences: { email: true, marketing: true },
          accountPreferences: { theme: 'light', language: 'en' },
          lastLogin: new Date(),
        });
        await user.save({ session: dbSession });

        await AuthIdentity.create(
          [
            {
              userId: user._id,
              provider: 'email',
              providerSubjectId: cleanEmail,
              verifiedAt: new Date(),
            },
          ],
          { session: dbSession },
        );

        await dbSession.commitTransaction();
      } catch (err) {
        await dbSession.abortTransaction();
        throw err;
      } finally {
        dbSession.endSession();
      }

      (async () => {
        try {
          if (typeof fetch === 'function') {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1500);
            const res = await fetch(`https://www.gravatar.com/${hash}.json`, {
              headers: { 'User-Agent': 'SiriArtsApp/1.0' },
              signal: controller.signal,
            })
              .then((r: any) => {
                clearTimeout(timeout);
                return r.ok ? r.json() : null;
              })
              .catch(() => {
                clearTimeout(timeout);
                return null;
              });

            if (res && res.entry && res.entry[0]) {
              const entry = res.entry[0];
              const gravatarName = entry.displayName || entry.preferredUsername || capitalizedName;
              const gravatarAvatar = entry.thumbnailUrl || avatar;

              await User.findByIdAndUpdate(user!._id, {
                $set: {
                  name: gravatarName,
                  avatar: gravatarAvatar,
                },
              });
            }
          }
        } catch (err) {
          logger.debug('Background Gravatar profile lookup skipped or failed', err);
        }
      })();
    }

    if (isNewUser) {
      try {
        const { RuleEngine } = await import('./RuleEngine.js');
        await RuleEngine.evaluateTrigger('on_signup', { user });
      } catch (ruleErr) {
        logger.error('Failed to evaluate signup rules:', ruleErr);
      }

      try {
        // Removed dynamic require
        createAdminNotification({
          title: 'New User Registration',
          message: `${user.name || user.phone || 'A new user'} just registered on the platform.`,
          type: 'user',
          actionLink: '/admin/users',
        }).catch((err: any) =>
          logger.error('Failed to create admin notification for user registration (async):', err),
        );
      } catch (notifErr) {
        logger.error('Failed to create admin notification for user registration:', notifErr);
      }

      try {
        // Removed dynamic require
        const frontendUrl = getFrontendUrl();
        sendDirectEmail({
          email: user.email,
          subject: `Welcome to Siri Arts & Crafts, ${user.name}`,
          templateName: 'Welcome Email',
          templateData: { name: user.name, frontend_url: frontendUrl },
          type: 'marketing',
          action: 'welcome_email',
          userId: user._id.toString(),
        });
      } catch (welcomeErr) {
        logger.error('Failed to initiate welcome email dispatch:', welcomeErr);
      }
    } else if (user.email) {
      try {
        // Removed dynamic require
        sendDirectEmail({
          email: user.email,
          subject: 'Security Alert: New Login Detected',
          templateName: 'Suspicious Login Alert',
          templateData: { name: user.name, loginTime: new Date().toLocaleString(), deviceInfo: ip },
          type: 'security',
          action: 'new_login_detected',
          userId: user._id.toString(),
        });
      } catch (err) {
        logger.error('Failed to trigger Suspicious Login email:', err);
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

    const session = await SessionAuthService.createSession(user, userAgent);
    await cacheOtpSession(challengeId, 'verified', session);

    return session;
  }

  static async generateCodOTP(email: string, _ip: string = '127.0.0.1') {
    if (!email || !email.includes('@')) {
      throw new ApiError(400, 'A valid email address is required');
    }

    const cleanEmail = canonicalizeEmail(email);

    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(12);
    const otpHash = await bcrypt.hash(otp, salt);

    const expiryMinutes = 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const challengeId = crypto.randomUUID();
    const purpose = 'COD_VERIFICATION';

    await OtpChallenge.updateMany(
      { identifier: cleanEmail, purpose, exhausted: false, consumedAt: null },
      { $set: { exhausted: true } },
    );

    const otpRecord = await OtpChallenge.create({
      challengeId,
      purpose,
      identifier: cleanEmail,
      identifierType: 'email',
      otpHash,
      expiresAt,
    });

    // Removed dynamic require
    const { getCodOtpEmailTemplate } = require('../utils/email/emailTemplates');
    try {
      await sendDirectEmailProcessor({
        email: cleanEmail,
        subject: `${otp} is your Siri Arts & Crafts COD verification code`,
        customHtml: getCodOtpEmailTemplate(otp, expiryMinutes),
        type: 'security',
        action: 'cod_otp',
      });
    } catch (err: any) {
      logger.error(
        `[COD OTP ERROR] Failed to deliver COD OTP email for ${SecurityAuditService.hashIdentifier(cleanEmail)}:`,
        err,
      );
      await OtpChallenge.updateOne({ _id: otpRecord._id }, { $set: { exhausted: true } });
      throw new ApiError(500, `COD verification email delivery failed. Please try again.`);
    }

    return { challengeId }; // Stop returning raw OTP! Return challengeId instead.
  }

  static async verifyCodOTP(challengeId: string, otp: string) {
    if (!challengeId || !otp) {
      throw new ApiError(400, 'Challenge ID and OTP are required');
    }

    const normalizedOtp = this.normalizeOtpInput(otp);

    const challenge = await OtpChallenge.findOneAndUpdate(
      { challengeId, purpose: 'COD_VERIFICATION' },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    if (!challenge) {
      throw new ApiError(400, 'Invalid or expired verification session');
    }

    if (new Date() > challenge.expiresAt) {
      throw new ApiError(400, 'Verification code has expired');
    }
    if (challenge.exhausted) {
      throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
    }
    if (challenge.consumedAt) {
      throw new ApiError(400, 'This verification code has already been used');
    }

    const isMatch = await bcrypt.compare(normalizedOtp, challenge.otpHash);

    if (!isMatch) {
      if (challenge.attempts >= challenge.maxAttempts && !challenge.exhausted) {
        await OtpChallenge.updateOne({ _id: challenge._id }, { $set: { exhausted: true } });
        challenge.exhausted = true;
      }
      throw new ApiError(400, 'Invalid verification code');
    }

    const updated = await OtpChallenge.findOneAndUpdate(
      { _id: challenge._id, consumedAt: null },
      { $set: { consumedAt: new Date() } },
      { new: true },
    );
    if (!updated) {
      logger.warn(
        `[COD OTP RACE] OTP already consumed for ${SecurityAuditService.hashIdentifier(challenge.identifier)}`,
      );
      throw new ApiError(400, 'Verification code already used. Please request a new one.');
    }

    await OtpChallenge.deleteMany({
      identifier: challenge.identifier,
      purpose: 'COD_VERIFICATION',
      _id: { $ne: challenge._id },
    });

    return true;
  }
}

export default OtpAuthService;
