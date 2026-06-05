import { Router } from 'express';
import { issueManualRefund, getRefundStatus } from '../controllers/refundController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Customer facing route (checks if the user owns the entity inside the controller)
router.get('/:entityType/:entityId', requireAuth, getRefundStatus);

// Admin manual refund route
router.post(
  '/admin/:entityType/:entityId',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin']),
  issueManualRefund,
);

export default router;
