import express from 'express';
import {
  getActiveCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

import { dynamicResponseCache } from '../middleware/dynamicCacheMiddleware';
import { cacheResponse } from '../middleware/cacheMiddleware';

const router = express.Router();

// Public routes
router.get('/active', dynamicResponseCache(600, 'public'), cacheResponse(600), getActiveCategories);

// Admin routes
router.use(requireAuth);
router.use(requireAdmin);

router.get('/', getAllCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
