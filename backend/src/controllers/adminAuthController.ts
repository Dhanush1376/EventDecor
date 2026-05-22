import { Request, Response } from 'express';
import AuthService from '../services/authService';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { TwoFactorService } from '../services/twoFactorService';
import { consumeTwoFactorPending, hasTwoFactorPending } from '../utils/twoFactorPending';
import User from '../models/User';

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

const issueAdminSession = async (req: Request, res: Response, userId: string) => {
  const user = await User.findById(userId);
  if (!user || !user.isVerified) {
    throw new ApiError(401, 'Invalid session');
  }

  const userAgent = req.headers['user-agent'] || '';
  const session = await AuthService.createSession(user, userAgent);
  setRefreshCookie(res, session.refreshToken);

  return res.status(200).json(
    new ApiResponse(true, 'Admin authenticated successfully', {
      user: session.user,
      token: session.accessToken,
      accessToken: session.accessToken,
    })
  );
};

const assertAdminPendingAuth = async (userId: string) => {
  if (!userId) throw new ApiError(400, 'userId is required');
  const pending = await hasTwoFactorPending(userId);
  if (!pending) {
    throw new ApiError(400, 'Admin auth session expired — sign in again');
  }
  const user = await User.findById(userId).select('role email isVerified');
  if (!user || !user.isVerified) {
    throw new ApiError(401, 'Invalid user');
  }
  const adminRoles = ['super_admin', 'main_admin', 'moderator', 'support_admin', 'order_manager', 'content_manager', 'admin', 'manager', 'coordinator'];
  if (!adminRoles.includes(user.role)) {
    throw new ApiError(403, 'Administrative access required');
  }
  return user;
};

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  logger.info(`[ADMIN AUTH] Attempting admin login for: ${email}`);
  const userAgent = req.headers['user-agent'] || '';
  const result = await AuthService.adminLogin(email, password, req.ip || '127.0.0.1', userAgent);

  if ('requires2FA' in result && result.requires2FA) {
    return res.status(200).json(
      new ApiResponse(true, 'Two-factor authentication required', {
        requires2FA: true,
        userId: result.userId,
        user: result.user,
      })
    );
  }

  if ('requires2FASetup' in result && result.requires2FASetup) {
    return res.status(200).json(
      new ApiResponse(true, 'Two-factor enrollment required before admin access', {
        requires2FASetup: true,
        userId: result.userId,
        user: result.user,
      })
    );
  }

  throw new ApiError(500, 'Unexpected admin login state');
});

/** Begin TOTP setup during mandatory admin enrollment (password step already verified). */
export const adminSetupTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body;
  await assertAdminPendingAuth(userId);

  const user = await User.findById(userId).select('+twoFactorEnabled');
  if (user?.twoFactorEnabled) {
    throw new ApiError(400, '2FA is already enabled — verify your authenticator code');
  }

  const setup = await TwoFactorService.beginSetup(userId);
  res.status(200).json(new ApiResponse(true, 'Scan the OTP URI in your authenticator app', setup));
});

/** Enable 2FA and complete admin login after mandatory setup. */
export const adminEnableTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const { userId, token } = req.body;
  if (!token) throw new ApiError(400, 'token is required');

  await assertAdminPendingAuth(userId);
  await TwoFactorService.enable(userId, token);

  const consumed = await consumeTwoFactorPending(userId);
  if (!consumed) {
    throw new ApiError(400, 'Admin auth session expired — sign in again');
  }

  logger.info(`[ADMIN AUTH] 2FA enrolled and session issued for userId: ${userId}`);
  return issueAdminSession(req, res, userId);
});

/** Complete admin login when 2FA is already enabled. */
export const adminVerifyTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const { userId, token } = req.body;
  if (!token) throw new ApiError(400, 'token is required');

  await assertAdminPendingAuth(userId);

  const valid = await TwoFactorService.verifyToken(userId, token);
  if (!valid) throw new ApiError(401, 'Invalid authenticator code');

  const consumed = await consumeTwoFactorPending(userId);
  if (!consumed) {
    throw new ApiError(400, 'Admin auth session expired — sign in again');
  }

  logger.info(`[ADMIN AUTH] 2FA verified for userId: ${userId}`);
  return issueAdminSession(req, res, userId);
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
