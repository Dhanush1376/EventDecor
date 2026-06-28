import { Router } from 'express';
import {
  sendOTP,
  verifyOTP,
  getProfile,
  refreshSession,
  logout,
  logoutAllDevices,
  googleAuth,
} from '../../controllers/auth/authController';
import {
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactorLogin,
} from '../../controllers/auth/twoFactorController';
import { requireAuth } from '../../middleware/authMiddleware';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshSessionSchema,
  logoutSchema,
  twoFactorVerifyLoginSchema,
} from '../../validators/authSchema';
import { googleAuthSchema } from '../../validators/googleAuthSchema';
import { authLimiter, otpSendLimiter, otpVerifyLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Removed deprecated register/login routes (A-01)

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     summary: Send OTP to an email address
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid email format
 */
router.post('/send-otp', otpSendLimiter, validateRequest(sendOtpSchema), sendOTP);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify an OTP to login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *       401:
 *         description: Invalid OTP
 */
router.post('/verify-otp', otpVerifyLimiter, validateRequest(verifyOtpSchema), verifyOTP);
router.post('/google', authLimiter, validateRequest(googleAuthSchema), googleAuth);
router.post('/refresh', authLimiter, validateRequest(refreshSessionSchema), refreshSession);
router.post('/logout', authLimiter, validateRequest(logoutSchema), logout);
router.post('/logout-all', authLimiter, requireAuth, logoutAllDevices);
router.get('/profile', requireAuth, getProfile);

router.get('/2fa/status', requireAuth, getTwoFactorStatus);
router.post('/2fa/setup', authLimiter, requireAuth, setupTwoFactor);
router.post('/2fa/enable', authLimiter, requireAuth, enableTwoFactor);
router.post('/2fa/disable', authLimiter, requireAuth, disableTwoFactor);
router.post(
  '/2fa/verify-login',
  authLimiter,
  validateRequest(twoFactorVerifyLoginSchema),
  verifyTwoFactorLogin,
);

export default router;
