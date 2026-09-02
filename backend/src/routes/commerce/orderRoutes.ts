import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { STAFF_ROLES } from '../../config/adminConfig';
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
  getOrderTimeline,
  softDeleteOrder,
} from '../../controllers/commerce/orderController';
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
} from '../../validators/orderSchema';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import { idempotencyGuard } from '../../middleware/idempotencyMiddleware';
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
  idempotencyGuard(),
  validateRequest(createOrderSchema),
  createOrder,
);
router.post(
  '/verify-payment',
  requireAuth,
  paymentVerifyLimiter,
  idempotencyGuard(),
  validateRequest(verifyPaymentSchema),
  verifyPayment,
);
router.post('/validate-totals', requireAuth, validateRequest(validateTotalsSchema), validateTotals);
router.get('/my-orders', requireAuth, getMyOrders);

router.post('/send-cod-otp', requireAuth, validateRequest(codOtpEmailBodySchema), sendCodOtp);
router.post('/verify-cod-otp', requireAuth, validateRequest(codOtpVerifySchema), verifyCodOtp);

// Admin Routes
router.get('/', requireAuth, requireRole([...STAFF_ROLES]), getAllOrders);
router.patch(
  '/:id/status',
  requireAuth,
  requireRole([...STAFF_ROLES]),
  validateRequest(updateStatusSchema),
  updateOrderStatus,
);

router.get('/:id', requireAuth, getOrderById);
router.get('/:id/timeline', requireAuth, getOrderTimeline);
router.delete('/:id', requireAuth, requireRole([...STAFF_ROLES]), softDeleteOrder);

export default router;
