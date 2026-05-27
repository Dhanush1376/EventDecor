import { Router } from 'express';
import { getDashboardStats, getAuditLogs, createAuditLog, clearAuditLogs } from '../controllers/analyticsController';
import { getPaymentReconciliationReport } from '../controllers/paymentReconciliationController';
import { requireAuth, requireAdmin, requireRole } from '../middleware/authMiddleware';
import { adminResponseCache } from '../middleware/adminResponseCache';

const router = Router();
// Heavy dashboard aggregates — default 5 min; override with ADMIN_ANALYTICS_CACHE_TTL (seconds)
const ADMIN_ANALYTICS_TTL = Number(process.env.ADMIN_ANALYTICS_CACHE_TTL) || 300;

router.get('/dashboard', requireAuth, requireRole(['super_admin', 'main_admin']), adminResponseCache(ADMIN_ANALYTICS_TTL), getDashboardStats);
router.get('/audit-logs', requireAuth, requireRole(['super_admin', 'main_admin']), getAuditLogs);
router.post('/audit-logs', requireAuth, requireRole(['super_admin', 'main_admin']), createAuditLog);
router.delete('/audit-logs', requireAuth, requireRole(['super_admin', 'main_admin']), clearAuditLogs);
router.get('/payments/reconciliation', requireAuth, requireRole(['super_admin', 'main_admin']), getPaymentReconciliationReport);

export default router;
