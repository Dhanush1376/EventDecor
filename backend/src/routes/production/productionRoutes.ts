import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/authMiddleware';
import * as productionController from '../../controllers/production/productionController';

const router = Router();

// Only production staff and admins can access production routes
router.use(requireAuth);
router.use(requireRole(['admin', 'super_admin', 'production_manager', 'worker']));

// Create Production Order
router.post(
  '/orders',
  requireRole(['admin', 'super_admin', 'production_manager']),
  productionController.createProductionOrder,
);

// Get Active Production Orders
router.get('/orders/active', productionController.getActiveOrders);

// Transition Production Item Stage
router.post('/transitions', productionController.transitionItemStage);

export default router;
