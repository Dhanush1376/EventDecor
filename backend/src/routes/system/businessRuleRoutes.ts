import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import * as businessRuleController from '../../controllers/system/businessRuleController';

const router = Router();

// Allow all authorized staff roles
router.use(requireAuth);
router.use(requireAdmin);

router.get('/', businessRuleController.getRules);
router.post('/', businessRuleController.createRule);
router.patch('/:id/toggle', businessRuleController.toggleRuleStatus);

export default router;
