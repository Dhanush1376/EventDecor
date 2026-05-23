import { Router } from 'express';
import {
  createAdminInvite,
  getPendingInvites,
  getInviteHistory,
  revokeAdminInvite,
  getMyPendingInvite,
  respondToAdminInvite,
} from '../controllers/adminInviteController';
import { requireAuth, requireSuperAdminOrOwner } from '../middleware/authMiddleware';

const router = Router();

// --- Administrative Actions (Only Super Admin / Owner) ---
router.post('/', requireAuth, requireSuperAdminOrOwner, createAdminInvite);
router.get('/pending', requireAuth, requireSuperAdminOrOwner, getPendingInvites);
router.get('/history', requireAuth, requireSuperAdminOrOwner, getInviteHistory);
router.delete('/:id/revoke', requireAuth, requireSuperAdminOrOwner, revokeAdminInvite);

// --- User Response Actions (Any Authenticated User) ---
router.get('/my-pending', requireAuth, getMyPendingInvite);
router.post('/respond', requireAuth, respondToAdminInvite);

export default router;
