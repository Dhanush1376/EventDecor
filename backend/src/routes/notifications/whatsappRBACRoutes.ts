import { Router } from 'express';
import { WhatsAppRBACController } from '../../controllers/notifications/whatsappRBACController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// Only Super Admins can manage RBAC
router.use(requireAuth, requireAdmin);

// Roles
router.get('/roles', WhatsAppRBACController.getRoles);
router.post('/roles', WhatsAppRBACController.createRole);
router.put('/roles/:id', WhatsAppRBACController.updateRole);

// Approvals
router.get('/approvals', WhatsAppRBACController.getApprovalRequests);
router.post('/approvals/:id/approve', WhatsAppRBACController.approveRequest);
router.post('/approvals/:id/reject', WhatsAppRBACController.rejectRequest);

export default router;
