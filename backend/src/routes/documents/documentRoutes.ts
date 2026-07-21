import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/authMiddleware';
import * as documentController from '../../controllers/documents/documentController';

const router = Router();

router.use(requireAuth);

// Customers can download their own invoices, but we need order ownership check in controller
// For now, allow auth users to access invoices
router.get('/invoice/:orderId', documentController.generateInvoice);

// Only warehouse/shipping staff can generate labels and packing slips
router.get(
  '/packing-slip/:packageId',
  requireRole(['admin', 'super_admin', 'warehouse_manager', 'packer', 'picker']),
  documentController.generatePackingSlip,
);

router.get(
  '/label/:shipmentId',
  requireRole(['admin', 'super_admin', 'warehouse_manager', 'shipping_manager']),
  documentController.generateShippingLabel,
);

export default router;
