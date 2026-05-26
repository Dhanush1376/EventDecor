import express from 'express';
import { getPublicConfig, getAllConfig, createOrUpdateConfig } from '../controllers/appConfigController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/public', getPublicConfig);

// Admin routes
router.use(requireAuth);
router.use(requireAdmin);

router.get('/', getAllConfig);
router.post('/', createOrUpdateConfig);

export default router;
