import { Router } from 'express';
import {
  getLoyaltyDashboard,
  applyReferralCode,
  getAdminReviews,
  moderateReview,
  getLoyaltyTiers,
} from '../../controllers/users/loyaltyController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// User Wallet & Loyalty Dashboard
router.get('/tiers', getLoyaltyTiers);
router.get('/dashboard', requireAuth, getLoyaltyDashboard);

// Apply Referral link/code
router.post('/apply-referral', requireAuth, applyReferralCode);

// Admin review moderation and loyalty payouts
router.get('/admin/reviews', requireAuth, requireAdmin, getAdminReviews);
router.post('/admin/moderate-review', requireAuth, requireAdmin, moderateReview);

export default router;
