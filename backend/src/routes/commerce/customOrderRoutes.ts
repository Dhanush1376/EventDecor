import { Router } from 'express';
import {
  submitCustomOrder,
  submitProductCustomization,
  saveDraft,
  getMyDrafts,
  deleteDraft,
  getMyCustomOrders,
  getSingleCustomOrder,
} from '../../controllers/customOrder/customOrderCrudController';

import {
  customerRespondQuotation,
  postMessage,
  getOrderHistory,
} from '../../controllers/customOrder/customOrderWorkflowController';

import {
  adminGetCustomOrders,
  adminUpdateStatus,
  adminUpdatePriority,
  adminUpdateNotes,
  adminAddInternalNote,
  adminAssignStaff,
  adminUpdateQuotation,
  adminArchiveOrder,
} from '../../controllers/customOrder/customOrderAdminController';

import {
  getCustomOrderConfig,
  adminGetCustomOrderConfig,
  adminSaveCustomOrderConfigDraft,
  adminUpdateCustomOrderConfig,
} from '../../controllers/commerce/customOrderConfigController';
import { requireAuth, requireRole } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validateMiddleware';
import { customOrderSubmissionLimiter, chatMessageLimiter } from '../../middleware/rateLimiter';
import {
  submitCustomOrderValidator,
  submitProductCustomizationValidator,
  saveDraftValidator,
  customOrderIdParam,
  adminUpdateCustomOrderStatusValidator,
  adminUpdatePriorityValidator,
  adminCustomOrderNotesValidator,
  adminInternalNoteValidator,
  adminAssignStaffValidator,
  adminCustomOrderQuotationValidator,
  customerQuotationRespondValidator,
  customOrderMessageValidator,
  adminArchiveOrderValidator,
  adminCustomOrderConfigValidator,
} from '../../validators/customOrderValidator';

const router = Router();

router.get('/config', getCustomOrderConfig);

router.get(
  '/config/admin',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'order_manager', 'manager']),
  adminGetCustomOrderConfig,
);

router.post(
  '/config/draft',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'order_manager', 'manager']),
  ...adminCustomOrderConfigValidator,
  validate,
  adminSaveCustomOrderConfigDraft,
);

router.post(
  '/config/publish',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'order_manager', 'manager']),
  ...adminCustomOrderConfigValidator,
  validate,
  adminUpdateCustomOrderConfig,
);

// Customer Specific routes
router.post(
  '/',
  requireAuth,
  customOrderSubmissionLimiter,
  submitCustomOrderValidator,
  validate,
  submitCustomOrder,
);

// Product Customization — New product-linked flow
router.post(
  '/product-customize',
  requireAuth,
  customOrderSubmissionLimiter,
  ...submitProductCustomizationValidator,
  validate,
  submitProductCustomization,
);

// Draft Management
router.post('/draft', requireAuth, ...saveDraftValidator, validate, saveDraft);
router.get('/drafts', requireAuth, getMyDrafts);
router.delete('/draft/:id', requireAuth, ...customOrderIdParam, validate, deleteDraft);

// Customer Orders
router.get('/my-orders', requireAuth, getMyCustomOrders);
router.get('/:id', requireAuth, ...customOrderIdParam, validate, getSingleCustomOrder);
router.post(
  '/:id/messages',
  requireAuth,
  chatMessageLimiter,
  ...customOrderMessageValidator,
  validate,
  postMessage,
);
router.post(
  '/:id/quotation/respond',
  requireAuth,
  ...customerQuotationRespondValidator,
  validate,
  customerRespondQuotation,
);

// Order History (Customer or Admin)
router.get('/:id/history', requireAuth, ...customOrderIdParam, validate, getOrderHistory);

// Administrative routes
router.get(
  '/',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'order_manager', 'manager']),
  adminGetCustomOrders,
);
router.patch(
  '/:id/status',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'order_manager', 'manager']),
  ...adminUpdateCustomOrderStatusValidator,
  validate,
  adminUpdateStatus,
);
router.patch(
  '/:id/priority',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'order_manager', 'manager']),
  ...adminUpdatePriorityValidator,
  validate,
  adminUpdatePriority,
);
router.patch(
  '/:id/notes',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'order_manager', 'manager']),
  ...adminCustomOrderNotesValidator,
  validate,
  adminUpdateNotes,
);
router.post(
  '/:id/internal-notes',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'order_manager', 'manager']),
  ...adminInternalNoteValidator,
  validate,
  adminAddInternalNote,
);
router.patch(
  '/:id/assign',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'order_manager', 'manager']),
  ...adminAssignStaffValidator,
  validate,
  adminAssignStaff,
);
router.patch(
  '/:id/quotation',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'order_manager', 'manager']),
  ...adminCustomOrderQuotationValidator,
  validate,
  adminUpdateQuotation,
);
router.patch(
  '/:id/archive',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'order_manager', 'manager']),
  ...adminArchiveOrderValidator,
  validate,
  adminArchiveOrder,
);

export default router;
