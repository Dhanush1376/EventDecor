import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createOrder, verifyPayment, getMyOrders, getAllOrders, updateOrderStatus, validateTotals, getOrderById, getOrderPublicTrack, updateOrderPublicStatus, sendCodOtp, verifyCodOtp, updateOrderNotes } from '../controllers/orderController';
import { requireAuth, requireAdmin, optionalAuth, publicTrackingAuth } from '../middleware/authMiddleware';
import {
  createOrderSchema,
  updateStatusSchema,
  verifyPaymentSchema,
  validateTotalsSchema,
  codOtpEmailBodySchema,
  codOtpVerifySchema,
  orderNotesSchema,
} from '../validators/orderSchema';
import { validateRequest } from '../middleware/zodValidationMiddleware';

const router = Router();

const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many tracking requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Public Logistics Tracking Scan Routes (token required)
router.get('/:id/public-track', trackingLimiter, getOrderPublicTrack);
router.patch('/:id/public-status', optionalAuth, publicTrackingAuth, validateRequest(updateStatusSchema), updateOrderPublicStatus);



router.post('/', requireAuth, validateRequest(createOrderSchema), createOrder);
router.post('/verify-payment', requireAuth, validateRequest(verifyPaymentSchema), verifyPayment);
router.post('/validate-totals', requireAuth, validateRequest(validateTotalsSchema), validateTotals);
router.get('/my-orders', requireAuth, getMyOrders);

router.post('/send-cod-otp', requireAuth, validateRequest(codOtpEmailBodySchema), sendCodOtp);
router.post('/verify-cod-otp', requireAuth, validateRequest(codOtpVerifySchema), verifyCodOtp);

// Admin Routes
router.get('/', requireAuth, requireAdmin, getAllOrders);
router.patch('/:id/status', requireAuth, requireAdmin, validateRequest(updateStatusSchema), updateOrderStatus);
router.patch('/:id/notes', requireAuth, requireAdmin, validateRequest(orderNotesSchema), updateOrderNotes);

router.get('/:id', requireAuth, getOrderById);

export default router;
