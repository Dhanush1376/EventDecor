import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createOrder,
  verifyPayment,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  validateTotals,
  getOrderById,
  getOrderPublicTrack,
  updateOrderPublicStatus,
  sendCodOtp,
  verifyCodOtp,
  updateOrderNotes,
} from './orderController';
import {
  requireAuth,
  optionalAuth,
  publicTrackingAuth,
  requireRole,
} from '../../middleware/authMiddleware';
import {
  createOrderSchema,
  updateStatusSchema,
  verifyPaymentSchema,
  validateTotalsSchema,
  codOtpEmailBodySchema,
  codOtpVerifySchema,
  orderNotesSchema,
} from '../../validators/orderSchema';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import { createRateLimiter, accountKeyGenerator } from '../../middleware/rateLimiter';

const router = Router();

const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many tracking requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Prevent stock-exhaustion and payment replay attacks
const orderCreationLimiter = createRateLimiter('orderCreation', {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many order creation attempts. Please try again after 15 minutes.',
  keyGenerator: accountKeyGenerator,
});

const paymentVerifyLimiter = createRateLimiter('paymentVerify', {
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Too many payment verification attempts. Please try again after 15 minutes.',
  keyGenerator: accountKeyGenerator,
});

// Public Logistics Tracking Scan Routes (token required)
router.get('/:id/public-track', trackingLimiter, getOrderPublicTrack);
router.patch(
  '/:id/public-status',
  optionalAuth,
  publicTrackingAuth,
  validateRequest(updateStatusSchema),
  updateOrderPublicStatus,
);

router.post(
  '/',
  requireAuth,
  orderCreationLimiter,
  validateRequest(createOrderSchema),
  createOrder,
);
router.post(
  '/verify-payment',
  requireAuth,
  paymentVerifyLimiter,
  validateRequest(verifyPaymentSchema),
  verifyPayment,
);
router.post('/validate-totals', requireAuth, validateRequest(validateTotalsSchema), validateTotals);
router.get('/my-orders', requireAuth, getMyOrders);

router.post('/send-cod-otp', requireAuth, validateRequest(codOtpEmailBodySchema), sendCodOtp);
router.post('/verify-cod-otp', requireAuth, validateRequest(codOtpVerifySchema), verifyCodOtp);

// Admin Routes
router.get('/', requireAuth, requireRole(['super_admin', 'main_admin']), getAllOrders);
router.patch(
  '/:id/status',
  requireAuth,
  requireRole(['super_admin', 'main_admin']),
  validateRequest(updateStatusSchema),
  updateOrderStatus,
);
router.patch(
  '/:id/notes',
  requireAuth,
  requireRole(['super_admin', 'main_admin']),
  validateRequest(orderNotesSchema),
  updateOrderNotes,
);

router.get('/:id', requireAuth, getOrderById);

export default router;
