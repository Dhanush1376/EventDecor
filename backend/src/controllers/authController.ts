import { Request, Response } from 'express';
import AuthService from '../services/authService';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import User from '../models/User';
import { isSameEmail } from '../utils/emailHelper';
import { getAdminEmails } from '../config/adminConfig';
import logger from '../config/logger';

const refreshCookieName = 'siri_refresh_token';

const setRefreshCookie = (res: Response, refreshToken: string) => {
  const maxAge = AuthService.getRefreshTokenTtlMs();
  const isProd = process.env.NODE_ENV === 'production';
  // A-03: Cookie is scoped to /api/auth only — frontend refresh MUST call POST /api/auth/refresh
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge,
  });
};

const clearRefreshCookie = (res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
  });
};

// Deprecated register and login removed

export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    throw new ApiError(400, 'Email address is required');
  }

  const cleanEmail = email.trim().toLowerCase();
  logger.info(`[AUTH] Initiating passwordless OTP verification for user: ${cleanEmail}`);
  try {
    await AuthService.checkAdminPassword(cleanEmail, password);
  } catch (err: any) {
    if (err.message === 'SILENT_ADMIN_ABORT') {
      logger.info(`[AUTH] Silent abort for admin check: ${cleanEmail}`);
      return res.status(200).json(new ApiResponse(true, 'Verification code sent to your email successfully'));
    }
    throw err;
  }

  const otp = await AuthService.generateOTP(email, req.ip);

  logger.info(`[AUTH] OTP successfully dispatched to user: ${cleanEmail}`);

  // OTP is logged by the auth service in development for testing — never return in HTTP response
  res.status(200).json(new ApiResponse(true, 'Verification code sent to your email successfully'));
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required');
  }
  
  logger.info(`[AUTH] Verifying authentication credentials for user: ${email.trim().toLowerCase()}`);
  const userAgent = req.headers['user-agent'] || '';
  const result = await AuthService.verifyOTP(email, otp, req.ip, userAgent);
  
  if ((result as { requires2FA?: boolean }).requires2FA) {
    logger.info(`[AUTH] OTP verified — awaiting 2FA for user: ${result.user._id}`);
    return res.status(200).json(
      new ApiResponse(true, 'Two-factor authentication required', {
        requires2FA: true,
        userId: result.user._id,
        user: result.user,
      })
    );
  }

  logger.info(`[AUTH] Authentication successful. User session created. ID: ${result.user._id}`);

  // A-02: One-time admin role alignment on first successful OTP (not on every getProfile fetch)
  const adminEmails = getAdminEmails();
  const staffRoles = ['admin', 'super_admin', 'main_admin', 'manager', 'coordinator'];
  if (
    adminEmails.some((addr) => isSameEmail(result.user.email, addr)) &&
    !staffRoles.includes(result.user.role)
  ) {
    result.user.role = 'admin';
    await result.user.save();
    logger.info(`[AUTH] Auto-upgraded user ${result.user.email} to admin role based on config.`);
  }

  setRefreshCookie(res, result.refreshToken);
  res.status(200).json(new ApiResponse(true, 'Authenticated successfully', {
    user: result.user,
    accessToken: result.accessToken,
  }));
});
 
export const refreshSession = asyncHandler(async (req: Request, res: Response) => {
  // Bug-16 Fix: Enforce cookie-only token delivery in production
  const refreshToken = process.env.NODE_ENV === 'production'
    ? String(req.cookies?.[refreshCookieName] || '').trim()
    : String(req.body?.refreshToken || req.cookies?.[refreshCookieName] || req.headers['x-refresh-token'] || '').trim();
  const userAgent = req.headers['user-agent'] || '';
  const result = await AuthService.refreshSession(refreshToken, userAgent);
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json(new ApiResponse(true, 'Session refreshed', {
    user: result.user,
    accessToken: result.accessToken,
  }));
});
 
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = String(req.body?.refreshToken || req.cookies?.[refreshCookieName] || req.headers['x-refresh-token'] || '').trim();
  
  logger.info('[AUTH] Revoking user session on manual logout request');
  if (refreshToken) {
    await AuthService.revokeSession(refreshToken);
  }
  clearRefreshCookie(res);
  
  logger.info('[AUTH] Logout complete. Session cookies cleared.');
  res.status(200).json(new ApiResponse(true, 'Logged out successfully'));
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById((req as any).user.id).select('-password');
  if (!user) {
    throw new ApiError(404, 'User session not found in database');
  }

  res.status(200).json(new ApiResponse(true, 'Profile fetched', user));
});

