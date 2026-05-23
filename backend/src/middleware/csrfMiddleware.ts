import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const CSRF_COOKIE_NAME = 'siri_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Paths that must not require CSRF (webhooks, external providers). */
const CSRF_EXEMPT_PATHS = new Set([
  '/api/orders/webhook',
]);

/** Auth routes that must work on cold load before CSRF cookie is established. */
const CSRF_EXEMPT_SUFFIXES = [
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/refresh',
  '/auth/logout',
  '/admin/auth/login',
  '/admin/auth/logout',
  '/admin/auth/verify-2fa',
];

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

  const original = req.originalUrl || req.path;
  if (CSRF_EXEMPT_SUFFIXES.some((suffix) => original.includes(suffix))) {
    return next();
  }

  const cookieToken = String(req.cookies?.[CSRF_COOKIE_NAME] || '');
  const headerToken = String(req.headers[CSRF_HEADER_NAME] || '');

  // Origin-based CSRF mitigation fallback:
  // If third-party cookies (SameSite=None) are blocked by the browser, cookieToken will be empty.
  // In this case, we securely validate the request using the browser-enforced Origin header.
  const origin = req.headers.origin;
  const vercelPreviewRegex = /^https:\/\/.*(siri-arts|siriarts-).*\.vercel\.app$/i;
  const isTrustedOrigin = origin && (
    origin === 'https://siriartsandcrafts.com' ||
    origin === 'https://www.siriartsandcrafts.com' ||
    origin === 'https://siriarts-n-crafts.vercel.app' ||
    origin === 'http://localhost:5173' ||
    (process.env.NODE_ENV === 'development' && !process.env.JEST_WORKER_ID) ||
    vercelPreviewRegex.test(origin)
  );

  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
    if (isTrustedOrigin) {
      // Browser blocked the cookie but Origin is explicitly trusted and verified.
      return next();
    }
    res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
    return;
  }

  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);
  if (!crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    if (isTrustedOrigin) {
      return next();
    }
    res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
    return;
  }

  next();
};
