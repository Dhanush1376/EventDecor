import { Router } from 'express';
import { optionalAuth, requireAuth, requireRole } from '../../middleware/authMiddleware';
import * as documentController from '../../controllers/documents/documentController';

const router = Router();

// Invoices can be downloaded directly by customers via email links or authenticated in dashboard
router.get('/invoice/:orderId', optionalAuth, documentController.generateInvoice);

// Only warehouse/shipping staff can generate labels and packing slips
router.get(
  '/packing-slip/:packageId',
  requireAuth,
  requireRole(['admin', 'super_admin', 'warehouse_manager', 'packer', 'picker']),
  documentController.generatePackingSlip,
);

router.get(
  '/label/:shipmentId',
  requireAuth,
  requireRole(['admin', 'super_admin', 'warehouse_manager', 'shipping_manager']),
  documentController.generateShippingLabel,
);

export default router;
