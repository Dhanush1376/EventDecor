import crypto from 'crypto';
import mongoose from 'mongoose';
import MaintenanceConfig, { MaintenanceMode } from '../models/MaintenanceConfig';
import MaintenanceSession from '../models/MaintenanceSession';
import MaintenanceAuditLog from '../models/MaintenanceAuditLog';
import StoreSettings from '../models/StoreSettings';
import User from '../models/User';
import OtpVerification from '../models/OtpVerification';
import { getSuperAdminEmail } from '../config/adminConfig';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

class MaintenanceService {
  private static stateCache: {
    mode: MaintenanceMode;
    timestamp: number;
  } | null = null;
  private static CACHE_TTL_MS = 5000; // 5 seconds cache for middleware

  /**
   * Get the current maintenance state, optimized for high-frequency middleware checks.
   */
  static async getMaintenanceState(): Promise<{ active: boolean; mode: MaintenanceMode }> {
    const now = Date.now();
    if (this.stateCache && now - this.stateCache.timestamp < this.CACHE_TTL_MS) {
      return {
        active: this.stateCache.mode !== 'off',
        mode: this.stateCache.mode,
      };
    }

    let config = await MaintenanceConfig.findOne();
    if (!config) {
      config = await MaintenanceConfig.create({});
    }

    this.stateCache = {
      mode: config.mode,
      timestamp: now,
    };

    return {
      active: config.mode !== 'off',
      mode: config.mode,
    };
  }

  static async enableMaintenance(
    mode: MaintenanceMode,
    reason: string,
    adminId: mongoose.Types.ObjectId,
    reqData: { ip: string; userAgent: string },
  ) {
    if (mode === 'off') throw new ApiError(400, 'Invalid mode to enable maintenance');

    let config = await MaintenanceConfig.findOne();
    if (!config) config = new MaintenanceConfig();

    config.mode = mode;
    config.enabledAt = new Date();
    config.enabledBy = adminId;
    config.reason = reason;
    config.version += 1;
    await config.save();

    // Sync legacy setting
    await StoreSettings.updateOne(
      {},
      { $set: { 'general.maintenanceMode': true, 'general.maintenanceConfigRef': config._id } },
    );

    this.stateCache = { mode: config.mode, timestamp: Date.now() };

    await this.logAction('enable_maintenance', 'success', { mode, reason }, adminId, reqData);

    return config;
  }

  static async disableMaintenance(
    adminId: mongoose.Types.ObjectId,
    reqData: { ip: string; userAgent: string },
  ) {
    const config = await MaintenanceConfig.findOne();
    if (!config) return;

    config.mode = 'off';
    config.enabledAt = null;
    config.enabledBy = null;
    config.version += 1;
    await config.save();

    // Sync legacy setting
    await StoreSettings.updateOne(
      {},
      { $set: { 'general.maintenanceMode': false, 'general.maintenanceConfigRef': config._id } },
    );

    this.stateCache = { mode: 'off', timestamp: Date.now() };

    await this.logAction('disable_maintenance', 'success', {}, adminId, reqData);

    // End all active maintenance sessions for security
    await MaintenanceSession.updateMany({}, { isActive: false });

    return config;
  }

  // --- Session Management ---

  static hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async createMaintenanceSession(
    userId: mongoose.Types.ObjectId,
    email: string,
    ip: string,
    userAgent: string,
  ) {
    const token = crypto.randomBytes(48).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    await MaintenanceSession.create({
      userId,
      email,
      sessionTokenHash: tokenHash,
      ip,
      userAgent,
      expiresAt,
    });

    return { token, expiresAt };
  }

  static async validateMaintenanceSession(token: string, ip: string): Promise<boolean> {
    if (!token) return false;
    const tokenHash = this.hashToken(token);

    const session = await MaintenanceSession.findOne({
      sessionTokenHash: tokenHash,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) return false;

    // Check idle timeout
    const idleTimeMinutes = (Date.now() - session.lastActivity.getTime()) / (1000 * 60);
    if (idleTimeMinutes > session.idleTimeoutMinutes) {
      session.isActive = false;
      await session.save();
      return false;
    }

    // IP binding check (stricter than normal sessions)
    if (session.ip !== ip && process.env.NODE_ENV === 'production') {
      logger.warn(`[MAINTENANCE SEC] Session IP mismatch. Expected ${session.ip}, got ${ip}`);
      session.isActive = false;
      await session.save();
      return false;
    }

    // Update last activity
    session.lastActivity = new Date();
    await session.save();

    return true;
  }

  static async revokeSession(token: string) {
    if (!token) return;
    const tokenHash = this.hashToken(token);
    await MaintenanceSession.updateOne({ sessionTokenHash: tokenHash }, { isActive: false });
  }

  // --- Audit ---

  static async logAction(
    action: string,
    result: 'success' | 'failure',
    details: any,
    userId: mongoose.Types.ObjectId | undefined,
    reqData: { ip: string; userAgent: string; email?: string },
  ) {
    await MaintenanceAuditLog.create({
      userId,
      email: reqData.email,
      action,
      result,
      details,
      ip: reqData.ip || '0.0.0.0',
      userAgent: reqData.userAgent || 'unknown',
    });
  }
  // --- Auth & OTP ---

  static async authenticateSuperAdmin(
    email: string,
    password: string,
    reqData: { ip: string; userAgent: string },
  ) {
    const protectedEmail = getSuperAdminEmail();
    if (!protectedEmail || email.trim().toLowerCase() !== protectedEmail) {
      await this.logAction('auth_attempt', 'failure', { reason: 'not_super_admin' }, undefined, {
        ...reqData,
        email,
      });
      throw new ApiError(401, 'Unauthorized');
    }

    const user = await User.findOne({ email: protectedEmail }).select('+passwordHash +role');
    if (!user || !['super_admin', 'owner'].includes(user.role)) {
      await this.logAction(
        'auth_attempt',
        'failure',
        { reason: 'user_not_found_or_invalid_role' },
        undefined,
        { ...reqData, email },
      );
      throw new ApiError(401, 'Unauthorized');
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.passwordHash || '');
    if (!isMatch) {
      await this.logAction(
        'auth_attempt',
        'failure',
        { reason: 'invalid_password' },
        user._id as any,
        { ...reqData, email },
      );
      throw new ApiError(401, 'Invalid credentials');
    }

    await this.logAction('auth_attempt', 'success', {}, user._id as any, { ...reqData, email });
    return user;
  }

  static async generateMaintenanceOTP(email: string, reqData: { ip: string; userAgent: string }) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = this.hashToken(otp); // Reuse hash function
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Invalidate existing maintenance OTPs
    await OtpVerification.updateMany(
      { email, type: 'maintenance', exhausted: false },
      { $set: { exhausted: true } },
    );

    await OtpVerification.create({
      email,
      otpHash,
      type: 'maintenance',
      expiresAt,
    });

    await this.logAction('otp_generate', 'success', {}, undefined, { ...reqData, email });
    return otp; // The caller (controller) should send this via email service
  }

  static async verifyMaintenanceOTP(
    email: string,
    otp: string,
    reqData: { ip: string; userAgent: string },
  ) {
    const record = await OtpVerification.findOne({
      email,
      type: 'maintenance',
      exhausted: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      await this.logAction('otp_verify', 'failure', { reason: 'expired_or_not_found' }, undefined, {
        ...reqData,
        email,
      });
      throw new ApiError(401, 'OTP expired or not found');
    }

    if (record.attempts >= record.maxAttempts) {
      record.exhausted = true;
      await record.save();
      await this.logAction(
        'otp_verify',
        'failure',
        { reason: 'max_attempts_exceeded' },
        undefined,
        { ...reqData, email },
      );
      throw new ApiError(401, 'Maximum attempts exceeded. Request a new OTP.');
    }

    record.attempts += 1;
    const otpHash = this.hashToken(otp);

    if (record.otpHash !== otpHash) {
      await record.save();
      await this.logAction(
        'otp_verify',
        'failure',
        { reason: 'invalid_otp', attempt: record.attempts },
        undefined,
        { ...reqData, email },
      );
      throw new ApiError(401, 'Invalid OTP');
    }

    record.exhausted = true;
    await record.save();

    await this.logAction('otp_verify', 'success', {}, undefined, { ...reqData, email });
    return true;
  }
}

export default MaintenanceService;
