import { CookieOptions } from 'express';

const isProd = process.env.NODE_ENV === 'production';
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

/**
 * Generate a production-safe cookie name with __Secure- prefix.
 *
 * Browsers enforce that __Secure- prefixed cookies:
 *  - Can only be set over HTTPS
 *  - Must have the Secure flag
 * This prevents MITM cookie injection attacks.
 */
export const secureCookieName = (baseName: string): string => {
  return isProd ? `__Secure-${baseName}` : baseName;
};

/**
 * Base options for all cookies to ensure cross-origin functionality in production.
 * In production: SameSite=None + Secure=true
 * In development: SameSite=Lax + Secure=false (unless HTTPS is used locally)
 */
export const getBaseCookieOptions = (): CookieOptions => {
  return {
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain: cookieDomain,
  };
};

/**
 * Auth cookies MUST be HttpOnly to prevent XSS exfiltration.
 */
export const getAuthCookieOptions = (maxAgeMs: number, path: string = '/api'): CookieOptions => {
  return {
    ...getBaseCookieOptions(),
    httpOnly: true,
    path,
    maxAge: maxAgeMs,
  };
};

/**
 * Generate production-safe cookie name for auth cookies.
 * Uses __Secure- prefix in production.
 */
export const getAuthCookieName = (baseName: string): string => secureCookieName(baseName);

/**
 * CSRF cookies are HttpOnly to prevent XSS exfiltration. The SPA reads the token
 * from the JSON payload of the /api/csrf-token endpoint.
 */
export const getCsrfCookieOptions = (): CookieOptions => {
  return {
    ...getBaseCookieOptions(),
    httpOnly: true,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  };
};

/**
 * Generate production-safe cookie name for CSRF cookie.
 * Uses __Secure- prefix in production.
 */
export const getCsrfCookieName = (): string => secureCookieName('siri_csrf');

/**
 * Tracking cookies should persist cross-origin and be HttpOnly.
 */
export const getTrackingCookieOptions = (): CookieOptions => {
  return {
    ...getBaseCookieOptions(),
    httpOnly: true,
    path: '/',
    maxAge: 30 * 60 * 1000, // 30 minutes
  };
};
