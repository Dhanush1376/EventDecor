import { Router } from 'express';
import {
  adminLogin,
  adminLogout,
  adminSetupTwoFactor,
  adminEnableTwoFactor,
  adminVerifyTwoFactor,
} from '../controllers/adminAuthController';
import { getAdmins, addAdmin, updateAdminRole, removeAdmin } from '../controllers/adminManagementController';
import { requireAuth, requireRole, requireSuperAdmin } from '../middleware/authMiddleware';

const router = Router();

// --- Admin Authentication ---
router.post('/auth/login', adminLogin);
router.post('/auth/logout', adminLogout);
router.post('/auth/2fa/setup', adminSetupTwoFactor);
router.post('/auth/2fa/enable', adminEnableTwoFactor);
router.post('/auth/verify-2fa', adminVerifyTwoFactor);

// --- RBAC Admin Management (Protected) ---
router.get('/system/users', requireSuperAdmin, getAdmins);
router.post('/system/users', requireSuperAdmin, addAdmin);
router.put('/system/users/:id/role', requireSuperAdmin, updateAdminRole);
router.delete('/system/users/:id', requireSuperAdmin, removeAdmin);

export default router;
