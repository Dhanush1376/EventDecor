import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import OtpRequestLog from '../models/OtpRequestLog';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { canonicalizeEmail } from '../utils/emailHelper';
import { setTwoFactorPending } from '../utils/twoFactorPending';
import OtpVerification, { OTP_MAX_ATTEMPTS } from '../models/OtpVerification';
import FailedLoginAttempt from '../models/FailedLoginAttempt';
import { cacheOtpSession, getCachedOtpSession } from '../utils/otpVerifyCache';
import { recordOtpVerifyFailure } from '../utils/otpRateLimit';
import SessionAuthService from './SessionAuthService';

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

    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev) {
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
    }

    if (!isDev) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const emailRequestCount = await OtpRequestLog.countDocuments({
        email: cleanEmail,
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
      email: cleanEmail,
      action: 'request',
      createdAt: { $gte: twoSecondsAgo },
    });
    if (recentRequestCount > 0) {
      logger.warn(
        `[FRONTEND DUPLICATE REQUEST DETECTED] Multiple OTP requests received for ${cleanEmail} within 2 seconds. This indicates frontend race conditions or duplicate click triggers!`,
      );
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(12);
    const otpHash = await bcrypt.hash(otp, salt);

    const expiryMinutes = this.getOtpExpiryMinutes();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const otpRecord = await OtpVerification.create({
      email: cleanEmail,
      otpHash,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      exhausted: false,
      type: 'auth',
      expiresAt,
    });

    logger.info(
      `[OTP CREATED] Active OTP record successfully stored for ${cleanEmail}. Timestamp: ${otpRecord.createdAt}. Expiration: ${expiresAt}.`,
    );

    await OtpRequestLog.create({
      ip,
      email: cleanEmail,
      action: 'request',
    });

    const { sendDirectEmail } = require('./notificationService');
    const { getOtpEmailTemplate } = require('../utils/emailTemplates');
    try {
      sendDirectEmail({
        email: cleanEmail,
        subject: `Your Siri Arts Security Code - ${new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}`,
        customHtml: getOtpEmailTemplate(otp, expiryMinutes),
        type: 'security',
        action: 'otp_auth',
      });
    } catch (err: any) {
      logger.error(
        `[OTP EMAIL ERROR] Failed to initiate OTP email for ${cleanEmail}:`,
        err?.message || err,
      );
    }

    if (process.env.NODE_ENV === 'development') {
      logger.info(`Verification code successfully generated for ${cleanEmail}`);
    }

    return otp;
  }

  static async verifyOTP(
    email: string,
    otp: string,
    ip: string = '127.0.0.1',
    userAgent: string = '',
  ) {
    if (!email || !otp) {
      throw new ApiError(400, 'Email and OTP are required');
    }

    const cleanEmail = canonicalizeEmail(email);
    const normalizedOtp = this.normalizeOtpInput(otp);

    if (normalizedOtp.length !== 6) {
      throw new ApiError(400, 'Verification code must be exactly 6 digits');
    }

    const cachedSession = await getCachedOtpSession<any>(cleanEmail, normalizedOtp);
    if (cachedSession) {
      logger.info(`[OTP CACHE HIT] Returning cached session for duplicate verify: ${cleanEmail}`);
      return cachedSession;
    }

    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev) {
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

    const otpClockSkewMs = 5 * 60 * 1000;
    const now = new Date();
    const expiryGraceCutoff = new Date(now.getTime() - otpClockSkewMs);

    const otpRecords = await OtpVerification.find({
      email: cleanEmail,
      type: 'auth',
      expiresAt: { $gt: expiryGraceCutoff },
      exhausted: false,
    }).sort({ createdAt: -1 });

    if (otpRecords.length === 0) {
      logger.warn(`[OTP VERIFY] No active OTP for ${cleanEmail}`);
      throw new ApiError(400, 'Invalid or expired OTP. Please request a new code.');
    }

    const activeRecord = otpRecords[0];
    const maxAttempts = activeRecord.maxAttempts ?? OTP_MAX_ATTEMPTS;

    if (activeRecord.attempts >= maxAttempts) {
      await OtpVerification.updateOne({ _id: activeRecord._id }, { $set: { exhausted: true } });
      throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
    }

    const isBypassConfigured =
      process.env.NODE_ENV === 'development' &&
      process.env.BYPASS_OTP_CODE &&
      normalizedOtp === String(process.env.BYPASS_OTP_CODE).replace(/\D/g, '').slice(0, 6);

    if (isBypassConfigured) {
      logger.warn(`[OTP BYPASS] Development bypass used for ${cleanEmail}`);
    }

    let matchedRecord: (typeof otpRecords)[0] | null = null;
    logger.info(
      `[OTP VERIFY DEBUG] Found ${otpRecords.length} active OTP records for ${cleanEmail}. Testing normalized OTP: '${normalizedOtp}'`,
    );
    for (const record of otpRecords) {
      const isMatch = isBypassConfigured || (await bcrypt.compare(normalizedOtp, record.otpHash));
      logger.info(
        `[OTP VERIFY DEBUG] Comparing against record ${record._id} (created at ${record.createdAt}). Match result: ${isMatch}`,
      );
      if (isMatch) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) {
      logger.error(
        `[OTP VERIFY DEBUG] No matches found for ${cleanEmail}. The provided OTP did not match any stored hashes.`,
      );
      await OtpRequestLog.create({ ip, email: cleanEmail, action: 'verify_fail' });
      await recordOtpVerifyFailure(ip);

      const updatedRecords = await OtpVerification.find({
        email: cleanEmail,
        type: 'auth',
        exhausted: false,
      });
      let attemptCount = 0;

      if (updatedRecords.length > 0) {
        await OtpVerification.updateMany(
          { email: cleanEmail, type: 'auth', exhausted: false },
          { $inc: { attempts: 1 } },
        );
        attemptCount = updatedRecords[0].attempts + 1;
      }

      logger.warn(
        `[OTP VERIFY FAIL] Invalid code for ${cleanEmail}. Attempt ${attemptCount}/${maxAttempts}`,
      );

      if (attemptCount >= maxAttempts) {
        logger.warn('[AUTH_FAILURE] Max OTP verification attempts exceeded', {
          email: cleanEmail,
          ip,
        });
        await OtpVerification.updateMany(
          { email: cleanEmail, type: 'auth' },
          { $set: { exhausted: true } },
        );
        throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
      }

      throw new ApiError(400, 'Invalid or expired OTP');
    }

    const consumed = await OtpVerification.findOneAndDelete({
      _id: matchedRecord._id,
      email: cleanEmail,
      type: 'auth',
    });

    if (!consumed) {
      const raced = await getCachedOtpSession<any>(cleanEmail, normalizedOtp);
      if (raced) {
        logger.info(`[OTP RACE] Concurrent verify resolved via cache for ${cleanEmail}`);
        return raced;
      }
      logger.warn(`[OTP RACE] OTP already consumed for ${cleanEmail}`);
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    await OtpVerification.deleteMany(
      { email: cleanEmail, type: 'auth' },
      { bypassDestructionGuard: true },
    );

    logger.info(
      `[OTP VERIFY OK] Code consumed for ${cleanEmail} (attempts: ${consumed.attempts + 1})`,
    );

    await OtpRequestLog.create({
      ip,
      email: cleanEmail,
      action: 'verify',
    });

    let user = await User.findOne({ email: cleanEmail });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const namePart = cleanEmail.split('@')[0];
      const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

      const role = 'customer';

      const hash = crypto.createHash('md5').update(cleanEmail).digest('hex');
      const avatar = `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;

      user = new User({
        name: capitalizedName,
        email: cleanEmail,
        role: role,
        isVerified: true,
        avatar,
        wishlist: [],
        cart: [],
        recentlyViewed: [],
        notificationPreferences: { email: true, marketing: true },
        accountPreferences: { theme: 'light', language: 'en' },
      });

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
              logger.info(
                `[GRAVATAR BACKGROUND SUCCESS] Profile enriched for new user: ${cleanEmail}`,
              );
            }
          }
        } catch (err) {
          logger.debug('Background Gravatar profile lookup skipped or failed', err);
        }
      })();
    } else {
      user.isVerified = true;
    }

    user.lastLogin = new Date();
    await user.save();

    if (isNewUser) {
      try {
        const { LoyaltyService } = require('./loyaltyService');
        await LoyaltyService.setupNewUserRewards(user._id.toString());
      } catch (loyaltyErr) {
        logger.error('Failed to setup loyalty onboarding rewards:', loyaltyErr);
      }

      try {
        const { createAdminNotification } = require('../controllers/adminNotificationController');
        createAdminNotification({
          title: 'New User Registration',
          message: `${user.name || user.email} just registered on the platform.`,
          type: 'user',
          actionLink: '/admin/users',
        }).catch((err: any) => {
          logger.error('Failed to create admin notification for user registration (async):', err);
        });
      } catch (notifErr) {
        logger.error('Failed to create admin notification for user registration:', notifErr);
      }

      try {
        const { sendDirectEmail } = require('./notificationService');
        const frontendUrl = process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:3000';
        sendDirectEmail({
          email: user.email,
          subject: `Welcome to Siri Arts & Crafts, ${user.name} ✦ Discover Timeless Decor`,
          templateName: 'Welcome Email',
          templateData: {
            name: user.name,
            frontend_url: frontendUrl,
          },
          type: 'marketing',
          action: 'welcome_email',
          userId: user._id.toString(),
        }).catch((err: any) => logger.error('Failed to send welcome email in background:', err));
      } catch (welcomeErr) {
        logger.error('Failed to initiate welcome email dispatch:', welcomeErr);
      }
    }

    try {
      const { sendDirectEmail } = require('./notificationService');
      sendDirectEmail({
        email: user.email,
        subject: 'Security Alert: New Login Detected ✦ Siri Arts & Crafts',
        templateName: 'Suspicious Login Alert',
        templateData: {
          name: user.name,
          loginTime: new Date().toLocaleString(),
          deviceInfo: ip,
        },
        type: 'security',
        action: 'new_login_detected',
        userId: user._id.toString(),
      });
    } catch (err) {
      logger.error('Failed to trigger Suspicious Login email:', err);
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
      await cacheOtpSession(cleanEmail, normalizedOtp, pendingResult);
      return pendingResult;
    }

    const session = await SessionAuthService.createSession(user, userAgent);
    await cacheOtpSession(cleanEmail, normalizedOtp, session);

    return session;
  }

  static async generateCodOTP(email: string, ip: string = '127.0.0.1') {
    if (!email || !email.includes('@')) {
      throw new ApiError(400, 'A valid email address is required');
    }

    const cleanEmail = canonicalizeEmail(email);

    const otp = crypto.randomInt(1000, 9999).toString();
    const salt = await bcrypt.genSalt(12);
    const otpHash = await bcrypt.hash(otp, salt);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await OtpVerification.create({
      email: cleanEmail,
      otpHash,
      attempts: 0,
      type: 'cod',
      expiresAt,
    });

    const { sendDirectEmail } = require('./notificationService');
    const { getCodOtpEmailTemplate } = require('../utils/emailTemplates');
    try {
      sendDirectEmail({
        email: cleanEmail,
        subject: '✦ Cash on Delivery Verification Code ✦ Siri Arts & Crafts',
        customHtml: getCodOtpEmailTemplate(otp, 5),
        type: 'security',
        action: 'cod_otp',
      });
    } catch (err: any) {
      logger.error(`[COD OTP QUEUE ERROR] Failed to enqueue COD OTP email for ${cleanEmail}:`, err);
      throw new ApiError(500, `COD verification email queueing failed. Please try again.`);
    }

    return otp;
  }

  static async verifyCodOTP(email: string, otp: string) {
    if (!email || !otp) {
      throw new ApiError(400, 'Email and OTP are required');
    }

    const cleanEmail = canonicalizeEmail(email);
    const otpClockSkewMs = 5 * 60 * 1000;
    const expiryGraceCutoff = new Date(Date.now() - otpClockSkewMs);

    const otpRecords = await OtpVerification.find({
      email: cleanEmail,
      type: 'cod',
      expiresAt: { $gt: expiryGraceCutoff },
    }).sort({ createdAt: -1 });

    if (otpRecords.length === 0) {
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    const isBypassConfigured =
      process.env.NODE_ENV === 'development' &&
      process.env.BYPASS_OTP_CODE &&
      otp === process.env.BYPASS_OTP_CODE;

    let isMatch = false;
    let matchedRecord: (typeof otpRecords)[0] | null = null;
    const latestRecord = otpRecords[0];
    for (const record of otpRecords) {
      if (new Date() > record.expiresAt) continue;
      if (isBypassConfigured || (await bcrypt.compare(otp, record.otpHash))) {
        isMatch = true;
        matchedRecord = record;
        break;
      }
    }

    if (!isMatch) {
      latestRecord.attempts += 1;
      if (latestRecord.attempts >= 5) {
        await OtpVerification.deleteMany(
          { email: cleanEmail, type: 'cod' },
          { bypassDestructionGuard: true },
        );
        throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
      } else {
        await latestRecord.save();
      }
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    const consumed = await OtpVerification.findOneAndDelete({
      _id: matchedRecord!._id,
      email: cleanEmail,
      type: 'cod',
    });

    if (!consumed) {
      logger.warn(`[COD OTP RACE] OTP already consumed for ${cleanEmail}`);
      throw new ApiError(400, 'Verification code already used. Please request a new one.');
    }

    await OtpVerification.deleteMany(
      { email: cleanEmail, type: 'cod' },
      { bypassDestructionGuard: true },
    );
    return true;
  }
}

export default OtpAuthService;
