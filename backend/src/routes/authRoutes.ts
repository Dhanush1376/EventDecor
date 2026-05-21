import { Router } from 'express';
import { sendOTP, verifyOTP, getProfile, register, login, checkEmail, refreshSession, logout } from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';
import { sendOtpValidator, verifyOtpValidator } from '../validators/authValidator';
import { validate } from '../middleware/validateMiddleware';

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

export default router;
