import { Router } from 'express';
import {
  getCoupons,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
} from '../controllers/couponController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Public/Auth Routes
router.get('/validate/:code', getCouponByCode);
router.post('/apply', requireAuth, applyCoupon);

// Admin & Authenticated Routes
router.get('/', requireAuth, getCoupons);
router.post('/', requireAuth, requireAdmin, createCoupon);
router.put('/:id', requireAuth, requireAdmin, updateCoupon);
router.delete('/:id', requireAuth, requireAdmin, deleteCoupon);

export default router;
