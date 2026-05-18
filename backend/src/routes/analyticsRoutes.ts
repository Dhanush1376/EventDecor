import { Router } from 'express';
import { getDashboardStats } from '../controllers/analyticsController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', requireAuth, requireAdmin, getDashboardStats);

export default router;
