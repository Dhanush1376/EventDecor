import { Router } from 'express';
import {
  getOverview,
  getCTR,
  getTrendingHistory,
  getUserInterests,
  getSeasonalDemand,
  getConversionImpact,
  getLiveUserLogs,
} from '../../controllers/discovery/recommendationAnalyticsController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import { requestTimeout } from '../../middleware/queryTimeout';

const router = Router();

// All analytics routes require admin authentication and an explicit timeout layer
router.use(requireAuth, requireAdmin, requestTimeout(25000));

router.get('/overview', getOverview);
router.get('/ctr', getCTR);
router.get('/trending-history', getTrendingHistory);
router.get('/user-interests', getUserInterests);
router.get('/seasonal-demand', getSeasonalDemand);
router.get('/conversion-impact', getConversionImpact);
router.get('/live-user-logs', getLiveUserLogs);

export default router;
