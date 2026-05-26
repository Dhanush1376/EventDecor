import express from 'express';
import { getActiveCategories, getAllCategories, createCategory, updateCategory } from '../controllers/categoryController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/active', getActiveCategories);

// Admin routes
router.use(requireAuth);
router.use(requireAdmin);

router.get('/', getAllCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);

export default router;
