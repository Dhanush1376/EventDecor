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

interface JwtPayload {
  id: string;
  role: string;
  email?: string;
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Validate JWT_SECRET exists at module load time
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET environment variable is not set. Authentication will fail.');
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
    const user = await User.findById(decoded.id).select('role email isVerified');
    if (!user || !user.isVerified) {
      throw new ApiError(401, 'Not authorized to access this route');
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
    const mutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (mutatingMethod) {
      const isSafetyLockToggle = req.originalUrl.includes('/cms/admin_safety_lock');
      if (!isSafetyLockToggle) {
        const ContentSection = require('../models/ContentSection').default;
        const safetyLockDoc = await ContentSection.findOne({ sectionKey: 'admin_safety_lock' });
        if (safetyLockDoc && safetyLockDoc.data?.safetyLock === true) {
          throw new ApiError(403, 'Global safety write override lock is active on the backend. Write operations are blocked.');
        }
      }
    }

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

  const adminEmails = getAdminEmails();
  const userEmail = req.user.email?.trim()?.toLowerCase();

  if (req.user.role === 'admin' || (userEmail && adminEmails.some(addr => isSameEmail(userEmail, addr)))) {
    // --- UE-04: Backend safetyLock check for Mutating Admin Actions ---
    const mutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (mutatingMethod) {
      const isSafetyLockToggle = req.originalUrl.includes('/cms/admin_safety_lock');
      if (!isSafetyLockToggle) {
        const ContentSection = require('../models/ContentSection').default;
        const safetyLockDoc = await ContentSection.findOne({ sectionKey: 'admin_safety_lock' });
        if (safetyLockDoc && safetyLockDoc.data?.safetyLock === true) {
          throw new ApiError(403, 'Global safety write override lock is active on the backend. Write operations are blocked.');
        }
      }
    }

    logAdminAudit(req, res);
    next();
  } else {
    throw new ApiError(403, 'Super Admin resource! Access denied');
  }
});
