import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/authMiddleware';
import * as warehouseController from '../../controllers/warehouse/warehouseController';

const router = Router();

// Only warehouse staff and admins can access warehouse routes
router.use(requireAuth);
router.use(requireRole(['admin', 'super_admin', 'warehouse_manager', 'picker', 'packer']));

// Scanner API
router.post('/scan', warehouseController.processScan);
router.get('/scans/recent', warehouseController.getRecentScans);

// PickLists
router.get('/picklists/active', warehouseController.getActivePickLists);
router.post(
  '/picklists/assign',
  requireRole(['admin', 'super_admin', 'warehouse_manager']),
  warehouseController.assignPickList,
);

// Packages
router.post('/packages', warehouseController.packageOrder);
router.get('/packages/active', warehouseController.getActivePackages);

// Dispatch
router.get('/dispatch/tasks', warehouseController.getDispatchTasks);

// Inventory
router.get('/inventory/count', warehouseController.getProductsForCount);

export default router;
