import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Per-request timeout middleware.
 * Terminates handlers that exceed the configured timeout with a 408 Request Timeout.
 *
 * Design decisions:
 *   - Uses `res.headersSent` guard to avoid double-send after timeout fires
 *   - Excludes webhook/upload routes by path prefix (they have their own timeouts)
 *   - Timer is unreffed so it never blocks graceful shutdown
 *   - Logs slow requests to Winston with full correlation context
 */
const EXCLUDED_PREFIXES = [
  '/api/orders/webhook', // Razorpay webhook — has its own timeout
  '/api/uploads', // File uploads — have Cloudinary-level timeouts
  '/api/v1/uploads',
  '/api/gallery', // Gallery uploads — stream-based with Cloudinary timeout
  '/api/v1/gallery',
  '/api/v1/visual-search', // Visual search — calls slow vision AI APIs
  '/api/visual-search',
];

export const requestTimeout = (timeoutMs = 15000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip excluded routes
    const path = (req.originalUrl || req.url || '').split('?')[0];
    if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return next();
    }

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn(`[TIMEOUT] Request exceeded ${timeoutMs}ms limit`, {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.status(408).json({
          success: false,
          message: 'Request timed out (408). Please try again.',
        });
      }
    }, timeoutMs);

    // Prevent timer from blocking process shutdown
    if (timer.unref) timer.unref();

    // Clear timeout when response finishes naturally
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
};
