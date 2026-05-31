import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import RefreshToken from '../models/RefreshToken';
import PasswordResetToken from '../models/PasswordResetToken';
import OtpRequestLog from '../models/OtpRequestLog';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { isSameEmail, canonicalizeEmail } from '../utils/emailHelper';
import { getAdminEmails } from '../config/adminConfig';
import { setTwoFactorPending } from '../utils/twoFactorPending';
import UsedRefreshToken from '../models/UsedRefreshToken';
import OtpVerification, { OTP_MAX_ATTEMPTS } from '../models/OtpVerification';
import FailedLoginAttempt from '../models/FailedLoginAttempt';
import { cacheOtpSession, getCachedOtpSession } from '../utils/otpVerifyCache';
import { recordOtpVerifyFailure } from '../utils/otpRateLimit';

class AuthService {
  /** Strip non-digits and enforce 6-digit OTP shape. */
  static normalizeOtpInput(otp: string): string {
    return String(otp || '').replace(/\D/g, '').slice(0, 6);
  }

  static getOtpExpiryMinutes(): number {
    const parsed = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  }
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
      const timeSinceUsedMs = Date.now() - (isUsed as any).createdAt.getTime();
      const GRACE_PERIOD_MS = 15000;

      if (timeSinceUsedMs < GRACE_PERIOD_MS) {
        logger.warn(`[AUTH] Grace period overlap detected for userId: ${isUsed.userId}. Returning 409 Conflict without revoking sessions.`);
        throw new ApiError(409, 'Session refreshed concurrently in another tab.');
      }

      // Replay detected outside grace period — revoke entire refresh-token family (RFC 6749 rotation)
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
    try {
      await UsedRefreshToken.create({
        tokenHash,
        userId: user._id,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent || userAgent,
      });
    } catch (err: any) {
      if (err.name === 'MongoServerError' && err.code === 11000) {
        throw new ApiError(401, 'Session expired or refresh conflict. Please log in again.');
      }
      throw err;
    }

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
      throw new ApiError(400, 'Admin password is required');
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
        logger.warn('[AUTH_FAILURE] Admin account lockout due to excessive failed password attempts', { email: cleanEmail });
        throw new ApiError(429, 'Too many failed login attempts. Your account has been temporarily locked for 15 minutes.');
      } else {
        logger.warn('[AUTH_FAILURE] Invalid admin credentials provided', { email: cleanEmail, attempts });
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
    
    // Timing attack mitigation: always perform a bcrypt comparison.
    // The hash here corresponds to 'dummy_password' with 12 salt rounds to keep timing consistent.
    const DUMMY_HASH = '$2a$12$R9h/cIPz0gi.URNNX3rub2A9WEjRRO.h1.2/n3hD0A3w.dG0uG.0i';
    const isMatch = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);

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
        logger.warn('[AUTH_FAILURE] Admin account lockout due to excessive failed login attempts', { email: cleanEmail, ip });
        throw new ApiError(429, 'Too many failed login attempts. Account locked for 15 minutes.');
      } else {
        logger.warn('[AUTH_FAILURE] Invalid admin login credentials provided', { email: cleanEmail, attempts, ip });
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

    // We no longer delete prior OTPs. This allows users to use older OTPs if emails arrive out of order, 
    // significantly improving UX. All OTPs will expire automatically via the TTL index.

    // 4. Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // 5. Securely hash the OTP using bcrypt (prevent database leak lookup attacks)
    const salt = await bcrypt.genSalt(12);
    const otpHash = await bcrypt.hash(otp, salt);

    // 6. Save OTP in MongoDB with configured expiry
    const expiryMinutes = this.getOtpExpiryMinutes();
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

    // 8. Send OTP email asynchronously in the background to keep the API response instant
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
      logger.error(`[OTP EMAIL ERROR] Failed to initiate OTP email for ${cleanEmail}:`, err?.message || err);
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
    const normalizedOtp = this.normalizeOtpInput(otp);

    if (normalizedOtp.length !== 6) {
      throw new ApiError(400, 'Verification code must be exactly 6 digits');
    }

    // Redis idempotency for duplicate concurrent verify (multi-instance safe)
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
        throw new ApiError(429, 'Too many failed verification attempts. Your IP has been temporarily restricted for 15 minutes.');
      }
    }

    // Generous clock skew allowance (5 minutes) to prevent issues with server time drifts
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
    logger.info(`[OTP VERIFY DEBUG] Found ${otpRecords.length} active OTP records for ${cleanEmail}. Testing normalized OTP: '${normalizedOtp}'`);
    for (const record of otpRecords) {
      const isMatch = isBypassConfigured || (await bcrypt.compare(normalizedOtp, record.otpHash));
      logger.info(`[OTP VERIFY DEBUG] Comparing against record ${record._id} (created at ${record.createdAt}). Match result: ${isMatch}`);
      if (isMatch) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) {
      logger.error(`[OTP VERIFY DEBUG] No matches found for ${cleanEmail}. The provided OTP did not match any stored hashes.`);
      await OtpRequestLog.create({ ip, email: cleanEmail, action: 'verify_fail' });
      await recordOtpVerifyFailure(ip);

      const updated = await OtpVerification.findOneAndUpdate(
        { _id: activeRecord._id, exhausted: false },
        { $inc: { attempts: 1 } },
        { new: true }
      );

      const attemptCount = updated?.attempts ?? activeRecord.attempts + 1;
      logger.warn(
        `[OTP VERIFY FAIL] Invalid code for ${cleanEmail}. Attempt ${attemptCount}/${maxAttempts}`
      );

      if (updated && attemptCount >= maxAttempts) {
        logger.warn('[AUTH_FAILURE] Max OTP verification attempts exceeded', { email: cleanEmail, ip });
        await OtpVerification.updateMany({ email: cleanEmail, type: 'auth' }, { $set: { exhausted: true } });
        throw new ApiError(429, 'Max verification attempts exceeded. Please request a new OTP.');
      }

      throw new ApiError(400, 'Invalid or expired OTP');
    }

    // Atomic consume: delete matched record; if already consumed, serve from cache
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

    await OtpVerification.deleteMany({ email: cleanEmail, type: 'auth' });

    logger.info(`[OTP VERIFY OK] Code consumed for ${cleanEmail} (attempts: ${consumed.attempts + 1})`);

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
      
      // Always default public registration to customer role
      const role = 'customer';

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
      await cacheOtpSession(cleanEmail, normalizedOtp, pendingResult);
      return pendingResult;
    }

    const session = await this.createSession(user, userAgent);
    await cacheOtpSession(cleanEmail, normalizedOtp, session);

    return session;
  }

  static validatePasswordComplexity(password: string): void {
    if (password.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      throw new ApiError(400, 'Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new ApiError(400, 'Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new ApiError(400, 'Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new ApiError(400, 'Password must contain at least one special character');
    }
  }

  static async revokeAllSessions(userId: string) {
    await RefreshToken.deleteMany({ userId });
    await UsedRefreshToken.deleteMany({ userId });
  }

  static async generateAdminPasswordResetToken(email: string, ip: string): Promise<string> {
    const cleanEmail = canonicalizeEmail(email);

    // Prevent enumeration via timing attack
    const user = await User.findOne({ email: cleanEmail }).select('role');
    const dummyHash = await bcrypt.hash('dummy', 12); // Standardize request time

    const adminRoles = ['super_admin', 'main_admin', 'moderator', 'support_admin', 'order_manager', 'content_manager', 'admin'];
    if (!user || !adminRoles.includes(user.role)) {
      await bcrypt.compare('dummy', dummyHash);
      return ''; // Return empty, generic response will be sent
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordResetToken.deleteMany({ email: cleanEmail });
    await PasswordResetToken.create({
      email: cleanEmail,
      tokenHash,
      expiresAt,
    });

    return token;
  }

  static async resetAdminPassword(email: string, token: string, newPassword: string) {
    const cleanEmail = canonicalizeEmail(email);

    this.validatePasswordComplexity(newPassword);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await PasswordResetToken.findOne({
      email: cleanEmail,
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      throw new ApiError(400, 'Invalid or expired password reset token');
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      throw new ApiError(400, 'User not found');
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    // Subtract 1 second to ensure new timestamp is reliably before new tokens are issued
    user.passwordChangedAt = new Date(Date.now() - 1000); 
    await user.save();

    await PasswordResetToken.deleteOne({ _id: resetRecord._id });
    await this.revokeAllSessions(user._id.toString());
  }

  static async generateCodOTP(email: string, ip: string = '127.0.0.1') {
    if (!email || !email.includes('@')) {
      throw new ApiError(400, 'A valid email address is required');
    }

    const cleanEmail = canonicalizeEmail(email);

    // 2. Generate cryptographically secure 4-digit OTP
    const otp = crypto.randomInt(1000, 9999).toString();

    // 3. Hash the OTP using bcrypt
    const salt = await bcrypt.genSalt(12);
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

    // Generous clock skew allowance (5 minutes)
    const otpClockSkewMs = 5 * 60 * 1000;
    const expiryGraceCutoff = new Date(Date.now() - otpClockSkewMs);

    const otpRecords = await OtpVerification.find({ 
      email: cleanEmail, 
      type: 'cod',
      expiresAt: { $gt: expiryGraceCutoff }
    }).sort({ createdAt: -1 });

    if (otpRecords.length === 0) {
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    // SECURITY: BYPASS_OTP_CODE is only allowed in development mode
    const isBypassConfigured = process.env.NODE_ENV === 'development' && process.env.BYPASS_OTP_CODE && otp === process.env.BYPASS_OTP_CODE;
    
    let isMatch = false;
    let matchedRecord: (typeof otpRecords)[0] | null = null;
    let latestRecord = otpRecords[0];
    for (const record of otpRecords) {
      if (new Date() > record.expiresAt) continue;
      if (isBypassConfigured || await bcrypt.compare(otp, record.otpHash)) {
        isMatch = true;
        matchedRecord = record;
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

    // Atomic consume: prevent race condition where parallel requests verify the same OTP
    const consumed = await OtpVerification.findOneAndDelete({
      _id: matchedRecord!._id,
      email: cleanEmail,
      type: 'cod',
    });

    if (!consumed) {
      logger.warn(`[COD OTP RACE] OTP already consumed for ${cleanEmail}`);
      throw new ApiError(400, 'Verification code already used. Please request a new one.');
    }

    // Clean up remaining COD OTPs for this email
    await OtpVerification.deleteMany({ email: cleanEmail, type: 'cod' });
    return true;
  }
}

export default AuthService;
