import { Router } from 'express';
import {
  getLoyaltyDashboard,
  getAdminReviews,
  moderateReview,
  getLoyaltyTiers,
  adjustWalletBalance,
} from '../../controllers/users/loyaltyController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// User Wallet & Loyalty Dashboard
router.get('/tiers', getLoyaltyTiers);
router.get('/dashboard', requireAuth, getLoyaltyDashboard);

// Admin review moderation and loyalty payouts
router.get('/admin/reviews', requireAuth, requireAdmin, getAdminReviews);
router.post('/admin/moderate-review', requireAuth, requireAdmin, moderateReview);
router.post('/admin/wallet-adjustment', requireAuth, requireAdmin, adjustWalletBalance);

export default router;
