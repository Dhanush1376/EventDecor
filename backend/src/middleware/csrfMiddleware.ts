import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { isOriginAllowed } from '../config/corsConfig';
import { getCsrfCookieOptions, getCsrfCookieName } from '../config/cookieConfig';
import logger from '../config/logger';

export const CSRF_COOKIE_NAME = getCsrfCookieName();
export const CSRF_HEADER_NAME = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Paths that must not require CSRF (webhooks, external providers). */
const CSRF_EXEMPT_PATHS = new Set([
  '/api/orders/webhook',
]);

/** Auth routes that must work on cold load before CSRF cookie is established. */
const CSRF_EXEMPT_SUFFIXES = [
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/send-otp',
  '/auth/verify-otp',
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

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    logger.error(`[CSRF_FAILED] path=${req.path} cookieToken=${cookieToken} headerToken=${headerToken}`);
    res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
    return;
  }

  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);
  if (!crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
    return;
  }

  next();
};
