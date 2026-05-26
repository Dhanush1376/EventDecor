import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import logger from '../config/logger';

const skipEndpoints = [
  '/',
  '/api/health',
  '/api/readiness',
  '/api/version',
  '/favicon.ico'
];

export const dbReadinessGuard = (req: Request, res: Response, next: NextFunction) => {
  const path = (req.originalUrl || req.url || '').split('?')[0];

  if (skipEndpoints.includes(path) || path.endsWith('/health') || path.endsWith('/readiness')) {
    return next();
  }

  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState !== 1) {
    logger.warn(`[READINESS GUARD] Request blocked for path ${req.originalUrl} - Database not connected (readyState: ${mongoose.connection.readyState})`);
    
    return res.status(503).json({
      success: false,
      message: 'Database is currently starting up or temporarily disconnected. Please try again in a few seconds.',
      timestamp: new Date().toISOString()
    });
  }

  next();
};
