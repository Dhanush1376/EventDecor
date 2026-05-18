import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { sanitizeData } from '../utils/sanitize';

/**
 * Standard request telemetry middleware that audits inbound endpoints
 * and logs completion latency metrics safely.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Capture high-resolution timestamp
  const startTime = process.hrtime();

  // 1. Audit Request Inbound (scrubbing sensitive payloads)
  logger.info(`[API Inbound] ${req.method} ${req.originalUrl || req.url}`, {
    userAgent: req.get('user-agent'),
    query: req.query ? sanitizeData(req.query) : undefined,
    body: req.body ? sanitizeData(req.body) : undefined,
  });

  // 2. Intercept finish to track metrics
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6); // nanoseconds to milliseconds

    const statusCode = res.statusCode;
    const sizeBytes = res.get('content-length') || '0';

    const logMetadata = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs,
      sizeBytes,
    };

    const message = `[API Outbound] ${req.method} ${req.originalUrl || req.url} - Status ${statusCode} (${durationMs}ms)`;

    if (statusCode >= 500) {
      logger.error(message, logMetadata);
    } else if (statusCode >= 400) {
      logger.warn(message, logMetadata);
    } else {
      logger.info(message, logMetadata);
    }
  });

  next();
};
