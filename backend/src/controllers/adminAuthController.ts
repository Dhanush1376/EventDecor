import { Request, Response } from 'express';
import AuthService from '../services/authService';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

const refreshCookieName = 'siri_admin_refresh_token';

const setRefreshCookie = (res: Response, refreshToken: string) => {
  const maxAge = AuthService.getRefreshTokenTtlMs();
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/admin/auth',
    maxAge,
  });
};

const clearRefreshCookie = (res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/admin/auth',
  });
};

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  logger.info(`[ADMIN AUTH] Attempting admin login for: ${email}`);
  const userAgent = req.headers['user-agent'] || '';
  const result = await AuthService.adminLogin(email, password, req.ip || '127.0.0.1', userAgent);

  logger.info(`[ADMIN AUTH] Successful admin login. User: ${result.user.email}, Role: ${result.user.role}`);

  setRefreshCookie(res, result.refreshToken);
  res.status(200).json(new ApiResponse(true, 'Admin authenticated successfully', {
    user: result.user,
    token: result.accessToken,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  }));
});

export const adminLogout = asyncHandler(async (req: Request, res: Response) => {
  const cookieHeader = req.headers.cookie || '';
  const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
  const target = cookies.find(cookie => cookie.startsWith(`${refreshCookieName}=`));
  const refreshToken = target ? decodeURIComponent(target.slice(refreshCookieName.length + 1)) : '';

  logger.info('[ADMIN AUTH] Admin manual logout requested');
  if (refreshToken) {
    await AuthService.revokeSession(refreshToken);
  }
  clearRefreshCookie(res);

  res.status(200).json(new ApiResponse(true, 'Admin logged out successfully'));
});
