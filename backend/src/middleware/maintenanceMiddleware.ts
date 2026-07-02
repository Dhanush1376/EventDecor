import { Request, Response, NextFunction } from 'express';
import MaintenanceService from '../services/MaintenanceService';
import logger from '../config/logger';

// List of paths that should always bypass maintenance mode
const whitelistedPaths = [
  '/api/health',
  '/api/v1/health',
  '/api/readiness',
  '/api/v1/readiness',
  '/api/csrf-token',
  '/api/v1/csrf-token',
  '/api/v1/maintenance/gateway/authenticate',
  '/api/v1/maintenance/gateway/verify-otp',
  '/api/v1/maintenance/gateway/resend-otp',
  '/api/v1/maintenance/status',
  '/api/v1/orders/webhook',
];

export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { active, mode } = await MaintenanceService.getMaintenanceState();

    if (!active) {
      return next();
    }

    const path = (req.originalUrl || req.url).split('?')[0];

    // Check whitelist
    if (whitelistedPaths.some((p) => path === p || path.startsWith(p + '/'))) {
      return next();
    }

    // Check for active maintenance session via custom header or cookie
    const maintenanceToken =
      (req.headers['x-maintenance-token'] as string) || req.cookies?.maintenance_session;
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';

    if (maintenanceToken) {
      const isValid = await MaintenanceService.validateMaintenanceSession(maintenanceToken, ip);
      if (isValid) {
        // Super Admin using maintenance session, bypass restrictions
        (req as any).isMaintenanceSession = true;
        return next();
      }
    }

    // Determine behavior based on mode
    if (mode === 'public_maintenance') {
      // Normal admin JWT check (Admin bypass is not allowed in this implementation unless using Maintenance session)
      // Actually, per requirements: "Regular admins must not be able to log into the admin panel."
      // So we block all requests that don't have a valid maintenance session
      res.set('Retry-After', '3600');
      return res.status(503).json({
        success: false,
        message: 'The system is currently undergoing scheduled maintenance.',
        maintenance: true,
      });
    }

    if (mode === 'read_only') {
      // Allow GET/HEAD/OPTIONS for public, but block mutating requests
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      } else {
        return res.status(503).json({
          success: false,
          message:
            'The system is in read-only mode during maintenance. Modifications are temporarily disabled.',
          maintenance: true,
        });
      }
    }

    if (mode === 'full_lockdown') {
      // Block absolutely everything not in whitelist or having maintenance session
      res.set('Retry-After', '3600');
      return res.status(503).json({
        success: false,
        message: 'The system is currently under full lockdown.',
        maintenance: true,
      });
    }

    return next();
  } catch (error) {
    logger.error('Error in maintenance middleware:', error);
    // Fail open in case of DB error during middleware execution to prevent total outage if config collection breaks
    return next();
  }
};
