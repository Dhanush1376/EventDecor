import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const CSRF_COOKIE_NAME = 'siri_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Paths that must not require CSRF (webhooks, external providers). */
const CSRF_EXEMPT_PATHS = new Set([
  '/api/orders/webhook',
]);

const generateToken = (): string => crypto.randomBytes(32).toString('hex');

const setCsrfCookie = (res: Response, token: string): void => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });
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

  const cookieToken = String(req.cookies?.[CSRF_COOKIE_NAME] || '');
  const headerToken = String(req.headers[CSRF_HEADER_NAME] || '');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
    return;
  }

  next();
};
