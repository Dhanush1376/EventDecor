import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import logger from '../config/logger';

const skipEndpoints = [
  '/',
  '/api/health',
  '/api/readiness',
  '/api/version',
  '/favicon.ico',
  '/api/v1/media/optimize',
  '/api/media/optimize',
];

export const dbReadinessGuard = (req: Request, res: Response, next: NextFunction) => {
  const path = (req.originalUrl || req.url || '').split('?')[0];

  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  if (skipEndpoints.includes(path) || path.endsWith('/health') || path.endsWith('/readiness')) {
    return next();
  }

  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState !== 1) {
    logger.warn(
      `[READINESS GUARD] Request blocked for path ${req.originalUrl} - Database not connected (readyState: ${mongoose.connection.readyState})`,
    );
    const stateLabel = mongoose.connection.readyState === 2 ? 'reconnecting' : 'disconnected';
    return res.status(503).json({
      success: false,
      message: `Database is temporarily ${stateLabel}. The server is attempting to reconnect automatically. Please retry in a few seconds.`,
      retryAfterMs: 3000,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};
