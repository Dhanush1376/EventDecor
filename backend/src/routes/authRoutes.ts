import { Router } from 'express';
import { sendOTP, verifyOTP, getProfile, register, login, checkEmail, refreshSession, logout } from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';
import { sendOtpValidator, verifyOtpValidator } from '../validators/authValidator';
import { validate } from '../middleware/validateMiddleware';

import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { sendEmail } from '../services/emailProvider';
import logger from '../config/logger';

const router = Router();

// Keep register/login defined but pointing to controller that returns deprecation warning if hit
router.post('/register', register);
router.post('/login', login);

router.post('/check-email', checkEmail);
router.post('/send-otp', sendOtpValidator, validate, sendOTP);
router.post('/verify-otp', verifyOtpValidator, validate, verifyOTP);
router.post('/refresh', refreshSession);
router.post('/logout', logout);
router.get('/profile', requireAuth, getProfile);

// Public email validation/test endpoint
router.get('/test-email', asyncHandler(async (req: Request, res: Response) => {
  const to = req.query.email as string || 'dhanush1376@gmail.com';
  logger.info(`[TEST EMAIL] Initiating test email dispatch to: ${to}`);
  const result = await sendEmail({
    to,
    subject: 'Siri Arts & Crafts - Test Email',
    html: '<h1>Success!</h1><p>This is a test email from your Siri Arts & Crafts application server.</p>',
  });
  res.status(200).json({
    success: true,
    message: `Test email sent successfully to ${to}`,
    messageId: result.messageId,
  });
}));

export default router;
