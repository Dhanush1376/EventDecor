import express from 'express';
import {
  getLayoutByPath,
  getAllLayouts,
  createOrUpdateLayout,
} from '../../controllers/cms/pageLayoutController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/path', getLayoutByPath);

// Admin routes
router.use(requireAuth);
router.use(requireAdmin);

router.get('/', getAllLayouts);
router.post('/', createOrUpdateLayout);

export default router;
