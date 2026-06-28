import { Router } from 'express';
import {
  getDashboardStats,
  getAuditLogs,
  createAuditLog,
  clearAuditLogs,
} from '../../controllers/system/analyticsController';
import { collectBulkEvents } from '../../controllers/system/analyticsEventController';
import {
  getPaymentReconciliationReport,
  triggerDeepReconciliation,
} from '../../controllers/commerce/paymentReconciliationController';
import { requireAuth, requireRole } from '../../middleware/authMiddleware';
import { dynamicResponseCache } from '../../middleware/dynamicCacheMiddleware';
import { requestTimeout } from '../../middleware/queryTimeout';

const router = Router();
// Heavy dashboard aggregates — default 5 min; override with ADMIN_ANALYTICS_CACHE_TTL (seconds)
const ADMIN_ANALYTICS_TTL = Number(process.env.ADMIN_ANALYTICS_CACHE_TTL) || 300;

router.get(
  '/dashboard',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin']),
  requestTimeout(25000), // 25s explicit timeout for heavy dashboard aggregates
  dynamicResponseCache(ADMIN_ANALYTICS_TTL, 'admin'),
  getDashboardStats,
);
router.get(
  '/audit-logs',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin']),
  getAuditLogs,
);
router.post(
  '/audit-logs',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin']),
  createAuditLog,
);
router.delete(
  '/audit-logs',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin']),
  clearAuditLogs,
);
router.get(
  '/payments/reconciliation',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin']),
  requestTimeout(25000), // 25s timeout for reconciliation queries
  getPaymentReconciliationReport,
);
router.post(
  '/payments/reconciliation/trigger',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin']),
  triggerDeepReconciliation,
);

router.post('/events', collectBulkEvents);

export default router;
