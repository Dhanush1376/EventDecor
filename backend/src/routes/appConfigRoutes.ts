import express from 'express';
import {
  getPublicConfig,
  getAllConfig,
  createOrUpdateConfig,
  deleteConfig,
} from '../controllers/appConfigController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/public', getPublicConfig);

// Admin routes
router.use(requireAuth);
router.use(requireRole(['super_admin', 'main_admin']));

router.get('/', getAllConfig);
router.post('/', createOrUpdateConfig);
router.delete('/:id', deleteConfig);

export default router;
