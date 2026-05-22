import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { sanitizeData } from '../utils/sanitize';

const SILENT_PATHS = [
  '/api/health',
  '/api/readiness',
  '/api/version',
  '/favicon.ico',
];

const isSilentPath = (url: string) => {
  const path = url.split('?')[0];
  return path === '/' || SILENT_PATHS.some((p) => path === p || path.endsWith(p));
};

const logSuccessfulApi =
  process.env.LOG_API_SUCCESS === 'true' || process.env.NODE_ENV !== 'production';

/**
 * Production-safe request telemetry: skips health/readiness noise;
 * logs inbound only when LOG_API_SUCCESS=true in production.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime();
  const url = req.originalUrl || req.url;
  const silent = isSilentPath(url);

  if (!silent && logSuccessfulApi) {
    logger.info(`[API Inbound] ${req.method} ${url}`, {
      userAgent: req.get('user-agent'),
      query: req.query ? sanitizeData(req.query) : undefined,
      body: req.body ? sanitizeData(req.body) : undefined,
    });
  }

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
    const statusCode = res.statusCode;
    const logMetadata = {
      method: req.method,
      url,
      statusCode,
      durationMs,
      sizeBytes: res.get('content-length') || '0',
    };
    const message = `[API Outbound] ${req.method} ${url} - Status ${statusCode} (${durationMs}ms)`;

    if (statusCode >= 500) {
      logger.error(message, logMetadata);
    } else if (statusCode >= 400) {
      logger.warn(message, logMetadata);
    } else if (!silent && logSuccessfulApi) {
      logger.info(message, logMetadata);
    } else if (!silent && durationMs > Number(process.env.SLOW_REQUEST_LOG_MS || 3000)) {
      logger.warn(`[API Slow] ${message}`, logMetadata);
    }
  });

  next();
};
