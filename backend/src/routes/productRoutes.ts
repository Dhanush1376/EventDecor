import { Router } from 'express';
import {
  getProducts,
  getAdminProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFeatured,
  getCategories,
  aiAutofillProduct,
  refineAiProduct,
} from '../controllers/productController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { createProductSchema, updateProductSchema } from '../validators/productValidator';
import { validate } from '../middleware/validate';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { dynamicResponseCache } from '../middleware/dynamicCacheMiddleware';

const router = Router();

router.get('/', dynamicResponseCache(120, 'public'), cacheResponse(120), getProducts);
router.get('/categories', dynamicResponseCache(300, 'public'), cacheResponse(300), getCategories);

// Protected Admin Routes
router.get('/admin/all', requireAuth, requireAdmin, getAdminProducts);

router.get('/:id', dynamicResponseCache(120, 'public'), cacheResponse(120), getProductById);

router.post('/', requireAuth, requireAdmin, validate(createProductSchema), createProduct);
router.put('/:id', requireAuth, requireAdmin, validate(updateProductSchema), updateProduct);
router.delete('/:id', requireAuth, requireAdmin, deleteProduct);
router.patch('/:id/toggle-featured', requireAuth, requireAdmin, toggleFeatured);
router.post('/ai-autofill', requireAuth, requireAdmin, aiAutofillProduct);
router.post('/ai-refine', requireAuth, requireAdmin, refineAiProduct);

export default router;
