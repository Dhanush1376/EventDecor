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
import { STAFF_ROLES } from '../../config/adminConfig';

const router = Router();
// Heavy dashboard aggregates — default 5 min; override with ADMIN_ANALYTICS_CACHE_TTL (seconds)
const ADMIN_ANALYTICS_TTL = Number(process.env.ADMIN_ANALYTICS_CACHE_TTL) || 300;

router.get(
  '/dashboard',
  requireAuth,
  requireRole([...STAFF_ROLES]),
  requestTimeout(25000), // 25s explicit timeout for heavy dashboard aggregates
  dynamicResponseCache(ADMIN_ANALYTICS_TTL, 'admin'),
  getDashboardStats,
);
router.get('/audit-logs', requireAuth, requireRole([...STAFF_ROLES]), getAuditLogs);
router.post('/audit-logs', requireAuth, requireRole([...STAFF_ROLES]), createAuditLog);
router.delete('/audit-logs', requireAuth, requireRole([...STAFF_ROLES]), clearAuditLogs);
router.get(
  '/payments/reconciliation',
  requireAuth,
  requireRole([...STAFF_ROLES]),
  requestTimeout(25000), // 25s timeout for reconciliation queries
  getPaymentReconciliationReport,
);
router.post(
  '/payments/reconciliation/trigger',
  requireAuth,
  requireRole([...STAFF_ROLES]),
  triggerDeepReconciliation,
);

router.post('/events', collectBulkEvents);

export default router;
