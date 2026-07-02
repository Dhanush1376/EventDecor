import { Request, Response, NextFunction } from 'express';
import MaintenanceService from '../../services/MaintenanceService';
import mongoose from 'mongoose';
import { MaintenanceMode } from '../../models/MaintenanceConfig';
import MaintenanceAuditLog from '../../models/MaintenanceAuditLog';
import SessionAuthService from '../../services/SessionAuthService';
import logger from '../../config/logger';

export const authenticateGateway = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Verify password and role
    await MaintenanceService.authenticateSuperAdmin(email, password, { ip, userAgent });

    const otp = await MaintenanceService.generateMaintenanceOTP(email, { ip, userAgent });

    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV ONLY] Maintenance OTP for ${email}: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: 'Authentication successful. OTP sent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

export const verifyGatewayOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Verify OTP
    await MaintenanceService.verifyMaintenanceOTP(email, otp, { ip, userAgent });

    // Fetch the actual user
    const actualUser = await mongoose.model('User').findOne({ email });
    if (!actualUser) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Generate Maintenance Session
    const session = await MaintenanceService.createMaintenanceSession(
      actualUser._id,
      email,
      ip,
      userAgent,
    );

    // ALSO generate a standard JWT session so the admin can use the dashboard
    const standardSession = await SessionAuthService.createSession(actualUser, userAgent);

    res.status(200).json({
      success: true,
      message: 'Maintenance session established.',
      data: {
        maintenanceToken: session.token,
        expiresAt: session.expiresAt,
        token: standardSession.accessToken,
        refreshToken: standardSession.refreshToken,
        user: {
          id: actualUser._id,
          email: actualUser.email,
          role: actualUser.role,
          name: actualUser.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMaintenanceStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await MaintenanceService.getMaintenanceState();
    res.status(200).json({
      success: true,
      data: state,
    });
  } catch (error) {
    next(error);
  }
};

export const enableMaintenance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mode, reason } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const userAgent = req.get('User-Agent') || 'unknown';
    const adminId = (req as any).user?.id;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const config = await MaintenanceService.enableMaintenance(
      mode as MaintenanceMode,
      reason,
      new mongoose.Types.ObjectId(adminId),
      { ip, userAgent },
    );

    res.status(200).json({
      success: true,
      message: 'Maintenance mode enabled',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const disableMaintenance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    const userAgent = req.get('User-Agent') || 'unknown';
    const adminId = (req as any).user?.id;

    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const config = await MaintenanceService.disableMaintenance(
      new mongoose.Types.ObjectId(adminId),
      { ip, userAgent },
    );

    res.status(200).json({
      success: true,
      message: 'Maintenance mode disabled',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await MaintenanceAuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutGateway = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers['x-maintenance-token'] as string;
    if (token) {
      await MaintenanceService.revokeSession(token);
    }
    res.status(200).json({ success: true, message: 'Maintenance session revoked' });
  } catch (error) {
    next(error);
  }
};
