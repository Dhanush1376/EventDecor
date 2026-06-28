import express from 'express';
import { requireAuth, authorize } from '../../middleware/authMiddleware';
import * as returnController from '../../controllers/returns/returnController';
import * as returnAdminController from '../../controllers/returns/returnAdminController';
import * as warehouseController from '../../controllers/returns/warehouseController';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import {
  createReturnSchema,
  inspectionChecklistSchema,
  rejectReturnSchema,
  transitionStatusSchema,
} from '../../validators/returnValidator';
const router = express.Router();

// CUSTOMER ROUTES
router.post('/', requireAuth, validateRequest(createReturnSchema), returnController.createReturn);
router.get('/my-returns', requireAuth, returnController.getMyReturns);
router.get('/order-state/:orderId', requireAuth, returnController.checkEligibility);
router.get('/order/:orderId/summary', requireAuth, returnController.getReturnForOrder);
router.get('/:id', requireAuth, returnController.getReturnById);
router.post('/:id/cancel', requireAuth, returnController.cancelReturn);
router.post('/:id/message', requireAuth, returnController.addConversationMessage);

// WAREHOUSE ROUTES
router.get(
  '/warehouse/queue',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'editor'),
  warehouseController.getInspectionQueue,
);
router.patch(
  '/warehouse/:id/items/:itemIndex/receive',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'editor'),
  warehouseController.markItemReceived,
);
router.patch(
  '/warehouse/:id/items/:itemIndex/inspect',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'editor'),
  validateRequest(inspectionChecklistSchema),
  warehouseController.submitInspection,
);

// ADMIN ROUTES
router.get(
  '/admin/dashboard',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'analyst'),
  returnAdminController.getDashboardStats,
);
router.get(
  '/admin/all',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'editor', 'analyst'),
  returnAdminController.getAllReturns,
);
router.post(
  '/admin/bulk',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin'),
  returnAdminController.bulkAction,
);

router.get(
  '/admin/refunds/stats',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'analyst'),
  returnAdminController.getRefundStats,
);
router.get(
  '/admin/pickups',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'editor', 'analyst'),
  returnAdminController.getPickupList,
);
router.get(
  '/admin/analytics',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'analyst'),
  returnAdminController.getAnalytics,
);
router.get(
  '/admin/fraud/alerts',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'analyst'),
  returnAdminController.getFraudAlerts,
);
router.get(
  '/admin/fraud/customers',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'analyst'),
  returnAdminController.getHighRiskCustomers,
);
router.get(
  '/admin/settings',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin'),
  returnAdminController.getReturnSettings,
);
router.put(
  '/admin/settings',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin'),
  returnAdminController.updateReturnSettings,
);

router.get(
  '/admin/enterprise-analytics',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'analyst'),
  returnAdminController.getEnterpriseAnalytics,
);

// Parameterized routes MUST be at the bottom
router.get(
  '/admin/:id',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'editor', 'analyst'),
  returnAdminController.getReturnDetails,
);
router.patch(
  '/admin/:id/approve',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin'),
  returnAdminController.approveReturn,
);
router.patch(
  '/admin/:id/reject',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin'),
  validateRequest(rejectReturnSchema),
  returnAdminController.rejectReturn,
);
router.patch(
  '/admin/:id/transition',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'editor'),
  validateRequest(transitionStatusSchema),
  returnAdminController.transitionStatus,
);
router.post(
  '/admin/:id/refund',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin'),
  returnAdminController.triggerRefund,
);
router.post(
  '/admin/:id/notes',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'editor'),
  returnAdminController.addInternalNote,
);
router.patch(
  '/admin/:id/pickup',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin', 'editor'),
  returnAdminController.updatePickupDetails,
);
router.post(
  '/admin/:id/complete',
  requireAuth,
  authorize('super_admin', 'main_admin', 'admin'),
  returnAdminController.completeReturn,
);
export default router;
