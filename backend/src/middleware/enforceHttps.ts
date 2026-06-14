import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Redirect HTTP → HTTPS in production when the reverse proxy sets X-Forwarded-Proto.
 *
 * Security hardening:
 *  - Uses 301 (permanent) redirect for SEO and browser caching
 *  - Validates Host header to prevent open-redirect via Host injection
 *  - Handles comma-separated X-Forwarded-Proto from multi-proxy chains
 *  - Blocks requests without X-Forwarded-Proto in production (direct access bypassing proxy)
 */
export const enforceHttps = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Express natively and securely populates req.secure based on trust proxy settings.
  // This safely ignores spoofed X-Forwarded-Proto headers injected before the trusted proxy.
  if (req.secure) {
    return next();
  }

  // Skip HTTPS enforcement for health check and readiness probe paths
  const path = (req.originalUrl || req.path || '').split('?')[0];
  if (
    path === '/health' ||
    path === '/api/readiness' ||
    path === '/api/v1/readiness' ||
    path === '/api/health' ||
    path === '/api/v1/health' ||
    path.endsWith('/health') ||
    path.endsWith('/readiness') ||
    path.endsWith('/ready')
  ) {
    return next();
  }

  // If proto is missing or not https, redirect
  const host = req.headers.host;

  // Validate Host header to prevent open-redirect attacks via header injection
  // Allow alphanumeric, dots, colons (port), and hyphens only
  if (!host || /[^a-zA-Z0-9.:-]/.test(host)) {
    logger.warn(`[HTTPS] Blocked redirect — invalid Host header: ${host}`);
    res.status(400).json({ success: false, message: 'Invalid request' });
    return;
  }

  res.redirect(301, `https://${host}${req.originalUrl}`);
};
