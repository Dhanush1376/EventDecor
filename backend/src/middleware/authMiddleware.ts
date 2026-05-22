import { Request, Response, NextFunction } from 'express';
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

// Validate JWT_SECRET exists at module load time
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  logger.error('FATAL: JWT_SECRET environment variable is not set. Authentication will fail.');
  process.exit(1);
}

/**
 * DRY helper: Log admin audit trail for mutating requests.
 */
const logAdminAudit = (req: Request, res: Response) => {
  const mutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (mutatingMethod) {
    res.once('finish', () => {
      AdminAuditLog.create({
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      }).catch((err) => logger.error('Failed to persist admin audit log', err));
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
    throw new ApiError(401, 'Not authorized to access this route');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError(500, 'Server authentication configuration error');
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    const user = await User.findById(decoded.id).select('role email isVerified passwordChangedAt');
    if (!user || !user.isVerified) {
      throw new ApiError(401, 'Not authorized to access this route');
    }

    if (
      user.passwordChangedAt &&
      decoded.iat != null &&
      decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      throw new ApiError(401, 'Password changed. Please log in again.');
    }

    decoded.role = user.role;
    decoded.email = user.email;
    req.user = decoded;
    
    // Seed authenticated user ID to request correlation context
    updateRequestContext({ userId: decoded.id });
    
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'Not authorized to access this route');
  }
});

export const requireAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const adminEmails = getAdminEmails();
  const userEmail = req.user.email?.trim()?.toLowerCase();
  
  if (ADMIN_ROLES.includes(req.user.role as any) || (userEmail && adminEmails.some(addr => isSameEmail(userEmail, addr)))) {
    // --- UE-04: Backend safetyLock check for Mutating Admin Actions ---
    await checkSafetyLock(req);

    logAdminAudit(req, res);
    next();
  } else {
    throw new ApiError(403, 'Admin resource! Access denied');
  }
});

export const requireSuperAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const userEmail = req.user.email?.trim()?.toLowerCase();
  
  // Super admin is identified by role OR by matching any email in the admin config's super admin entries
  const isSuperAdminRole = req.user.role === 'super_admin';
  const isSuperAdminEmail = userEmail && getAdminEmails().some(addr => isSameEmail(userEmail, addr));
  if (isSuperAdminRole || isSuperAdminEmail) {
    // --- UE-04: Backend safetyLock check for Mutating Admin Actions ---
    await checkSafetyLock(req);

    logAdminAudit(req, res);
    next();
  } else {
    throw new ApiError(403, 'Super Admin resource! Access denied');
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

    const userEmail = req.user.email?.trim()?.toLowerCase();

    // Super Admin always gets access
    const isSuperAdmin = req.user.role === 'super_admin' || (userEmail && getAdminEmails().some(addr => isSameEmail(userEmail, addr)));
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
