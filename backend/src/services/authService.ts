import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import RefreshToken from '../models/RefreshToken';
import OtpRequestLog from '../models/OtpRequestLog';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { isSameEmail, canonicalizeEmail } from '../utils/emailHelper';
import { getAdminEmails } from '../config/adminConfig';
import { setTwoFactorPending } from '../utils/twoFactorPending';
import UsedRefreshToken from '../models/UsedRefreshToken';
import OtpVerification, { OTP_MAX_ATTEMPTS } from '../models/OtpVerification';
import FailedLoginAttempt from '../models/FailedLoginAttempt';

// Cache to handle concurrent/duplicate OTP verification requests (grace period of 10 seconds)
const recentlyVerifiedOtps = new Map<string, { email: string; verifiedAt: number; session: any }>();

// Periodic cleanup to prevent memory leak from accumulated OTP cache entries
const OTP_CACHE_CLEANUP_INTERVAL_MS = 60_000; // 1 minute
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of recentlyVerifiedOtps.entries()) {
    if (now - val.verifiedAt > 30_000) {
      recentlyVerifiedOtps.delete(key);
    }
  }
}, OTP_CACHE_CLEANUP_INTERVAL_MS).unref(); // .unref() so it doesn't block graceful shutdown

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

  static async createSession(user: IUser, userAgent: string = '') {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const tokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());

    // Create a new session document (supports multiple sessions per user)
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      userAgent,
    });

    // Enforce a maximum of 10 active sessions per user (evict oldest)
    const sessionCount = await RefreshToken.countDocuments({ userId: user._id });
    if (sessionCount > 10) {
      const oldest = await RefreshToken.find({ userId: user._id })
        .sort({ createdAt: 1 })
        .limit(sessionCount - 10)
        .select('_id');
      await RefreshToken.deleteMany({ _id: { $in: oldest.map(s => s._id) } });
    }

    return { user, token: accessToken, accessToken, refreshToken };
  }

  static async refreshSession(refreshToken: string, userAgent: string = '') {
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh session is missing');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);

    // 1. Detect if this token was already used (Replay attack detection)
    const isUsed = await UsedRefreshToken.findOne({ tokenHash });
    if (isUsed) {
      // Allow a 60-second grace period for concurrent/retry refresh requests (e.g. multiple tabs or network retries)
      const isWithinGracePeriod = (Date.now() - new Date((isUsed as any).createdAt).getTime()) < 60000;
      if (isWithinGracePeriod) {
        logger.info(`[REFRESH CONCURRENCY GRACE] Allow reuse of recently rotated refresh token for userId: ${isUsed.userId}`);
        const user = await User.findOne({ _id: isUsed.userId, isVerified: true });
        if (user) {
          return this.createSession(user, userAgent);
        }
      }

      // Replay detected — revoke entire refresh-token family for this user (RFC 6749 rotation)
      logger.error(
        `[SECURITY ALERT] Refresh token reuse detected for userId: ${isUsed.userId}! Revoking all sessions. Potential token theft.`
      );
      await RefreshToken.deleteMany({ userId: isUsed.userId });
      await UsedRefreshToken.deleteMany({ userId: isUsed.userId });
      throw new ApiError(401, 'Session expired. Please log in again.');
    }

    // 2. Find the session in the RefreshToken collection
    const session = await RefreshToken.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new ApiError(401, 'Refresh session is invalid or expired');
    }

    // 3. Verify the user exists and is active
    const user = await User.findOne({ _id: session.userId, isVerified: true });
    if (!user) {
      await RefreshToken.deleteOne({ _id: session._id });
      throw new ApiError(401, 'User account not found or not verified');
    }

    // 4. Record old refresh token as spent/used (for replay detection)
    await UsedRefreshToken.create({
      tokenHash,
      userId: user._id,
      expiresAt: session.expiresAt,
    });

    // 5. Delete the old session document
    await RefreshToken.deleteOne({ _id: session._id });

    // 6. Create a fresh session (generates new access & rotated refresh token)
    return this.createSession(user, userAgent || session.userAgent || '');
  }

  static async revokeSession(refreshToken?: string) {
    if (!refreshToken) return;
    const tokenHash = this.hashRefreshToken(refreshToken);
    // Only delete the specific session document
    await RefreshToken.deleteOne({ tokenHash });
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

    const cleanAdminPassword = adminPassword.trim();
    const cleanPassword = (password || '').trim();

    // 2. Validate password (bcrypt comparison supports both hashed and legacy plaintext env values)
    const isPasswordValid = cleanAdminPassword.startsWith('$2') 
      ? await bcrypt.compare(cleanPassword, cleanAdminPassword)
      : cleanPassword === cleanAdminPassword;

    if (!password) {
      throw new ApiError(200, 'SILENT_ADMIN_ABORT');
    }

    if (!isPasswordValid) {
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

  static async adminLogin(email: string, password: string, ip: string, userAgent: string) {
    const cleanEmail = canonicalizeEmail(email);

    // 1. Check Lockout
    const lockoutRecord = await FailedLoginAttempt.findOne({ email: cleanEmail });
    if (lockoutRecord && lockoutRecord.lockoutUntil && lockoutRecord.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil((lockoutRecord.lockoutUntil.getTime() - Date.now()) / 1000 / 60);
      throw new ApiError(429, `Account temporarily locked due to excessive failed attempts. Try again in ${remainingTime} minutes.`);
    }

    // 2. Find Admin User
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const adminEmails = getAdminEmails();
    const isAdminEmail = adminEmails.some(addr => isSameEmail(cleanEmail, addr));
    const isAdminRole = ['super_admin', 'main_admin', 'moderator', 'support_admin', 'order_manager', 'content_manager', 'admin'].includes(user.role);

    if (!isAdminEmail && !isAdminRole) {
      throw new ApiError(403, 'Access denied. You do not have administrative privileges.');
    }

    // 3. Verify Password
    if (!user.passwordHash) {
      throw new ApiError(401, 'Admin password is not set. Please contact the Super Admin.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      let attempts = 1;
      let lockoutUntil: Date | null = null;
      if (lockoutRecord) {
        attempts = lockoutRecord.attempts + 1;
        if (attempts >= 5) {
          lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
        }
      }
      await FailedLoginAttempt.findOneAndUpdate(
        { email: cleanEmail },
        {
          attempts,
          lockoutUntil: lockoutUntil || undefined,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
        { upsert: true, new: true }
      );
      if (attempts >= 5) {
        throw new ApiError(429, 'Too many failed login attempts. Account locked for 15 minutes.');
      } else {
        throw new ApiError(401, `Invalid credentials. ${5 - attempts} attempts remaining.`);
      }
    }

    // Clear logs upon successful validation
    await FailedLoginAttempt.deleteOne({ email: cleanEmail });

    user.lastLogin = new Date();
    await user.save();

    const userWith2fa = await User.findById(user._id).select('+twoFactorEnabled');
    const publicUser = {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    // All admin accounts must use 2FA — verify existing or force enrollment before issuing tokens
    if (userWith2fa?.twoFactorEnabled) {
      await setTwoFactorPending(user._id.toString());
      return {
        requires2FA: true as const,
        userId: user._id.toString(),
        user: publicUser,
        refreshToken: '',
        accessToken: '',
      };
    }

    await setTwoFactorPending(user._id.toString());
    return {
      requires2FASetup: true as const,
      userId: user._id.toString(),
      user: publicUser,
      refreshToken: '',
      accessToken: '',
    };
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
    const existingOtp = await OtpVerification.findOne({ email: cleanEmail, type: 'auth' });
    if (existingOtp) {
      logger.warn(`[OTP OVERWRITE DETECTED] An active OTP created at ${existingOtp.createdAt} for ${cleanEmail} is being invalidated and overwritten by a new request. This is likely due to duplicate triggers or user clicking resend.`);
    }

    // We no longer delete existing OTPs here. This allows users who click "Resend" 
    // multiple times to use ANY of the unexpired OTPs they receive in their email,
    // fixing the issue where entering the first received OTP fails because the second click invalidated it.

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
      maxAttempts: OTP_MAX_ATTEMPTS,
      exhausted: false,
      type: 'auth',
      expiresAt
    });

    logger.info(`[OTP CREATED] Active OTP record successfully stored for ${cleanEmail}. Timestamp: ${otpRecord.createdAt}. Expiration: ${expiresAt}.`);

    // 7. Log this successful request to enforce future rate limits
    await OtpRequestLog.create({
      ip,
      email: cleanEmail,
      action: 'request'
    });

    // 8. Send beautifully designed OTP email asynchronously
    const { sendDirectEmail } = require('./notificationService');
    const { getOtpEmailTemplate } = require('../utils/emailTemplates');
    try {
      sendDirectEmail({
        email: cleanEmail,
        subject: 'Your Siri Arts Security Code',
        customHtml: getOtpEmailTemplate(otp, expiryMinutes),
        type: 'security',
        action: 'otp_auth'
      });
    } catch (err: any) {
      // Clean up the OTP verification record from MongoDB so it doesn't count against rate limits or leave dead records
      await OtpVerification.deleteOne({ _id: otpRecord._id });
      // Delete the request log as well so they can try again immediately
      await OtpRequestLog.deleteOne({ email: cleanEmail, action: 'request', createdAt: { $gte: new Date(Date.now() - 10000) } });
      logger.error(`[OTP QUEUE ERROR] Failed to enqueue OTP email for ${cleanEmail}:`, err);
      throw new ApiError(500, `Failed to queue email delivery. Please try again.`);
    }

    // Always log in development for easier testing and recovery
    if (process.env.NODE_ENV === 'development') {
      logger.info(`Verification code successfully generated for ${cleanEmail}`);
    }

    return otp;
  }

  static async verifyOTP(email: string, otp: string, ip: string = '127.0.0.1', userAgent: string = '') {
    if (!email || !otp) {
      throw new ApiError(400, 'Email and OTP are required');
    }

    const cleanEmail = canonicalizeEmail(email);

    // Concurrency & duplicate verification check
    const cacheKey = `${cleanEmail}:${otp}`;
    const recentVerification = recentlyVerifiedOtps.get(cacheKey);
    if (recentVerification && (Date.now() - recentVerification.verifiedAt) < 10000) {
      logger.info(`[OTP CONCURRENCY RESILIENCE] Duplicate concurrent OTP verification request allowed for ${cleanEmail}`);
      return recentVerification.session;
    }

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

    // Find all active OTP verification records for this user (they might have clicked resend, generating multiple valid OTPs)
    const otpRecords = await OtpVerification.find({ email: cleanEmail, type: 'auth' }).sort({ createdAt: -1 });

    if (otpRecords.length === 0) {
      logger.warn(`[OTP VERIFICATION FAIL] No active OTP record found in DB for: ${cleanEmail}`);
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    let matchedRecord = null;
    let latestRecord = otpRecords[0];

    // 2. Validate Expiration (in case MongoDB TTL index hasn't run yet)
    if (new Date() > latestRecord.expiresAt) {
      logger.warn(`[OTP EXPIRED] OTP created at ${latestRecord.createdAt} for ${cleanEmail} has expired at: ${latestRecord.expiresAt}`);
      await OtpVerification.deleteMany({ email: cleanEmail, type: 'auth' });
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    const maxAttempts = latestRecord.maxAttempts ?? OTP_MAX_ATTEMPTS;

    if (latestRecord.exhausted || latestRecord.attempts >= maxAttempts) {
      logger.error(`[OTP EXCEEDED LIMIT] OTP exhausted for ${cleanEmail}.`);
      await OtpVerification.updateOne({ _id: latestRecord._id }, { $set: { exhausted: true } });
      throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
    }

    // 4. Verify OTP Match across all active records
    const isBypassConfigured = process.env.BYPASS_OTP_CODE && otp === process.env.BYPASS_OTP_CODE;
    const isDevBypass = process.env.NODE_ENV === 'development' && isBypassConfigured;
    if (isDevBypass) {
      logger.warn(`[OTP BYPASS] Bypass code used for ${cleanEmail}.${isBypassConfigured ? ' (Configured via BYPASS_OTP_CODE)' : ' (Development default)'}`);
    }

    for (const record of otpRecords) {
      // Skip expired or exhausted records
      if (new Date() > record.expiresAt || record.exhausted) continue;
      
      const isMatch = isDevBypass || await bcrypt.compare(otp, record.otpHash);
      if (isMatch) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) {
      await OtpRequestLog.create({
        ip,
        email: cleanEmail,
        action: 'verify_fail'
      });

      const updated = await OtpVerification.findOneAndUpdate(
        { _id: latestRecord._id, exhausted: false },
        { $inc: { attempts: 1 } },
        { new: true }
      );

      const attemptCount = updated?.attempts ?? latestRecord.attempts + 1;
      logger.warn(
        `[OTP VERIFICATION FAILED MATCH] Incorrect OTP for ${cleanEmail}. Attempts: ${attemptCount}/${maxAttempts}`
      );

      if (updated && attemptCount >= maxAttempts) {
        // If max attempts reached on the latest record, exhaust ALL active records
        await OtpVerification.updateMany({ email: cleanEmail, type: 'auth' }, { $set: { exhausted: true } });
        throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
      }

      throw new ApiError(400, 'Invalid or expired OTP');
    }

    // 5. Verification Successful: Single-Use Cleanup (Delete ALL OTP records for this email to prevent reuse)
    const deletedStatus = await OtpVerification.deleteMany({ email: cleanEmail, type: 'auth' });
    if (deletedStatus.deletedCount === 0) {
      logger.warn(`[OTP CONCURRENCY RACE] OTP for ${cleanEmail} was consumed by a concurrent verification request.`);
      throw new ApiError(400, 'Invalid or expired OTP (consumed by another active session)');
    }

    logger.info(`[OTP VERIFICATION SUCCESS] OTP successfully verified and consumed for ${cleanEmail} in ${latestRecord.attempts + 1} attempt(s).`);

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

      // Admin Real-time Notification
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

    // Security Alert: Send New Login Detection email
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
      recentlyVerifiedOtps.set(cacheKey, {
        email: cleanEmail,
        verifiedAt: Date.now(),
        session: pendingResult as any,
      });
      return pendingResult;
    }

    const session = await this.createSession(user, userAgent);

    // Cache the successful verification to absorb duplicate concurrent hits
    recentlyVerifiedOtps.set(cacheKey, {
      email: cleanEmail,
      verifiedAt: Date.now(),
      session
    });

    // Clean up expired cache items to prevent memory leaks
    for (const [key, val] of recentlyVerifiedOtps.entries()) {
      if (Date.now() - val.verifiedAt > 30000) {
        recentlyVerifiedOtps.delete(key);
      }
    }

    return session;
  }

  static async generateCodOTP(email: string, ip: string = '127.0.0.1') {
    if (!email || !email.includes('@')) {
      throw new ApiError(400, 'A valid email address is required');
    }

    const cleanEmail = canonicalizeEmail(email);

    // We no longer delete existing OTPs here to allow multiple valid OTPs (if clicked resend multiple times)
    // await OtpVerification.deleteMany({ email: cleanEmail, type: 'cod' });

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
      type: 'cod',
      expiresAt
    });

    // 5. Send custom COD email asynchronously
    const { sendDirectEmail } = require('./notificationService');
    const { getCodOtpEmailTemplate } = require('../utils/emailTemplates');
    try {
      sendDirectEmail({
        email: cleanEmail,
        subject: '✦ Cash on Delivery Verification Code ✦ Siri Arts & Crafts',
        customHtml: getCodOtpEmailTemplate(otp, 5),
        type: 'security',
        action: 'cod_otp'
      });
    } catch (err: any) {
      await OtpVerification.deleteOne({ email: cleanEmail, type: 'cod' });
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

    const otpRecords = await OtpVerification.find({ email: cleanEmail, type: 'cod' }).sort({ createdAt: -1 });
    if (otpRecords.length === 0) {
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    const latestRecord = otpRecords[0];

    if (new Date() > latestRecord.expiresAt) {
      await OtpVerification.deleteMany({ email: cleanEmail, type: 'cod' });
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    // SECURITY: BYPASS_OTP_CODE is only allowed in development mode
    const isBypassConfigured = process.env.NODE_ENV === 'development' && process.env.BYPASS_OTP_CODE && otp === process.env.BYPASS_OTP_CODE;
    
    let isMatch = false;
    for (const record of otpRecords) {
      if (new Date() > record.expiresAt) continue;
      if (isBypassConfigured || await bcrypt.compare(otp, record.otpHash)) {
        isMatch = true;
        break;
      }
    }

    if (!isMatch) {
      latestRecord.attempts += 1;
      if (latestRecord.attempts >= 5) {
        await OtpVerification.deleteMany({ email: cleanEmail, type: 'cod' });
        throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
      } else {
        await latestRecord.save();
      }
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    await OtpVerification.deleteMany({ email: cleanEmail, type: 'cod' });
    return true;
  }
}

export default AuthService;
