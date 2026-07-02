import { Router } from 'express';
import {
  authenticateGateway,
  verifyGatewayOtp,
  getMaintenanceStatus,
  enableMaintenance,
  disableMaintenance,
  getAuditLogs,
  logoutGateway,
} from '../../controllers/system/maintenanceController';
import {
  requireAuth,
  requireSuperAdmin,
  requireMaintenanceSession,
} from '../../middleware/authMiddleware';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import {
  maintenanceAuthenticateSchema,
  maintenanceVerifyOtpSchema,
  maintenanceEnableSchema,
} from '../../validators/maintenanceGatewaySchema';
import { maintenanceGatewayLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Public / Gateway Routes (These bypass maintenance mode via whitelist in middleware)
router.get('/status', getMaintenanceStatus);
router.post(
  '/gateway/authenticate',
  maintenanceGatewayLimiter,
  validateRequest(maintenanceAuthenticateSchema),
  authenticateGateway,
);
router.post(
  '/gateway/verify-otp',
  maintenanceGatewayLimiter,
  validateRequest(maintenanceVerifyOtpSchema),
  verifyGatewayOtp,
);
router.post('/gateway/logout', logoutGateway);

// Protected Admin Routes (Require normal super admin JWT)
// Note: These might be blocked if maintenance is active and they don't have a maintenance session!
// So they should ideally require either super_admin OR maintenance session.
router.post(
  '/enable',
  requireAuth,
  requireSuperAdmin,
  validateRequest(maintenanceEnableSchema),
  enableMaintenance,
);

// These routes require an active maintenance session because they are used DURING maintenance
router.post('/disable', requireMaintenanceSession, disableMaintenance);
router.get('/audit-logs', requireMaintenanceSession, getAuditLogs);

export default router;
