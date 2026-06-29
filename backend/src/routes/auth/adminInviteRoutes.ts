import { Router } from 'express';
import {
  createAdminInvite,
  getPendingInvites,
  getInviteHistory,
  revokeAdminInvite,
  getMyPendingInvite,
  respondToAdminInvite,
} from '../../controllers/auth/adminInviteController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// --- Administrative Actions (Any Admin can access, further RBAC is in controllers) ---
router.post('/', requireAuth, requireAdmin, createAdminInvite);
router.get('/pending', requireAuth, requireAdmin, getPendingInvites);
router.get('/history', requireAuth, requireAdmin, getInviteHistory);
router.delete('/:id/revoke', requireAuth, requireAdmin, revokeAdminInvite);

// --- User Response Actions (Any Authenticated User) ---
router.get('/my-pending', requireAuth, getMyPendingInvite);
router.post('/respond', requireAuth, respondToAdminInvite);

export default router;
