import { Router } from 'express';
import {
  adminLogin,
  adminLogout,
  adminSetupTwoFactor,
  adminEnableTwoFactor,
  adminVerifyTwoFactor,
  adminForgotPassword,
  adminResetPassword,
} from '../../controllers/auth/adminAuthController';
import {
  getAdmins,
  addAdmin,
  updateAdminRole,
  removeAdmin,
  getDeadLetterWebhooks,
  retryDeadLetterWebhook,
} from '../../controllers/system/adminManagementController';
import { requireSuperAdmin, requireAuth } from '../../middleware/authMiddleware';
import { authLimiter } from '../../middleware/rateLimiter';

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
router.get('/system/users', requireAuth, requireSuperAdmin, getAdmins);
router.post('/system/users', requireAuth, requireSuperAdmin, addAdmin);
router.put('/system/users/:id/role', requireAuth, requireSuperAdmin, updateAdminRole);
router.delete('/system/users/:id', requireAuth, requireSuperAdmin, removeAdmin);

// --- Webhook DLQ Management (Protected) ---
router.get('/system/webhooks/dlq', requireAuth, requireSuperAdmin, getDeadLetterWebhooks);
router.post(
  '/system/webhooks/dlq/:id/retry',
  requireAuth,
  requireSuperAdmin,
  retryDeadLetterWebhook,
);

export default router;
