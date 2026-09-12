import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import logger from '../config/logger';

const skipEndpoints = ['/', '/api/health', '/api/readiness', '/api/version', '/favicon.ico'];

export const dbReadinessGuard = async (req: Request, res: Response, next: NextFunction) => {
  const path = (req.originalUrl || req.url || '').split('?')[0];

  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  if (
    skipEndpoints.includes(path) ||
    path.endsWith('/health') ||
    path.endsWith('/readiness') ||
    path.startsWith('/api/v1/location')
  ) {
    return next();
  }

  // If connecting (readyState: 2), give it a brief grace period (up to 2000ms) to finish establishing
  if (mongoose.connection.readyState === 2) {
    const maxWaitMs = 2000;
    const intervalMs = 100;
    let waited = 0;
    while (mongoose.connection.readyState === 2 && waited < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      waited += intervalMs;
    }
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
      retryAfterMs: 2000,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};
