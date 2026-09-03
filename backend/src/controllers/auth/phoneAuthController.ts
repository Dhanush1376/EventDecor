import { Request, Response } from 'express';
import { PhoneAuthService } from '../../services/PhoneAuthService';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import { invalidateUserSessionCaches } from '../../utils/cache/userSessionCache';
import { STAFF_ROLES } from '../../config/adminConfig';
import { setAdminRefreshCookie, setCustomerRefreshCookie } from '../../utils/security/authCookies';
import { regenerateCsrfToken } from '../../middleware/csrfMiddleware';

export const requestPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;
  const clientIp = req.ip || '127.0.0.1';

  const { challengeId } = await PhoneAuthService.requestOtp(phone, clientIp);

  res
    .status(200)
    .json(
      new ApiResponse(true, 'If the number is valid, you will receive a verification code.', {
        challengeId,
      }),
    );
});

export const verifyPhoneOtp = asyncHandler(async (req: Request, res: Response) => {
  const { challengeId, otp } = req.body;
  const clientIp = req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';

  const result = await PhoneAuthService.authenticateWithPhone(
    challengeId,
    otp,
    clientIp,
    userAgent,
  );

  if (result.requires2FA) {
    return res.status(200).json(
      new ApiResponse(true, 'Two-factor authentication required', {
        requires2FA: true,
        userId: result.user._id,
        user: result.user,
      }),
    );
  }

  await invalidateUserSessionCaches(String(result.user._id));

  if ((STAFF_ROLES as readonly string[]).includes(result.user.role)) {
    setAdminRefreshCookie(res, result.refreshToken);
  } else {
    setCustomerRefreshCookie(res, result.refreshToken);
  }

  const csrfToken = regenerateCsrfToken(res);

  const payload = {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    csrfToken,
  };

  res.status(200).json(new ApiResponse(true, 'Authenticated successfully', payload));
});
