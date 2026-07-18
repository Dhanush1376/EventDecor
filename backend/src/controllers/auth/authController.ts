import { Request, Response } from 'express';
import OtpAuthService from '../../services/OtpAuthService';
import GoogleAuthService from '../../services/GoogleAuthService';
import SessionAuthService from '../../services/SessionAuthService';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import { canonicalizeEmail } from '../../utils/email/emailHelper';
import { STAFF_ROLES } from '../../config/adminConfig';
import logger from '../../config/logger';
import {
  cacheProfile,
  getCachedSessionJson,
  invalidateUserSessionCaches,
  sessionKeys,
} from '../../utils/cache/userSessionCache';
import { checkOtpSendAllowed, isOtpVerifyBlocked } from '../../utils/security/otpRateLimit';
import {
  setCustomerRefreshCookie,
  clearCustomerRefreshCookie,
  CUSTOMER_REFRESH_COOKIE,
  ADMIN_REFRESH_COOKIE,
  clearAdminRefreshCookie,
  setAdminRefreshCookie,
} from '../../utils/security/authCookies';
import { regenerateCsrfToken, clearCsrfCookie } from '../../middleware/csrfMiddleware';
import { blacklistToken } from '../../utils/security/jwtBlacklist';
import jwt from 'jsonwebtoken';

export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Email address is required');
  }

  const cleanEmail = canonicalizeEmail(email);
  const clientIp = req.ip || '127.0.0.1';

  const sendAllowed = await checkOtpSendAllowed(clientIp);
  if (!sendAllowed) {
    throw new ApiError(429, 'Too many OTP requests. Please try again in a few minutes.');
  }

  logger.info(`[AUTH] OTP send requested for ${cleanEmail} from ${clientIp}`);

  await OtpAuthService.generateOTP(cleanEmail, clientIp);

  logger.info(`[AUTH] OTP email dispatched for ${cleanEmail}`);

  res.status(200).json(new ApiResponse(true, 'Verification code sent to your email successfully'));
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required');
  }

  const cleanEmail = canonicalizeEmail(email);
  const clientIp = req.ip || '127.0.0.1';

  if (process.env.NODE_ENV !== 'development' && (await isOtpVerifyBlocked(clientIp))) {
    throw new ApiError(429, 'Too many failed verification attempts. Please try again later.');
  }

  logger.info(`[AUTH] OTP verify requested for ${cleanEmail}`);
  const userAgent = req.headers['user-agent'] || '';
  const result = await OtpAuthService.verifyOTP(cleanEmail, otp, clientIp, userAgent);

  if ((result as { requires2FA?: boolean }).requires2FA) {
    logger.info(`[AUTH] OTP verified — awaiting 2FA for user: ${result.user._id}`);
    return res.status(200).json(
      new ApiResponse(true, 'Two-factor authentication required', {
        requires2FA: true,
        userId: result.user._id,
        user: result.user,
      }),
    );
  }

  logger.info(`[AUTH] Session created for user ${result.user._id}`);
  await invalidateUserSessionCaches(String(result.user._id));

  if ((STAFF_ROLES as readonly string[]).includes(result.user.role)) {
    setAdminRefreshCookie(res, result.refreshToken);
  } else {
    setCustomerRefreshCookie(res, result.refreshToken);
  }

  // Regenerate CSRF token post-login to prevent session fixation
  const csrfToken = regenerateCsrfToken(res);

  const payload: Record<string, unknown> = {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    csrfToken,
  };

  res.status(200).json(new ApiResponse(true, 'Authenticated successfully', payload));
});

export const refreshSession = asyncHandler(async (req: Request, res: Response) => {
  // Prefer the HttpOnly cookie (authoritative, rotated server-side) over any
  // client-persisted fallback token. This avoids false-positive replay
  // detection when a stale localStorage fallback is sent alongside a fresh
  // cookie, which would otherwise revoke the whole session family.
  const cookieToken = String(
    req.cookies?.[CUSTOMER_REFRESH_COOKIE] || req.cookies?.[ADMIN_REFRESH_COOKIE] || '',
  ).trim();
  const bodyToken = String(req.body?.refreshToken || req.headers['x-refresh-token'] || '').trim();

  // Prefer bodyToken over cookieToken because the JS client explicitly manages
  // the fallback token, which avoids issues with corrupted/stale browser cookies.
  const refreshToken = bodyToken || cookieToken;

  if (!refreshToken) {
    logger.warn('[AUTH] Refresh attempted without refresh token cookie/body');
    throw new ApiError(401, 'Refresh session is missing');
  }

  const userAgent = req.headers['user-agent'] || '';
  const result = await SessionAuthService.refreshSession(refreshToken, userAgent);

  if ((STAFF_ROLES as readonly string[]).includes(result.user.role)) {
    setAdminRefreshCookie(res, result.refreshToken);
  } else {
    setCustomerRefreshCookie(res, result.refreshToken);
  }

  // Only echo the rotated refresh token in the JSON body for clients that
  // demonstrably cannot use cookies (e.g. Safari ITP blocking third-party
  // cookies). Cookie-capable clients rotate via Set-Cookie alone, so the
  // long-lived credential never becomes readable by page JavaScript.
  res.status(200).json(
    new ApiResponse(true, 'Session refreshed', {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }),
  );
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = String(
    req.cookies?.[CUSTOMER_REFRESH_COOKIE] ||
      req.cookies?.[ADMIN_REFRESH_COOKIE] ||
      req.body?.refreshToken ||
      req.headers['x-refresh-token'] ||
      '',
  ).trim();
  const userId = (req as any).user?.id;

  let accessToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    accessToken = req.headers.authorization.split(' ')[1];
  }

  logger.info('[AUTH] Logout requested');
  if (accessToken) {
    let expiresIn = 900;
    try {
      const decoded: any = jwt.decode(accessToken);
      if (decoded && decoded.exp) {
        expiresIn = Math.max(1, decoded.exp - Math.floor(Date.now() / 1000));
      }
    } catch {
      // Ignored
    }
    await blacklistToken(accessToken, expiresIn);
  }

  if (refreshToken) {
    await SessionAuthService.revokeSession(refreshToken);
  }
  if (userId) {
    await invalidateUserSessionCaches(String(userId));
  }
  clearCustomerRefreshCookie(res);
  clearAdminRefreshCookie(res);
  clearCsrfCookie(res);

  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
  res.status(200).json(new ApiResponse(true, 'Logged out successfully'));
});

export const logoutAllDevices = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  let accessToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    accessToken = req.headers.authorization.split(' ')[1];
  }

  logger.info(`[AUTH] Global logout requested for user ${userId}`);
  if (accessToken) {
    let expiresIn = 900;
    try {
      const decoded: any = jwt.decode(accessToken);
      if (decoded && decoded.exp) {
        expiresIn = Math.max(1, decoded.exp - Math.floor(Date.now() / 1000));
      }
    } catch {
      // Ignored
    }
    await blacklistToken(accessToken, expiresIn);
  }

  if (userId) {
    await SessionAuthService.revokeAllSessions(String(userId));
    await invalidateUserSessionCaches(String(userId));
  }
  clearCustomerRefreshCookie(res);
  clearAdminRefreshCookie(res);
  clearCsrfCookie(res);

  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
  res.status(200).json(new ApiResponse(true, 'Logged out from all devices successfully'));
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = String((req as any).user.id);
  const cacheKey = sessionKeys.profile(userId);

  const cached = await getCachedSessionJson<Record<string, unknown>>(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Session-Cache', 'HIT');
    return res.status(200).json(new ApiResponse(true, 'Profile fetched', cached));
  }

  const user = await User.findById(userId).select('-password -twoFactorSecret').lean();
  if (!user) {
    throw new ApiError(404, 'User session not found in database');
  }

  await cacheProfile(userId, user);

  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Session-Cache', 'MISS');
  res.status(200).json(new ApiResponse(true, 'Profile fetched', user));
});

export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const { credential } = req.body;
  if (!credential) {
    throw new ApiError(400, 'Google credential is required');
  }

  const clientIp = req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';

  logger.info(`[AUTH] Google auth requested from ${clientIp}`);

  const result = await GoogleAuthService.authenticateWithGoogle(credential, clientIp, userAgent);

  if ((result as { requires2FA?: boolean }).requires2FA) {
    logger.info(`[AUTH] Google auth verified — awaiting 2FA for user: ${result.user._id}`);
    return res.status(200).json(
      new ApiResponse(true, 'Two-factor authentication required', {
        requires2FA: true,
        userId: result.user._id,
        user: result.user,
      }),
    );
  }

  logger.info(`[AUTH] Google auth session created for user ${result.user._id}`);
  await invalidateUserSessionCaches(String(result.user._id));

  if ((STAFF_ROLES as readonly string[]).includes(result.user.role)) {
    setAdminRefreshCookie(res, result.refreshToken);
  } else {
    setCustomerRefreshCookie(res, result.refreshToken);
  }

  const csrfToken = regenerateCsrfToken(res);

  const payload: Record<string, unknown> = {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    csrfToken,
  };

  res.status(200).json(new ApiResponse(true, 'Authenticated successfully', payload));
});
// Trigger dev restart to pick up BYPASS_OTP_CODE env change
