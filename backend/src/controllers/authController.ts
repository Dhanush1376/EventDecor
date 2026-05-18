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

const getCookie = (req: Request, name: string) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return '';
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return target ? decodeURIComponent(target.slice(name.length + 1)) : '';
};

const setRefreshCookie = (res: Response, refreshToken: string) => {
  const maxAge = AuthService.getRefreshTokenTtlMs();
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge,
  });
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  throw new ApiError(400, 'Registration via password is deprecated. Please use passwordless email OTP.');
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  throw new ApiError(400, 'Login via password is deprecated. Please use passwordless email OTP.');
});

export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    throw new ApiError(400, 'Email address is required');
  }

  const cleanEmail = email.trim().toLowerCase();
  logger.info(`[AUTH] Initiating passwordless OTP verification for user: ${cleanEmail}`);
  
  await AuthService.checkAdminPassword(cleanEmail, password);

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
  const result = await AuthService.verifyOTP(email, otp, req.ip);
  
  logger.info(`[AUTH] Authentication successful. User session created. ID: ${result.user._id}`);
  
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json(new ApiResponse(true, 'Authenticated successfully', {
    user: result.user,
    token: result.accessToken,
    accessToken: result.accessToken,
  }));
});

export const refreshSession = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getCookie(req, refreshCookieName);
  const result = await AuthService.refreshSession(refreshToken);
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json(new ApiResponse(true, 'Session refreshed', {
    user: result.user,
    token: result.accessToken,
    accessToken: result.accessToken,
  }));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getCookie(req, refreshCookieName);
  
  logger.info('[AUTH] Revoking user session on manual logout request');
  await AuthService.revokeSession(refreshToken);
  clearRefreshCookie(res);
  
  logger.info('[AUTH] Logout complete. Session cookies cleared.');
  res.status(200).json(new ApiResponse(true, 'Logged out successfully'));
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById((req as any).user.id).select('-password');
  if (!user) {
    throw new ApiError(404, 'User session not found in database');
  }

  // Self-healing role upgrade for the master admin emails
  const adminEmails = getAdminEmails();
  if (adminEmails.some(addr => isSameEmail(user.email, addr)) && user.role !== 'admin') {
    user.role = 'admin';
    await user.save();
  }

  res.status(200).json(new ApiResponse(true, 'Profile fetched', user));
});

export const checkEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Email address is required');
  }
  const cleanEmail = email.trim().toLowerCase();
  const adminEmails = getAdminEmails();
  const requiresPassword = adminEmails.some(addr => isSameEmail(cleanEmail, addr));
  res.status(200).json(new ApiResponse(true, 'Email checked successfully', { requiresPassword }));
});
