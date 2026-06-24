import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { isOriginAllowed } from '../config/corsConfig';
import { getCsrfCookieOptions, getCsrfCookieName } from '../config/cookieConfig';
import logger from '../config/logger';

export const CSRF_COOKIE_NAME = getCsrfCookieName();
export const CSRF_HEADER_NAME = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Paths that must not require CSRF (webhooks, external providers). */
const CSRF_EXEMPT_PATHS = new Set(['/api/orders/webhook']);

/** Auth routes that must work on cold load before CSRF cookie is established. */
const CSRF_EXEMPT_SUFFIXES = [
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/google',
  '/tracking/session',
  '/tracking/event',
  '/tracking/batch',
];

const generateToken = (): string => crypto.randomBytes(32).toString('hex');

const setCsrfCookie = (res: Response, token: string): void => {
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
};

export const clearCsrfCookie = (res: Response): void => {
  res.clearCookie(CSRF_COOKIE_NAME, getCsrfCookieOptions());
};

/**
 * Regenerate the CSRF token (call after login to prevent session fixation).
 * Returns the new token so the auth response can include it.
 */
export const regenerateCsrfToken = (res: Response): string => {
  const token = generateToken();
  setCsrfCookie(res, token);
  return token;
};

/** Issue or refresh CSRF cookie; expose token for SPA clients. */
export const issueCsrfToken = (req: Request, res: Response): void => {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  const token = typeof existing === 'string' && existing.length >= 32 ? existing : generateToken();
  setCsrfCookie(res, token);
  res.status(200).json({ success: true, csrfToken: token });
};

/** Ensure mutating requests include a header matching the double-submit cookie. */
export const validateCsrf = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (CSRF_EXEMPT_PATHS.has(req.path)) {
    return next();
  }

  const original = req.originalUrl || req.path;
  if (CSRF_EXEMPT_SUFFIXES.some((suffix) => original.includes(suffix))) {
    return next();
  }

  const cookieToken = String(req.cookies?.[CSRF_COOKIE_NAME] || '');
  const headerToken = String(req.headers[CSRF_HEADER_NAME] || '');

  let isMatch = false;
  if (cookieToken && headerToken && cookieToken.length === headerToken.length) {
    isMatch = crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  }

  // In cross-origin deployments, third-party cookies (like the CSRF cookie) are often blocked
  // by browsers (e.g., Safari ITP). We fallback to verifying the Origin header against our
  // explicit CORS allowlist, or relying on the Bearer token (which isn't vulnerable to CSRF).
  if (!isMatch) {
    const hasBearerToken = req.headers.authorization?.startsWith('Bearer ');
    const origin = req.headers.origin;

    if (hasBearerToken) {
      // With strict Bearer tokens, CSRF vectors are mitigated because attackers cannot forge the Authorization header.
      // Additionally, we verify Origin matches CORS whitelist as a secondary defense in depth.
      if (origin && !isOriginAllowed(origin)) {
        logger.error(`[CSRF_FAILED] Origin mismatch or missing: ${origin}`);
        res.status(403).json({ success: false, message: 'Invalid Origin for secure request' });
        return;
      }
      return next();
    }

    // Do not log actual tokens in error logs to prevent sensitive info leakage
    logger.error(`[CSRF_FAILED] Invalid or missing token on path=${req.path}`);
    res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
    return;
  }

  next();
};
