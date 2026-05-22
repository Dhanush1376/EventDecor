import { Router } from 'express';
import { getDashboardStats, getAuditLogs, createAuditLog, clearAuditLogs } from '../controllers/analyticsController';
import { getPaymentReconciliationReport } from '../controllers/paymentReconciliationController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { adminResponseCache } from '../middleware/adminResponseCache';

const router = Router();
const ADMIN_ANALYTICS_TTL = Number(process.env.ADMIN_ANALYTICS_CACHE_TTL) || 20;

router.get('/dashboard', requireAuth, requireAdmin, adminResponseCache(ADMIN_ANALYTICS_TTL), getDashboardStats);
router.get('/audit-logs', requireAuth, requireAdmin, getAuditLogs);
router.post('/audit-logs', requireAuth, requireAdmin, createAuditLog);
router.delete('/audit-logs', requireAuth, requireAdmin, clearAuditLogs);
router.get('/payments/reconciliation', requireAuth, requireAdmin, getPaymentReconciliationReport);

export default router;
