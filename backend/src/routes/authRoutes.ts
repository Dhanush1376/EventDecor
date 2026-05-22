import { Router } from 'express';
import { sendOTP, verifyOTP, getProfile, checkEmail, refreshSession, logout } from '../controllers/authController';
import {
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  verifyTwoFactorLogin,
} from '../controllers/twoFactorController';
import { requireAuth } from '../middleware/authMiddleware';
import { sendOtpValidator, verifyOtpValidator, checkEmailValidator } from '../validators/authValidator';
import { validate } from '../middleware/validateMiddleware';

const router = Router();

// Removed deprecated register/login routes (A-01)

router.post('/check-email', checkEmailValidator, validate, checkEmail);
router.post('/send-otp', sendOtpValidator, validate, sendOTP);
router.post('/verify-otp', verifyOtpValidator, validate, verifyOTP);
router.post('/refresh', refreshSession);
router.post('/logout', logout);
router.get('/profile', requireAuth, getProfile);

router.get('/2fa/status', requireAuth, getTwoFactorStatus);
router.post('/2fa/setup', requireAuth, setupTwoFactor);
router.post('/2fa/enable', requireAuth, enableTwoFactor);
router.post('/2fa/disable', requireAuth, disableTwoFactor);
router.post('/2fa/verify-login', verifyTwoFactorLogin);

export default router;
