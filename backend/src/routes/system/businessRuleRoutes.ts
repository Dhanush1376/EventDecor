import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/authMiddleware';
import * as businessRuleController from '../../controllers/system/businessRuleController';

const router = Router();

// Only admin/super_admin can manage business rules
router.use(requireAuth);
router.use(requireRole(['admin', 'super_admin']));

router.get('/', businessRuleController.getRules);
router.post('/', businessRuleController.createRule);
router.patch('/:id/toggle', businessRuleController.toggleRuleStatus);

export default router;
