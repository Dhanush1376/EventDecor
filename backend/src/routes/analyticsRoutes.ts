import { Router } from 'express';
import { getDashboardStats, getAuditLogs, createAuditLog, clearAuditLogs } from '../controllers/analyticsController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', requireAuth, requireAdmin, getDashboardStats);
router.get('/audit-logs', requireAuth, requireAdmin, getAuditLogs);
router.post('/audit-logs', requireAuth, requireAdmin, createAuditLog);
router.delete('/audit-logs', requireAuth, requireAdmin, clearAuditLogs);

export default router;
