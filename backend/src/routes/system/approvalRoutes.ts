import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/authMiddleware';
import * as approvalController from '../../controllers/system/approvalController';

const router = Router();

// Only admin/super_admin can manage approvals
router.use(requireAuth);
router.use(requireRole(['admin', 'super_admin']));

router.get('/', approvalController.getPendingApprovals);
router.get('/stats', approvalController.getApprovalStats);
router.post('/:id/approve', approvalController.approveRequest);
router.post('/:id/reject', approvalController.rejectRequest);

export default router;
