import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import * as approvalController from '../../controllers/system/approvalController';

const router = Router();

// Allow all authorized staff roles
router.use(requireAuth);
router.use(requireAdmin);

router.get('/', approvalController.getPendingApprovals);
router.get('/stats', approvalController.getApprovalStats);
router.post('/:id/approve', approvalController.approveRequest);
router.post('/:id/reject', approvalController.rejectRequest);

export default router;
