import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createOrder, verifyPayment, getMyOrders, getAllOrders, updateOrderStatus, validateTotals, getOrderById, getOrderPublicTrack, updateOrderPublicStatus, sendCodOtp, verifyCodOtp, updateOrderNotes } from '../controllers/orderController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { createOrderValidator, updateStatusValidator } from '../validators/orderValidator';
import { validate } from '../middleware/validateMiddleware';

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
router.patch('/:id/public-status', ...updateStatusValidator, validate, updateOrderPublicStatus);



router.post('/', requireAuth, ...createOrderValidator, validate, createOrder);
router.post('/verify-payment', requireAuth, verifyPayment);
router.post('/validate-totals', requireAuth, validateTotals);
router.get('/my-orders', requireAuth, getMyOrders);

router.post('/send-cod-otp', requireAuth, sendCodOtp);
router.post('/verify-cod-otp', requireAuth, verifyCodOtp);

// Admin Routes
router.get('/', requireAuth, requireAdmin, getAllOrders);
router.patch('/:id/status', requireAuth, requireAdmin, ...updateStatusValidator, validate, updateOrderStatus);
router.patch('/:id/notes', requireAuth, requireAdmin, updateOrderNotes);

router.get('/:id', requireAuth, getOrderById);

export default router;
