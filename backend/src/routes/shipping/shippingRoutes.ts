import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/authMiddleware';
import * as shippingController from '../../controllers/shipping/shippingController';

const router = Router();

router.use(requireAuth);

// Delivery Estimation (Accessible by any authenticated user for checkout)
router.post('/estimate', shippingController.estimateDelivery);

// Only shipping staff and admins can access shipping management routes
router.use(requireRole(['admin', 'super_admin', 'shipping_manager']));

// Dispatch Packages
router.post('/dispatch', shippingController.dispatchPackages);

// Sync Tracking
router.post('/sync/:shipmentId', shippingController.syncTracking);

export default router;
