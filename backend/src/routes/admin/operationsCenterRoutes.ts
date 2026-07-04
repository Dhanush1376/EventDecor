import { Router } from 'express';
import { getOperationsDashboard } from '../../controllers/admin/operationsCenterController';
import { requireAuth as protect, authorize as restrictTo } from '../../middleware/authMiddleware';
import { STAFF_ROLES } from '../../config/adminConfig';

const router = Router();

router.use(protect);
router.use(restrictTo(...STAFF_ROLES));

router.get('/dashboard', getOperationsDashboard);

export default router;
