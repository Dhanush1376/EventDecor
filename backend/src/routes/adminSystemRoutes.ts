import { Router } from 'express';
import {
  adminLogin,
  adminLogout,
  adminSetupTwoFactor,
  adminEnableTwoFactor,
  adminVerifyTwoFactor,
  adminForgotPassword,
  adminResetPassword,
} from '../controllers/adminAuthController';
import { getAdmins, addAdmin, updateAdminRole, removeAdmin } from '../controllers/adminManagementController';
import { requireAuth, requireRole, requireSuperAdmin } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// --- Admin Authentication ---
// Strictly rate-limited to prevent brute-force attacks
router.post('/auth/login', authLimiter, adminLogin);
router.post('/auth/logout', authLimiter, adminLogout);
router.post('/auth/forgot-password', authLimiter, adminForgotPassword);
router.post('/auth/reset-password', authLimiter, adminResetPassword);
router.post('/auth/2fa/setup', authLimiter, adminSetupTwoFactor);
router.post('/auth/2fa/enable', authLimiter, adminEnableTwoFactor);
router.post('/auth/verify-2fa', authLimiter, adminVerifyTwoFactor);

// --- RBAC Admin Management (Protected) ---
router.get('/system/users', requireSuperAdmin, getAdmins);
router.post('/system/users', requireSuperAdmin, addAdmin);
router.put('/system/users/:id/role', requireSuperAdmin, updateAdminRole);
router.delete('/system/users/:id', requireSuperAdmin, removeAdmin);

export default router;
