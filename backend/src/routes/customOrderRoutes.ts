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
import { submitCustomOrderValidator } from '../validators/customOrderValidator';

const router = Router();

// Configuration Options for Multi-step storefront
router.get('/config', getCustomOrderConfig);
router.put('/config', requireAuth, requireAdmin, adminUpdateCustomOrderConfig);

// Customer Specific routes
router.post('/', requireAuth, submitCustomOrderValidator, validate, submitCustomOrder);
router.get('/my-orders', requireAuth, getMyCustomOrders);
router.get('/:id', requireAuth, getSingleCustomOrder);
router.post('/:id/messages', requireAuth, postMessage);
router.post('/:id/quotation/respond', requireAuth, customerRespondQuotation);

// Administrative routes
router.get('/', requireAuth, requireAdmin, adminGetCustomOrders);
router.patch('/:id/status', requireAuth, requireAdmin, adminUpdateStatus);
router.patch('/:id/priority', requireAuth, requireAdmin, adminUpdatePriority);
router.patch('/:id/notes', requireAuth, requireAdmin, adminUpdateNotes);
router.patch('/:id/quotation', requireAuth, requireAdmin, adminUpdateQuotation);
router.patch('/:id/archive', requireAuth, requireAdmin, adminArchiveOrder);

export default router;
