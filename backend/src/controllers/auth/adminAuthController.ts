import { Request, Response } from 'express';
import SessionAuthService from '../../services/SessionAuthService';
import AdminAuthService from '../../services/AdminAuthService';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import { TwoFactorService } from '../../services/twoFactorService';
import {
  consumeTwoFactorPending,
  hasTwoFactorPending,
} from '../../utils/security/twoFactorPending';
import User from '../../models/User';
import {
  ADMIN_REFRESH_COOKIE,
  setAdminRefreshCookie,
  clearAdminRefreshCookie,
} from '../../utils/security/authCookies';
import { regenerateCsrfToken, clearCsrfCookie } from '../../middleware/csrfMiddleware';
import { getFrontendUrl } from '../../utils/getFrontendUrl';

const issueAdminSession = async (req: Request, res: Response, userId: string) => {
  const user = await User.findById(userId);
  if (!user || !user.isVerified) {
    throw new ApiError(401, 'Invalid session');
  }

  const userAgent = req.headers['user-agent'] || '';
  const session = await SessionAuthService.createSession(user, userAgent);
  setAdminRefreshCookie(res, session.refreshToken);

  // Regenerate CSRF token post-login to prevent session fixation
  const csrfToken = regenerateCsrfToken(res);

  return res.status(200).json(
    new ApiResponse(true, 'Admin authenticated successfully', {
      user: session.user,
      accessToken: session.accessToken,
      csrfToken,
    }),
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
  const adminRoles = [
    'super_admin',
    'main_admin',
    'moderator',
    'support_admin',
    'order_manager',
    'content_manager',
    'admin',
    'manager',
    'coordinator',
  ];
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
  const result = await AdminAuthService.adminLogin(
    email,
    password,
    req.ip || '127.0.0.1',
    userAgent,
  );

  if ('requires2FA' in result && result.requires2FA) {
    return res.status(200).json(
      new ApiResponse(true, 'Two-factor authentication required', {
        requires2FA: true,
        userId: result.userId,
        user: result.user,
      }),
    );
  }

  if ('requires2FASetup' in result && result.requires2FASetup) {
    return res.status(200).json(
      new ApiResponse(true, 'Two-factor enrollment required before admin access', {
        requires2FASetup: true,
        userId: result.userId,
        user: result.user,
      }),
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
  const refreshToken = String(req.cookies?.[ADMIN_REFRESH_COOKIE] || '').trim();

  logger.info('[ADMIN AUTH] Admin manual logout requested');
  if (refreshToken) {
    await SessionAuthService.revokeSession(refreshToken);
  }
  clearAdminRefreshCookie(res);
  clearCsrfCookie(res);

  res.status(200).json(new ApiResponse(true, 'Admin logged out successfully'));
});

export const adminForgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const token = await AdminAuthService.generateAdminPasswordResetToken(
    email,
    req.ip || '127.0.0.1',
  );

  if (token) {
    // Send email with the token (this is typically done via a background job, but we dispatch it here)
    const { sendDirectEmail } = require('../../services/notificationService');
    const frontendUrl = getFrontendUrl() + '/admin';
    const resetLink = `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      sendDirectEmail({
        email,
        subject: 'Admin Password Reset Request',
        customHtml: `<p>You requested an admin password reset.</p><p>Click <a href="${resetLink}">here</a> to reset your password. This link is valid for 15 minutes.</p><p>If you did not request this, please ignore this email.</p>`,
        type: 'security',
        action: 'admin_password_reset',
      }).catch((err: any) => logger.error('[ADMIN AUTH] Password reset email failed:', err));
    } catch (err) {
      logger.error('Failed to trigger Admin Password Reset email:', err);
    }
  }

  // Generic response to prevent email enumeration
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'If your email is registered as an admin, a password reset link has been sent.',
      ),
    );
});

export const adminResetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    throw new ApiError(400, 'Email, token, and new password are required');
  }

  await AdminAuthService.resetAdminPassword(email, token, newPassword);

  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Password has been successfully reset. Please log in with your new password.',
      ),
    );
});
