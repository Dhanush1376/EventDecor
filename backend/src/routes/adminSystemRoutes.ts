import { Router } from 'express';
import { adminLogin, adminLogout } from '../controllers/adminAuthController';
import { getAdmins, addAdmin, updateAdminRole, removeAdmin } from '../controllers/adminManagementController';
import { requireAuth, requireRole, requireSuperAdmin } from '../middleware/authMiddleware';

const router = Router();

// --- Admin Authentication ---
router.post('/auth/login', adminLogin);
router.post('/auth/logout', adminLogout);

// --- RBAC Admin Management (Protected) ---
router.get('/system/users', requireSuperAdmin, getAdmins);
router.post('/system/users', requireSuperAdmin, addAdmin);
router.put('/system/users/:id/role', requireSuperAdmin, updateAdminRole);
router.delete('/system/users/:id', requireSuperAdmin, removeAdmin);

export default router;
