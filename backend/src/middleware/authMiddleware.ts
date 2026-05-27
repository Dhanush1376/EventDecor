import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import User from '../models/User';
import AdminAuditLog from '../models/AdminAuditLog';
import logger from '../config/logger';
import { updateRequestContext } from './requestTracker';
import { getAdminEmails, ADMIN_ROLES } from '../config/adminConfig';
import { isSameEmail } from '../utils/emailHelper';
import { getSafetyLockDocument } from '../utils/safetyLockCache';
import { getCachedSessionJson, setCachedSessionJson, sessionKeys } from '../utils/userSessionCache';

interface JwtPayload {
  id: string;
  role: string;
  email?: string;
  iat?: number;
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      _safetyLockChecked?: boolean;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET environment variable is not set. Authentication will fail.');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}
const jwtSecrets = JWT_SECRET ? JWT_SECRET.split(',').map(s => s.trim()) : [];

const verifyTokenWithRotation = (token: string): JwtPayload => {
  let lastError: any = null;
  for (const secret of jwtSecrets) {
    try {
      return jwt.verify(token, secret) as JwtPayload;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Invalid token');
};

/**
 * DRY helper: Log admin audit trail for mutating requests.
 */
const logAdminAudit = (req: Request, res: Response) => {
  const mutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (mutatingMethod) {
    res.once('finish', () => {
      const auditPayload = {
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      };
      
      logger.info('[ADMIN_ACTION] Admin operation completed', auditPayload);

      AdminAuditLog.create(auditPayload).catch((err) => logger.error('Failed to persist admin audit log', err));
    });
  }
};

/** Single safety-lock read per HTTP request (S-01 — shared by requireAdmin / requireSuperAdmin / requireRole). */
const checkSafetyLock = async (req: Request) => {
  if (req._safetyLockChecked) return;

  const mutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (!mutatingMethod) {
    req._safetyLockChecked = true;
    return;
  }

  const isSafetyLockToggle = req.originalUrl.includes('/cms/admin_safety_lock');
  if (isSafetyLockToggle) {
    req._safetyLockChecked = true;
    return;
  }

  const safetyLockDoc = await getSafetyLockDocument();

  req._safetyLockChecked = true;

  if (safetyLockDoc?.data?.safetyLock === true) {
    throw new ApiError(403, 'Global safety write override lock is active on the backend. Write operations are blocked.');
  }
};

export const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    // Silently throw 401 to prevent log spam for unauthenticated users
    throw new ApiError(401, 'Not authorized to access this route');
  }

  if (jwtSecrets.length === 0) {
    throw new ApiError(500, 'Server authentication configuration error');
  }

  try {
    const decoded = verifyTokenWithRotation(token);
    
    // Check Redis Session Cache first to avoid MongoDB lookup on every request
    const cacheKey = sessionKeys.profile(decoded.id);
    let user: any = await getCachedSessionJson(cacheKey);

    if (!user) {
      // Promise.race to enforce a strict timeout (3 seconds) if MongoDB is hanging
      const mongoQuery = User.findById(decoded.id).select('role email isVerified passwordChangedAt').lean().exec();
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('MongoDB Auth Lookup Timeout')), 10000));
      
      try {
        user = await Promise.race([mongoQuery, timeout]);
      } catch (dbErr: any) {
        if (dbErr.message === 'MongoDB Auth Lookup Timeout') {
          throw new ApiError(503, 'Authentication service temporarily unavailable');
        }
        throw dbErr;
      }

      if (user) {
        // Cache user profile in Redis for 60 seconds
        await setCachedSessionJson(cacheKey, user, 60);
      }
    }

    if (!user || !user.isVerified) {
      logger.warn(`requireAuth failed: User not found or not verified for ID ${decoded.id}`);
      throw new ApiError(401, 'Not authorized to access this route');
    }

    if (
      user.passwordChangedAt &&
      decoded.iat != null &&
      decoded.iat < Math.floor(new Date(user.passwordChangedAt).getTime() / 1000)
    ) {
      logger.warn(`requireAuth failed: Password changed since token issue for user ID ${decoded.id}`);
      throw new ApiError(401, 'Password changed. Please log in again.');
    }

    decoded.role = user.role;
    decoded.email = user.email;
    req.user = decoded;
    
    // Seed authenticated user ID to request correlation context
    updateRequestContext({ userId: decoded.id });
    
    next();
  } catch (err) {
    logger.warn(`requireAuth failed with error for route ${req.originalUrl}: ${err}`);
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'Not authorized to access this route');
  }
});

export const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next();

  if (jwtSecrets.length === 0) return next();

  try {
    const decoded = verifyTokenWithRotation(token);
    const user = await User.findById(decoded.id).select('role email isVerified passwordChangedAt');
    if (user && user.isVerified) {
      if (!(user.passwordChangedAt && decoded.iat != null && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000))) {
        decoded.role = user.role;
        decoded.email = user.email;
        req.user = decoded;
        updateRequestContext({ userId: decoded.id });
      }
    }
  } catch (err) {
    // Ignored: auth is optional
  }
  next();
});

export const publicTrackingAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { logisticsToken } = req.body;
  const trackingToken = String(req.query.token || req.body.token || '').trim();
  const orderId = req.params.id;

  const Order = require('../models/Order').default || require('../models/Order');
  const orderDoc = await Order.findById(orderId).select('+publicTrackingToken');
  if (!orderDoc) throw new ApiError(404, 'Order not found');

  let isAuthorized = false;
  let isLogisticsToken = false;

  // 1. Privileged staff Check
  if (req.user && ['admin', 'manager', 'coordinator'].includes(req.user.role)) {
    isAuthorized = true;
  }
  // 2. Validate using public tracking token
  else if (trackingToken) {
    const storedToken = orderDoc.publicTrackingToken || '';
    const provided = Buffer.from(trackingToken, 'hex');
    const expected = Buffer.from(storedToken, 'hex');
    isAuthorized =
      storedToken.length > 0 &&
      provided.length === expected.length &&
      crypto.timingSafeEqual(provided, expected);
  }
  // 3. Validate using JWT logistics token
  else if (logisticsToken) {
    try {
      const decoded = verifyTokenWithRotation(logisticsToken) as any;
      if (decoded && decoded.orderId === orderId && decoded.purpose === 'logistics') {
        isAuthorized = true;
        isLogisticsToken = true;
      }
    } catch (err) {
      // Token invalid or expired
    }
  }

  if (!isAuthorized) {
    throw new ApiError(403, 'Unauthorized. Invalid tracking credentials or logistics token.');
  }

  // Pass verification info via req
  (req as any).isLogisticsToken = isLogisticsToken;
  next();
});

export const requireAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    logger.warn(`requireAdmin failed: No req.user for path ${req.originalUrl}`);
    throw new ApiError(401, 'Authentication required');
  }

  if (ADMIN_ROLES.includes(req.user.role as any)) {
    await checkSafetyLock(req);
    logAdminAudit(req, res);
    next();
  } else {
    logger.warn(`requireAdmin failed: role ${req.user.role} not in ADMIN_ROLES for user ID ${req.user.id}`);
    throw new ApiError(403, 'Admin resource! Access denied');
  }
});

export const requireSuperAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const isSuperAdminRole = req.user.role === 'super_admin';
  if (isSuperAdminRole) {
    // --- UE-04: Backend safetyLock check for Mutating Admin Actions ---
    await checkSafetyLock(req);

    logAdminAudit(req, res);
    next();
  } else {
    throw new ApiError(403, 'Super Admin resource! Access denied');
  }
});

export const requireSuperAdminOrOwner = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const isOwner = req.user.role === 'owner';
  const isSuperAdmin = req.user.role === 'super_admin';

  if (isOwner || isSuperAdmin) {
    await checkSafetyLock(req);
    logAdminAudit(req, res);
    next();
  } else {
    throw new ApiError(403, 'Super Admin or Owner privileges required! Access denied');
  }
});

/**
 * Flexible RBAC middleware to allow specific roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    // Super Admin always gets access
    const isSuperAdmin = req.user.role === 'super_admin';
    if (isSuperAdmin || allowedRoles.includes(req.user.role)) {
      // --- UE-04: Backend safetyLock check for Mutating Admin Actions ---
      await checkSafetyLock(req);

      logAdminAudit(req, res);
      next();
    } else {
      throw new ApiError(403, 'Access denied. You do not have the required role for this action.');
    }
  });
};
