import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import PasswordResetToken from '../models/PasswordResetToken';
import FailedLoginAttempt from '../models/FailedLoginAttempt';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { isSameEmail, canonicalizeEmail } from '../utils/emailHelper';
import { getAdminEmails, STAFF_ROLES } from '../config/adminConfig';
import { setTwoFactorPending } from '../utils/twoFactorPending';
import SessionAuthService from './SessionAuthService';

class AdminAuthService {
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

  static async checkAdminPassword(email: string, password?: string): Promise<void> {
    const cleanEmail = canonicalizeEmail(email);
    const adminEmails = getAdminEmails();

    const isAdmin = adminEmails.some((addr) => isSameEmail(cleanEmail, addr));
    if (!isAdmin) {
      return;
    }

    const lockoutRecord = await FailedLoginAttempt.findOne({ email: cleanEmail });
    if (lockoutRecord && lockoutRecord.lockoutUntil && lockoutRecord.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil(
        (lockoutRecord.lockoutUntil.getTime() - Date.now()) / 1000 / 60,
      );
      throw new ApiError(
        429,
        `This account has been temporarily locked due to excessive failed attempts. Please try again after ${remainingTime} minutes.`,
      );
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new ApiError(500, 'Admin password is not configured on server');
    }

    const cleanAdminPassword = adminPassword.trim();
    const cleanPassword = (password || '').trim();

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
        { upsert: true, returnDocument: 'after' },
      );

      if (attempts >= 5) {
        logger.warn(
          '[AUTH_FAILURE] Admin account lockout due to excessive failed password attempts',
          { email: cleanEmail },
        );
        throw new ApiError(
          429,
          'Too many failed login attempts. Your account has been temporarily locked for 15 minutes.',
        );
      } else {
        logger.warn('[AUTH_FAILURE] Invalid admin credentials provided', {
          email: cleanEmail,
          attempts,
        });
        throw new ApiError(
          401,
          `Invalid admin security credentials. ${5 - attempts} attempts remaining before temporary lockout.`,
        );
      }
    }

    await FailedLoginAttempt.deleteOne({ email: cleanEmail });
  }

  static async adminLogin(email: string, password: string, ip: string, userAgent: string) {
    const cleanEmail = canonicalizeEmail(email);

    const lockoutRecord = await FailedLoginAttempt.findOne({ email: cleanEmail });
    if (lockoutRecord && lockoutRecord.lockoutUntil && lockoutRecord.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil(
        (lockoutRecord.lockoutUntil.getTime() - Date.now()) / 1000 / 60,
      );
      throw new ApiError(
        429,
        `Account temporarily locked due to excessive failed attempts. Try again in ${remainingTime} minutes.`,
      );
    }

    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');

    const DUMMY_HASH = '$2a$12$R9h/cIPz0gi.URNNX3rub2A9WEjRRO.h1.2/n3hD0A3w.dG0uG.0i';
    const isMatch = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);

    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const adminEmails = getAdminEmails();
    const isAdminEmail = adminEmails.some((addr) => isSameEmail(cleanEmail, addr));
    const isAdminRole = (STAFF_ROLES as readonly string[]).includes(user.role);

    if (!isAdminEmail && !isAdminRole) {
      throw new ApiError(403, 'Access denied. You do not have administrative privileges.');
    }

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
        { upsert: true, returnDocument: 'after' },
      );
      if (attempts >= 5) {
        logger.warn('[AUTH_FAILURE] Admin account lockout due to excessive failed login attempts', {
          email: cleanEmail,
          ip,
        });
        throw new ApiError(429, 'Too many failed login attempts. Account locked for 15 minutes.');
      } else {
        logger.warn('[AUTH_FAILURE] Invalid admin login credentials provided', {
          email: cleanEmail,
          attempts,
          ip,
        });
        throw new ApiError(401, `Invalid credentials. ${5 - attempts} attempts remaining.`);
      }
    }

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

  static async generateAdminPasswordResetToken(email: string, ip: string): Promise<string> {
    const cleanEmail = canonicalizeEmail(email);

    const user = await User.findOne({ email: cleanEmail }).select('role');
    const dummyHash = await bcrypt.hash('dummy', 12);

    const adminRoles = [
      'super_admin',
      'main_admin',
      'moderator',
      'support_admin',
      'order_manager',
      'content_manager',
      'admin',
    ];
    if (!user || !adminRoles.includes(user.role)) {
      await bcrypt.compare('dummy', dummyHash);
      return '';
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
    user.passwordChangedAt = new Date(Date.now() - 1000);
    await user.save();

    await PasswordResetToken.deleteOne({ _id: resetRecord._id });
    await SessionAuthService.revokeAllSessions(user._id.toString());
  }
}

export default AdminAuthService;
