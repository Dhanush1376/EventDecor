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
import { getOtpEmailTemplate, getCodOtpEmailTemplate } from '../utils/email/emailTemplates';
import jwt from 'jsonwebtoken';
import { getSmsProvider, maskPhone } from './SmsProviderService';
import { PhoneAuthService } from './PhoneAuthService';
import { SecurityAuditService } from './SecurityAuditService';
import { isAdministrativeRole } from '../config/adminConfig';

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
      logger.info(`[DEV AUTH OTP] Verification code for ${cleanEmail}: ${otp}`);
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

    const cleanEmail = canonicalizeEmail(challenge.identifier);

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

    const identity = await AuthIdentity.findOne({
      provider: 'email',
      providerSubjectId: cleanEmail,
    });

    if (identity) {
      user = await User.findById(identity.userId);
      if (!user || user.isDeleted) {
        throw new ApiError(401, 'Account not found');
      }
      if (isAdministrativeRole(user.role)) {
        throw new ApiError(403, 'Administrative accounts must sign in via the Admin Portal.');
      }
      if (user.email !== cleanEmail) {
        user.email = cleanEmail;
      }
      if (!user.emailVerified) {
        user.emailVerified = true;
      }
      if (!user.isVerified) {
        user.isVerified = true;
      }
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Check if an existing User already has this email
      const existingUser = await User.findOne({
        email: cleanEmail,
        isDeleted: { $ne: true },
      });

      if (existingUser) {
        if (isAdministrativeRole(existingUser.role)) {
          throw new ApiError(403, 'Administrative accounts must sign in via the Admin Portal.');
        }
        user = existingUser;
        user.email = cleanEmail;
        user.emailVerified = true;
        if (!user.isVerified) {
          user.isVerified = true;
        }
        user.lastLogin = new Date();
        await user.save();

        await AuthIdentity.findOneAndUpdate(
          { provider: 'email', providerSubjectId: cleanEmail },
          { $set: { userId: user._id, verifiedAt: new Date() } },
          { upsert: true, new: true },
        );
      } else {
        isNewUser = true;
        const namePart = cleanEmail.split('@')[0];
        const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        const hash = crypto.createHash('md5').update(cleanEmail).digest('hex');
        const avatar = `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;

        try {
          const dbSession = await mongoose.startSession();
          dbSession.startTransaction();

          try {
            user = new User({
              name: capitalizedName,
              email: cleanEmail,
              role: 'customer',
              isVerified: true,
              emailVerified: true,
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
        } catch (createErr: any) {
          // Concurrent account-creation safety: recover from duplicate key race
          if (
            createErr.code === 11000 ||
            createErr.name === 'MongoServerError' ||
            String(createErr.message || '').includes('E11000')
          ) {
            logger.info(
              `[OtpAuthService] Concurrent account-creation race detected for ${cleanEmail}. Recovering existing account...`,
            );
            const recoveredIdentity = await AuthIdentity.findOne({
              provider: 'email',
              providerSubjectId: cleanEmail,
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
                user.emailVerified = true;
                user.lastLogin = new Date();
                await user.save();
                isNewUser = false;
              }
            } else {
              const existingRecoveredUser = await User.findOne({
                email: cleanEmail,
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
                user.emailVerified = true;
                user.lastLogin = new Date();
                await user.save();
                isNewUser = false;
              }
            }
          }
          if (!user) {
            throw createErr;
          }
        }

        if (isNewUser) {
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
                  const gravatarName =
                    entry.displayName || entry.preferredUsername || capitalizedName;
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
      }
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
        Promise.resolve(
          createAdminNotification({
            title: 'New User Registration',
            message: `${user.name || user.phone || 'A new user'} just registered on the platform.`,
            type: 'user',
            actionLink: '/admin/users',
          }),
        ).catch((err: any) =>
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

  static async generateCodOTP(
    phoneOrOptions:
      | string
      | {
          phone?: string;
          email?: string;
          channel?: 'phone' | 'email';
          userId?: string;
          ip?: string;
        },
    legacyUserId?: string,
    legacyIp: string = '127.0.0.1',
  ) {
    let phone: string | undefined;
    let email: string | undefined;
    let channel: 'phone' | 'email' = 'phone';
    let _userId: string | undefined = legacyUserId;
    let ip: string = legacyIp;

    if (typeof phoneOrOptions === 'string') {
      phone = phoneOrOptions;
      channel = 'phone';
    } else if (typeof phoneOrOptions === 'object' && phoneOrOptions !== null) {
      phone = phoneOrOptions.phone;
      email = phoneOrOptions.email;
      channel = phoneOrOptions.channel || (email && !phone ? 'email' : 'phone');
      _userId = phoneOrOptions.userId || legacyUserId;
      ip = phoneOrOptions.ip || legacyIp;
    }

    if (channel === 'email') {
      if (!email || !email.trim()) {
        throw new ApiError(400, 'A valid delivery email address is required for COD verification');
      }
      const cleanEmail = canonicalizeEmail(email.trim());
      const purpose = 'COD_VERIFICATION';

      // Anti-bombing / cooldown (30 seconds)
      const recentChallenge = await OtpChallenge.findOne({
        identifier: cleanEmail,
        purpose,
        createdAt: { $gt: new Date(Date.now() - 30 * 1000) },
      });
      if (recentChallenge) {
        throw new ApiError(429, 'Please wait before requesting another verification code');
      }

      // Hourly rate limit (5 per hour)
      const hourlyCount = await OtpChallenge.countDocuments({
        identifier: cleanEmail,
        purpose,
        createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) },
      });
      if (hourlyCount >= 5) {
        throw new ApiError(429, 'Too many verification attempts. Please try again later.');
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      const salt = await bcrypt.genSalt(12);
      const otpHash = await bcrypt.hash(otp, salt);

      const expiryMinutes = 5;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
      const challengeId = crypto.randomUUID();

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

      if (process.env.NODE_ENV === 'development') {
        logger.info(`[DEV COD OTP] Email verification code for ${cleanEmail}: ${otp}`);
      }

      try {
        await sendDirectEmailProcessor({
          email: cleanEmail,
          subject: `${otp} is your COD Order Verification Code`,
          customHtml: getCodOtpEmailTemplate(otp, expiryMinutes),
          type: 'security',
          action: 'cod_otp',
        });
      } catch (err: any) {
        logger.error(
          `[COD OTP EMAIL ERROR] Failed to send email to ${SecurityAuditService.hashIdentifier(cleanEmail)}:`,
          err?.message || err,
        );
        await OtpChallenge.updateOne(
          { _id: (otpRecord as any)._id },
          { $set: { exhausted: true } },
        );
        throw new ApiError(500, 'Failed to send email verification code. Please try again.');
      }

      SecurityAuditService.log({
        eventType: 'OTP_REQUESTED',
        success: true,
        ip,
        userAgent: 'checkout',
        identifier: cleanEmail,
        challengeId,
      });

      const maskEmail = (str: string) => {
        const [l, d] = str.split('@');
        if (!d) return str;
        const maskedL = l.length <= 2 ? `${l[0]}*` : `${l[0]}***${l[l.length - 1]}`;
        return `${maskedL}@${d}`;
      };

      return {
        success: true,
        challengeId,
        channel: 'email',
        email: maskEmail(cleanEmail),
        deliveryTarget: maskEmail(cleanEmail),
      };
    }

    // Phone channel
    if (!phone) {
      throw new ApiError(400, 'A valid delivery phone number is required for COD verification');
    }

    const normalizedPhone = PhoneAuthService.normalizePhone(phone);
    const purpose = 'COD_VERIFICATION';

    // Anti-SMS Bombing / Cooldown (30 seconds)
    const recentChallenge = await OtpChallenge.findOne({
      identifier: normalizedPhone,
      purpose,
      createdAt: { $gt: new Date(Date.now() - 30 * 1000) },
    });
    if (recentChallenge) {
      throw new ApiError(429, 'Please wait before requesting another verification code');
    }

    // Hourly rate limit (5 per hour)
    const hourlyCount = await OtpChallenge.countDocuments({
      identifier: normalizedPhone,
      purpose,
      createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) },
    });
    if (hourlyCount >= 5) {
      throw new ApiError(429, 'Too many verification attempts. Please try again later.');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(12);
    const otpHash = await bcrypt.hash(otp, salt);

    const expiryMinutes = 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const challengeId = crypto.randomUUID();

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
      expiresAt,
    });

    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV COD OTP] Verification code for ${normalizedPhone}: ${otp}`);
    }

    const smsResult = await getSmsProvider().sendOtp(normalizedPhone, otp);
    if (!smsResult.success) {
      logger.error(`[COD OTP ERROR] Failed to send SMS via Fast2SMS: ${smsResult.error}`);
      await OtpChallenge.updateOne({ _id: (otpRecord as any)._id }, { $set: { exhausted: true } });
      throw new ApiError(500, 'Failed to send SMS verification code. Please try again.');
    }

    SecurityAuditService.log({
      eventType: 'OTP_REQUESTED',
      success: true,
      ip,
      userAgent: 'checkout',
      identifier: normalizedPhone,
      challengeId,
    });

    return {
      success: true,
      challengeId,
      channel: 'phone',
      phone: maskPhone(normalizedPhone),
      deliveryTarget: maskPhone(normalizedPhone),
    };
  }

  static async verifyCodOTP(
    phoneOrOptions:
      | string
      | {
          phone?: string;
          email?: string;
          channel?: 'phone' | 'email';
          challengeId?: string;
        },
    otp: string,
    userId?: string,
  ) {
    let target = '';
    if (typeof phoneOrOptions === 'string') {
      target = phoneOrOptions;
    } else if (typeof phoneOrOptions === 'object' && phoneOrOptions !== null) {
      target = phoneOrOptions.challengeId || phoneOrOptions.email || phoneOrOptions.phone || '';
    }

    if (!target || !otp) {
      throw new ApiError(400, 'Delivery phone, email, or challenge ID and OTP are required');
    }

    let normalizedIdentifier = target;
    if (target.includes('@')) {
      normalizedIdentifier = canonicalizeEmail(target);
    } else {
      try {
        if (!target.includes('-') && target.length <= 15) {
          normalizedIdentifier = PhoneAuthService.normalizePhone(target);
        }
      } catch {
        // Retain as challengeId if not standard phone format
      }
    }

    const normalizedOtp = this.normalizeOtpInput(otp);

    const challenge = await OtpChallenge.findOneAndUpdate(
      {
        $or: [
          { challengeId: target },
          { identifier: normalizedIdentifier },
          { identifier: target },
        ],
        purpose: 'COD_VERIFICATION',
      },
      { $inc: { attempts: 1 } },
      { sort: { createdAt: -1 }, new: true },
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

    // Generate signed single-use COD verification token bound to identifier and userId
    const isEmail = challenge.identifierType === 'email' || challenge.identifier.includes('@');
    const payload = {
      challengeId: challenge.challengeId,
      channel: isEmail ? 'email' : 'phone',
      phone: isEmail ? null : challenge.identifier,
      email: isEmail ? challenge.identifier : null,
      userId: userId || null,
      purpose: 'COD_ORDER_VERIFICATION',
    };
    const codVerificationToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: '15m',
    });

    return {
      success: true,
      codVerificationToken,
      channel: isEmail ? 'email' : 'phone',
      phone: isEmail ? undefined : challenge.identifier,
      email: isEmail ? challenge.identifier : undefined,
    };
  }
}

export default OtpAuthService;
