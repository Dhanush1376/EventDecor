import { Router } from 'express';
import {
  submitCustomOrder,
  getMyCustomOrders,
  getSingleCustomOrder,
  adminGetCustomOrders,
  adminUpdateStatus,
  adminUpdatePriority,
  adminUpdateNotes,
  adminUpdateQuotation,
  customerRespondQuotation,
  postMessage,
  adminArchiveOrder,
  getCustomOrderConfig,
  adminUpdateCustomOrderConfig
} from '../controllers/customOrderController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { validate } from '../middleware/validateMiddleware';
import {
  submitCustomOrderValidator,
  customOrderIdParam,
  adminUpdateCustomOrderStatusValidator,
  adminUpdatePriorityValidator,
  adminCustomOrderNotesValidator,
  adminCustomOrderQuotationValidator,
  customerQuotationRespondValidator,
  customOrderMessageValidator,
  adminArchiveOrderValidator,
  adminCustomOrderConfigValidator,
} from '../validators/customOrderValidator';

const router = Router();

// Configuration Options for Multi-step storefront
router.get('/config', getCustomOrderConfig);
router.put('/config', requireAuth, requireAdmin, ...adminCustomOrderConfigValidator, validate, adminUpdateCustomOrderConfig);

// Customer Specific routes
router.post('/', requireAuth, submitCustomOrderValidator, validate, submitCustomOrder);
router.get('/my-orders', requireAuth, getMyCustomOrders);
router.get('/:id', requireAuth, ...customOrderIdParam, validate, getSingleCustomOrder);
router.post('/:id/messages', requireAuth, ...customOrderMessageValidator, validate, postMessage);
router.post('/:id/quotation/respond', requireAuth, ...customerQuotationRespondValidator, validate, customerRespondQuotation);

// Administrative routes
router.get('/', requireAuth, requireAdmin, adminGetCustomOrders);
router.patch('/:id/status', requireAuth, requireAdmin, ...adminUpdateCustomOrderStatusValidator, validate, adminUpdateStatus);
router.patch('/:id/priority', requireAuth, requireAdmin, ...adminUpdatePriorityValidator, validate, adminUpdatePriority);
router.patch('/:id/notes', requireAuth, requireAdmin, ...adminCustomOrderNotesValidator, validate, adminUpdateNotes);
router.patch('/:id/quotation', requireAuth, requireAdmin, ...adminCustomOrderQuotationValidator, validate, adminUpdateQuotation);
router.patch('/:id/archive', requireAuth, requireAdmin, ...adminArchiveOrderValidator, validate, adminArchiveOrder);

export default router;
