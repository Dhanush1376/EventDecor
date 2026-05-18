import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import OtpVerification from '../models/OtpVerification';
import OtpRequestLog from '../models/OtpRequestLog';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { isSameEmail, canonicalizeEmail } from '../utils/emailHelper';
import { getAdminEmails } from '../config/adminConfig';
import UsedRefreshToken from '../models/UsedRefreshToken';
import FailedLoginAttempt from '../models/FailedLoginAttempt';

class AuthService {
  static generateAccessToken(user: IUser) {
    return jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
    );
  }

  static hashRefreshToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static getRefreshTokenTtlMs() {
    const days = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30);
    return Math.max(1, days) * 24 * 60 * 60 * 1000;
  }

  static async createSession(user: IUser) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = crypto.randomBytes(48).toString('base64url');
    user.refreshTokenHash = this.hashRefreshToken(refreshToken);
    user.refreshTokenExpiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());
    await user.save();

    return { user, token: accessToken, accessToken, refreshToken };
  }

  static async refreshSession(refreshToken: string) {
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh session is missing');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);

    // 1. Detect if this token was already used (Replay attack detection!)
    const isUsed = await UsedRefreshToken.findOne({ tokenHash });
    if (isUsed) {
      // Replay attack! Instantly revoke user's current session to protect them!
      await User.updateOne(
        { _id: isUsed.userId },
        { $unset: { refreshTokenHash: '', refreshTokenExpiresAt: '' } }
      );
      logger.error(`[SECURITY ALERT] Refresh token reuse detected for userId: ${isUsed.userId}! Potential replay attack. Revoking all sessions.`);
      throw new ApiError(401, 'Session hijacked. Please log in again.');
    }

    const user = await User.findOne({
      refreshTokenHash: tokenHash,
      refreshTokenExpiresAt: { $gt: new Date() },
      isVerified: true,
    }).select('+refreshTokenHash +refreshTokenExpiresAt');

    if (!user) {
      throw new ApiError(401, 'Refresh session is invalid or expired');
    }

    // 2. Record old refresh token as spent/used
    await UsedRefreshToken.create({
      tokenHash,
      userId: user._id,
      expiresAt: user.refreshTokenExpiresAt || new Date(Date.now() + this.getRefreshTokenTtlMs())
    });

    // 3. Create a fresh session (generates new access & rotated refresh token)
    return this.createSession(user);
  }

  static async revokeSession(refreshToken?: string) {
    if (!refreshToken) return;
    const tokenHash = this.hashRefreshToken(refreshToken);
    await User.updateOne(
      { refreshTokenHash: tokenHash },
      { $unset: { refreshTokenHash: '', refreshTokenExpiresAt: '' } }
    );
  }

  /**
   * Hardened password checker for administrative routes.
   * Tracks incorrect attempts and applies a persistent 15-minute lockout.
   */
  static async checkAdminPassword(email: string, password?: string): Promise<void> {
    const cleanEmail = canonicalizeEmail(email);
    const adminEmails = getAdminEmails();

    const isAdmin = adminEmails.some(addr => isSameEmail(cleanEmail, addr));
    if (!isAdmin) {
      return; // Non-admin bypasses credential checks
    }

    // 1. Enforce lockout checks
    const lockoutRecord = await FailedLoginAttempt.findOne({ email: cleanEmail });
    if (lockoutRecord && lockoutRecord.lockoutUntil && lockoutRecord.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil((lockoutRecord.lockoutUntil.getTime() - Date.now()) / 1000 / 60);
      throw new ApiError(429, `This account has been temporarily locked due to excessive failed attempts. Please try again after ${remainingTime} minutes.`);
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new ApiError(500, 'Admin password is not configured on server');
    }

    // 2. Validate password (bcrypt comparison supports both hashed and legacy plaintext env values)
    const isPasswordValid = adminPassword.startsWith('$2') 
      ? await bcrypt.compare(password || '', adminPassword)
      : password === adminPassword;

    if (!password || !isPasswordValid) {
      let attempts = 1;
      let lockoutUntil: Date | null = null;

      if (lockoutRecord) {
        attempts = lockoutRecord.attempts + 1;
        if (attempts >= 5) {
          lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock
        }
      }

      await FailedLoginAttempt.findOneAndUpdate(
        { email: cleanEmail },
        {
          attempts,
          lockoutUntil: lockoutUntil || undefined,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Auto-expire logs
        },
        { upsert: true, new: true }
      );

      if (attempts >= 5) {
        throw new ApiError(429, 'Too many failed login attempts. Your account has been temporarily locked for 15 minutes.');
      } else {
        throw new ApiError(401, `Invalid admin security credentials. ${5 - attempts} attempts remaining before temporary lockout.`);
      }
    }

    // 3. Clear logs upon successful validation
    await FailedLoginAttempt.deleteOne({ email: cleanEmail });
  }

  static async generateOTP(email: string, ip: string = '127.0.0.1') {
    if (!email || !email.includes('@')) {
      throw new ApiError(400, 'A valid email address is required');
    }

    const cleanEmail = canonicalizeEmail(email);

    // Enforce brute-force admin lockout check before generating OTP
    const lockoutRecord = await FailedLoginAttempt.findOne({ email: cleanEmail });
    if (lockoutRecord && lockoutRecord.lockoutUntil && lockoutRecord.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil((lockoutRecord.lockoutUntil.getTime() - Date.now()) / 1000 / 60);
      throw new ApiError(429, `This account is temporarily locked due to excessive failed attempts. Please try again after ${remainingTime} minutes.`);
    }

    const isDev = process.env.NODE_ENV === 'development';

    // 1. IP Rate Limiting Check (Max 3 OTP requests per IP per 15 minutes - Bypassed in Dev)
    if (!isDev) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const ipRequestCount = await OtpRequestLog.countDocuments({
        ip,
        action: 'request',
        createdAt: { $gte: fifteenMinutesAgo }
      });

      if (ipRequestCount >= 3) {
        throw new ApiError(429, 'Too many OTP requests from this IP. Please try again after 15 minutes.');
      }
    }

    // 2. Email Rate Limiting Check (Max 5 OTP requests per email per hour - Bypassed in Dev)
    if (!isDev) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const emailRequestCount = await OtpRequestLog.countDocuments({
        email: cleanEmail,
        action: 'request',
        createdAt: { $gte: oneHourAgo }
      });

      if (emailRequestCount >= 5) {
        throw new ApiError(429, 'Too many OTP requests for this email address. Please try again in an hour.');
      }
    }

    // Detect duplicate/parallel requests sent very rapidly (within 2 seconds)
    const twoSecondsAgo = new Date(Date.now() - 2000);
    const recentRequestCount = await OtpRequestLog.countDocuments({
      email: cleanEmail,
      action: 'request',
      createdAt: { $gte: twoSecondsAgo }
    });
    if (recentRequestCount > 0) {
      logger.warn(`[FRONTEND DUPLICATE REQUEST DETECTED] Multiple OTP requests received for ${cleanEmail} within 2 seconds. This indicates frontend race conditions or duplicate click triggers!`);
    }

    // Check for existing active OTP verifications to detect overwriting
    const existingOtp = await OtpVerification.findOne({ email: cleanEmail });
    if (existingOtp) {
      logger.warn(`[OTP OVERWRITE DETECTED] An active OTP created at ${existingOtp.createdAt} for ${cleanEmail} is being invalidated and overwritten by a new request. This is likely due to duplicate triggers or user clicking resend.`);
    }

    // 3. Delete any existing OTP verifications for this email (Only latest OTP is valid)
    await OtpVerification.deleteMany({ email: cleanEmail });

    // 4. Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // 5. Securely hash the OTP using bcrypt (prevent database leak lookup attacks)
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    // 6. Save OTP in MongoDB with expiry (5 minutes from now)
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const otpRecord = await OtpVerification.create({
      email: cleanEmail,
      otpHash,
      attempts: 0,
      expiresAt
    });

    logger.info(`[OTP CREATED] Active OTP record successfully stored for ${cleanEmail}. Timestamp: ${otpRecord.createdAt}. Expiration: ${expiresAt}.`);

    // 7. Log this successful request to enforce future rate limits
    await OtpRequestLog.create({
      ip,
      email: cleanEmail,
      action: 'request'
    });

    // 8. Send beautifully designed OTP email asynchronously in the background to prevent blocking HTTP response
    const { sendEmail } = require('../utils/sendEmail');
    sendEmail({
      email: cleanEmail,
      subject: 'Your Siri Arts Security Code',
      message: otp
    }).catch((err: any) => {
      logger.error(`Background OTP email delivery failed for ${cleanEmail}:`, err);
    });

    // Always log in development for easier testing and recovery
    if (process.env.NODE_ENV === 'development') {
      logger.info(`Verification code successfully generated for ${cleanEmail}`);
    }

    return otp;
  }

  static async verifyOTP(email: string, otp: string, ip: string = '127.0.0.1') {
    if (!email || !otp) {
      throw new ApiError(400, 'Email and OTP are required');
    }

    const cleanEmail = canonicalizeEmail(email);

    const isDev = process.env.NODE_ENV === 'development';

    // 1. Cooldown & IP Restriction Check: Max 5 failed OTP attempts in the last 15 minutes per IP (Bypassed in Dev)
    if (!isDev) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const failedAttemptsCount = await OtpRequestLog.countDocuments({
        ip,
        action: 'verify_fail',
        createdAt: { $gte: fifteenMinutesAgo }
      });

      if (failedAttemptsCount >= 5) {
        throw new ApiError(429, 'Too many failed verification attempts. Your IP has been temporarily restricted for 15 minutes.');
      }
    }

    // Find the latest OTP verification record
    const otpRecord = await OtpVerification.findOne({ email: cleanEmail });

    if (!otpRecord) {
      logger.warn(`[OTP VERIFICATION FAIL] No active OTP record found in DB for: ${cleanEmail}`);
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    logger.info(`[OTP VERIFICATION ATTEMPT] Verifying OTP for ${cleanEmail}. Current attempts: ${otpRecord.attempts}/5. Created at: ${otpRecord.createdAt}`);

    // 2. Validate Expiration (in case MongoDB TTL index hasn't run yet)
    if (new Date() > otpRecord.expiresAt) {
      logger.warn(`[OTP EXPIRED] OTP created at ${otpRecord.createdAt} for ${cleanEmail} has expired at: ${otpRecord.expiresAt}`);
      await OtpVerification.deleteMany({ email: cleanEmail });
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    // 3. Validate attempt limits (Max 5 attempts)
    if (otpRecord.attempts >= 5) {
      logger.error(`[OTP EXCEEDED LIMIT] Max attempts reached (5/5) for ${cleanEmail}. Invalidating.`);
      await OtpVerification.deleteMany({ email: cleanEmail });
      throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
    }

    // 4. Verify OTP Match using bcrypt (safe development bypass codes only when NODE_ENV is explicitly 'development')
    const isDevBypass = process.env.NODE_ENV === 'development' && (otp === '777777' || otp === '123456');
    if (isDevBypass) {
      logger.warn(`[DEV OTP BYPASS] Development-only bypass code used for ${cleanEmail}. This MUST be disabled in production.`);
    }
    const isMatch = isDevBypass || await bcrypt.compare(otp, otpRecord.otpHash);

    if (!isMatch) {
      // Track verification failure to enforce rate limits/cooldowns
      await OtpRequestLog.create({
        ip,
        email: cleanEmail,
        action: 'verify_fail'
      });

      // Increment attempt count
      otpRecord.attempts += 1;
      logger.warn(`[OTP VERIFICATION FAILED MATCH] Incorrect OTP entered for ${cleanEmail}. Attempt incremented to: ${otpRecord.attempts}/5`);
      
      if (otpRecord.attempts >= 5) {
        logger.error(`[OTP EXCEEDED LIMIT] Max attempts reached (5/5) after mismatch for ${cleanEmail}. Deleting record.`);
        await OtpVerification.deleteMany({ email: cleanEmail });
        throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
      } else {
        await otpRecord.save();
      }
      
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    // 5. Verification Successful: Single-Use Cleanup (Delete OTP record atomically to prevent race conditions / concurrent reuse)
    const deletedRecord = await OtpVerification.findOneAndDelete({ _id: otpRecord._id });
    if (!deletedRecord) {
      logger.warn(`[OTP CONCURRENCY RACE] OTP for ${cleanEmail} was consumed by a concurrent verification request.`);
      throw new ApiError(400, 'Invalid or expired OTP (consumed by another active session)');
    }

    logger.info(`[OTP VERIFICATION SUCCESS] OTP successfully verified and consumed for ${cleanEmail} in ${otpRecord.attempts + 1} attempt(s).`);

    // 6. Track verification success request to prevent spam
    await OtpRequestLog.create({
      ip,
      email: cleanEmail,
      action: 'verify'
    });

    // Check if user already exists
    let user = await User.findOne({ email: cleanEmail });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      // Auto-create new user
      const namePart = cleanEmail.split('@')[0];
      const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      
      // Check if email matches the designated ADMIN_EMAIL from env
      const adminEmails = getAdminEmails();
      const role = adminEmails.some(addr => isSameEmail(cleanEmail, addr)) ? 'admin' : 'customer';

      // Perform a smart-autofill using Gravatar profile endpoints asynchronously in the background
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
        orders: [],
        recentlyViewed: [],
        notificationPreferences: { email: true, marketing: true },
        accountPreferences: { theme: 'light', language: 'en' }
      });

      // Fire profile enrichment in the background using native fetch (Node 18+)
      (async () => {
        try {
          if (typeof fetch === 'function') {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1500);
            const res = await fetch(`https://www.gravatar.com/${hash}.json`, {
              headers: { 'User-Agent': 'SiriArtsApp/1.0' },
              signal: controller.signal,
            }).then((r: any) => {
              clearTimeout(timeout);
              return r.ok ? r.json() : null;
            }).catch(() => {
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
                  avatar: gravatarAvatar
                }
              });
              logger.info(`[GRAVATAR BACKGROUND SUCCESS] Profile enriched for new user: ${cleanEmail}`);
            }
          }
        } catch (err) {
          logger.debug('Background Gravatar profile lookup skipped or failed', err);
        }
      })();
    } else {
      user.isVerified = true;
      const adminEmails = getAdminEmails();
      if (adminEmails.some(addr => isSameEmail(cleanEmail, addr))) {
        user.role = 'admin';
      }
    }

    user.lastLogin = new Date();
    await user.save();

    // Trigger Welcome Email on new registration
    if (isNewUser) {
      try {
        const { LoyaltyService } = require('./loyaltyService');
        await LoyaltyService.setupNewUserRewards(user._id.toString());
      } catch (loyaltyErr) {
        logger.error('Failed to setup loyalty onboarding rewards:', loyaltyErr);
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

    // Security Alert: Send New Login Detection email
    try {
      const { sendDirectEmail } = require('./notificationService');
      sendDirectEmail({
        email: user.email,
        subject: 'Security Alert: New Login Detected ✦ Siri Arts Studio',
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

    return this.createSession(user);
  }

  static async generateCodOTP(email: string, ip: string = '127.0.0.1') {
    if (!email || !email.includes('@')) {
      throw new ApiError(400, 'A valid email address is required');
    }

    const cleanEmail = canonicalizeEmail(email);

    // 1. Delete any existing OTP verifications for this email
    await OtpVerification.deleteMany({ email: cleanEmail });

    // 2. Generate cryptographically secure 4-digit OTP
    const otp = crypto.randomInt(1000, 9999).toString();

    // 3. Hash the OTP using bcrypt
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);

    // 4. Save in DB with expiry (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await OtpVerification.create({
      email: cleanEmail,
      otpHash,
      attempts: 0,
      expiresAt
    });

    // 5. Send custom COD email
    const { sendDirectEmail } = require('./notificationService');
    sendDirectEmail({
      email: cleanEmail,
      subject: '✦ Cash on Delivery Verification Code ✦ Siri Arts Studio',
      customHtml: `
        <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 50px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); text-align: center; box-sizing: border-box;">
          <div style="margin-bottom: 25px; text-align: center;">
            <div style="font-size: 28px; color: #735c00; margin-bottom: 12px; font-weight: 300; text-align: center;">✦</div>
            <h1 style="color: #735c00; font-size: 26px; font-weight: 300; letter-spacing: 5px; margin: 0; text-transform: uppercase; text-align: center;">Siri Arts</h1>
            <div style="width: 60px; height: 1px; background-color: #735c00; margin: 12px auto 0 auto; opacity: 0.25;"></div>
          </div>
          <span style="display: block; color: #7f7663; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 30px; font-family: 'Inter', sans-serif;">COD Order Verification</span>
          
          <div style="background-color: #fbfaf8; border: 1px solid #d0c5af; padding: 25px 20px; border-radius: 12px; margin: 25px 0;">
            <span style="display: block; color: #7f7663; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; font-family: 'Inter', sans-serif;">Your Verification Code</span>
            <h1 style="margin: 0; letter-spacing: 12px; color: #735c00; font-size: 42px; font-weight: 500; font-family: 'Courier New', monospace; padding-left: 12px;">${otp}</h1>
          </div>
          
          <p style="color: #7f7663; font-size: 13px; font-weight: 300; font-family: 'Inter', sans-serif; margin-top: 20px; margin-bottom: 0;">
            Please enter this verification code on the checkout page to confirm your Cash on Delivery request.
          </p>
        </div>
      `,
      type: 'security',
      action: 'cod_otp'
    });

    return otp;
  }

  static async verifyCodOTP(email: string, otp: string) {
    if (!email || !otp) {
      throw new ApiError(400, 'Email and OTP are required');
    }

    const cleanEmail = canonicalizeEmail(email);

    const otpRecord = await OtpVerification.findOne({ email: cleanEmail });
    if (!otpRecord) {
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    if (new Date() > otpRecord.expiresAt) {
      await OtpVerification.deleteMany({ email: cleanEmail });
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      if (otpRecord.attempts >= 5) {
        await OtpVerification.deleteMany({ email: cleanEmail });
        throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
      } else {
        await otpRecord.save();
      }
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    await OtpVerification.deleteMany({ email: cleanEmail });
    return true;
  }
}

export default AuthService;
