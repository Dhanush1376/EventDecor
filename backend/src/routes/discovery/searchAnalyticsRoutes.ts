import { Router } from 'express';
import {
  trackSearchEvent,
  getSearchDashboardStats,
} from '../../controllers/discovery/searchAnalyticsController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// Public endpoint for frontend tracking
router.post('/track', trackSearchEvent);

// Protected admin endpoint for dashboard
router.get('/dashboard', requireAuth, requireAdmin, getSearchDashboardStats);

export default router;
