import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { TwoFactorService } from '../services/twoFactorService';
import AuthService from '../services/authService';
import { consumeTwoFactorPending } from '../utils/twoFactorPending';
import User from '../models/User';
import { setCustomerRefreshCookie } from '../utils/authCookies';

export const getTwoFactorStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const status = await TwoFactorService.getStatus(userId);
  res.status(200).json(new ApiResponse(true, '2FA status', status));
});

export const setupTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const setup = await TwoFactorService.beginSetup(userId);
  res.status(200).json(new ApiResponse(true, 'Scan the OTP URI in your authenticator app, then call /2fa/enable', setup));
});

export const enableTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'token is required');
  const result = await TwoFactorService.enable(userId, token);
  res.status(200).json(new ApiResponse(true, '2FA enabled', result));
});

export const disableTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'token is required');
  const result = await TwoFactorService.disable(userId, token);
  res.status(200).json(new ApiResponse(true, '2FA disabled', result));
});

/** Complete login after OTP when 2FA is enabled. */
export const verifyTwoFactorLogin = asyncHandler(async (req: Request, res: Response) => {
  const { userId, token } = req.body;
  if (!userId || !token) throw new ApiError(400, 'userId and token are required');

  const pending = await consumeTwoFactorPending(userId);
  if (!pending) throw new ApiError(400, '2FA session expired — sign in again');

  const valid = await TwoFactorService.verifyToken(userId, token);
  if (!valid) throw new ApiError(401, 'Invalid authenticator code');

  const user = await User.findById(userId);
  if (!user || !user.isVerified) throw new ApiError(401, 'Invalid session');

  // Bug-14 Fix: Account lockout check during 2FA
  if (user.isLocked && user.lockUntil && user.lockUntil > new Date()) {
    throw new ApiError(423, 'Account is temporarily locked due to too many failed attempts.');
  }

  const userAgent = req.headers['user-agent'] || '';
  const session = await AuthService.createSession(user, userAgent);
  setCustomerRefreshCookie(res, session.refreshToken);

  res.status(200).json(
    new ApiResponse(true, 'Authenticated successfully', {
      user: session.user,
      accessToken: session.accessToken,
      token: session.accessToken,
    })
  );
});
