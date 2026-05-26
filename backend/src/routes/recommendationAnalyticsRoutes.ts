import { Router } from 'express';
import {
  getOverview,
  getCTR,
  getTrendingHistory,
  getUserInterests,
  getSeasonalDemand,
  getConversionImpact,
} from '../controllers/recommendationAnalyticsController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// All analytics routes require admin authentication
router.use(requireAuth, requireAdmin);

router.get('/overview', getOverview);
router.get('/ctr', getCTR);
router.get('/trending-history', getTrendingHistory);
router.get('/user-interests', getUserInterests);
router.get('/seasonal-demand', getSeasonalDemand);
router.get('/conversion-impact', getConversionImpact);

export default router;
