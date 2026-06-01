import { Router } from 'express';
import {
  createAdminInvite,
  getPendingInvites,
  getInviteHistory,
  revokeAdminInvite,
  getMyPendingInvite,
  respondToAdminInvite,
} from '../controllers/adminInviteController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { ADMIN_ROLES } from '../config/adminConfig';

const router = Router();

// --- Administrative Actions (Any Admin can access, further RBAC is in controllers) ---
router.post('/', requireAuth, requireRole([...ADMIN_ROLES]), createAdminInvite);
router.get('/pending', requireAuth, requireRole([...ADMIN_ROLES]), getPendingInvites);
router.get('/history', requireAuth, requireRole([...ADMIN_ROLES]), getInviteHistory);
router.delete('/:id/revoke', requireAuth, requireRole([...ADMIN_ROLES]), revokeAdminInvite);

// --- User Response Actions (Any Authenticated User) ---
router.get('/my-pending', requireAuth, getMyPendingInvite);
router.post('/respond', requireAuth, respondToAdminInvite);

export default router;
