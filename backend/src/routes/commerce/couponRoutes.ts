import { Router } from 'express';
import {
  getCoupons,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  getProductCoupons,
} from '../../controllers/commerce/couponController';
import { requireAuth, requireAdmin, optionalAuth } from '../../middleware/authMiddleware';

const router = Router();

// Public/Auth Routes
router.get('/validate/:code', getCouponByCode);
router.post('/apply', requireAuth, applyCoupon);
router.get('/product/:productId', optionalAuth, getProductCoupons);

// Admin & Authenticated Routes
router.get('/', optionalAuth, getCoupons);
router.post('/', requireAuth, requireAdmin, createCoupon);
router.put('/:id', requireAuth, requireAdmin, updateCoupon);
router.delete('/:id', requireAuth, requireAdmin, deleteCoupon);

export default router;
