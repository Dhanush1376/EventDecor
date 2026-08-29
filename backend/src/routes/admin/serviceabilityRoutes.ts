import express from 'express';
import {
  getServiceabilityAdmin,
  updateServiceabilityAdmin,
} from '../../controllers/admin/serviceabilityController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', getServiceabilityAdmin);
router.patch('/:locationCode', updateServiceabilityAdmin);

export default router;
