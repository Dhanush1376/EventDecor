import { CookieOptions, Response } from 'express';
import SessionAuthService from '../services/SessionAuthService';
import { getAuthCookieOptions, getAuthCookieName } from '../config/cookieConfig';

export const CUSTOMER_REFRESH_COOKIE = getAuthCookieName('siri_refresh_token');
export const ADMIN_REFRESH_COOKIE = getAuthCookieName('siri_admin_refresh_token');

/**
 * Cookie options for refresh tokens.
 * path=/api covers both /api/v1/auth/* and legacy /api/auth/* routes.
 */
export const getRefreshCookieOptions = (): CookieOptions => {
  return getAuthCookieOptions(SessionAuthService.getRefreshTokenTtlMs(), '/api');
};

export const setCustomerRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie(CUSTOMER_REFRESH_COOKIE, refreshToken, getRefreshCookieOptions());
};

export const clearCustomerRefreshCookie = (res: Response) => {
  res.clearCookie(CUSTOMER_REFRESH_COOKIE, getRefreshCookieOptions());
};

export const getAdminRefreshCookieOptions = (): CookieOptions => {
  return getAuthCookieOptions(SessionAuthService.getRefreshTokenTtlMs(), '/api');
};

export const setAdminRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie(ADMIN_REFRESH_COOKIE, refreshToken, getAdminRefreshCookieOptions());
};

export const clearAdminRefreshCookie = (res: Response) => {
  res.clearCookie(ADMIN_REFRESH_COOKIE, getAdminRefreshCookieOptions());
};
