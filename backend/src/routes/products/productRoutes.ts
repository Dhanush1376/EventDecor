import { Router } from 'express';
import {
  getProducts,
  getDynamicFilters,
  getAdminProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFeatured,
  getCategories,
  aiAutofillProduct,
  refineAiProduct,
} from '../../controllers/products/productController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import { createProductSchema, updateProductSchema } from '../../validators/productValidator';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import { cacheResponse } from '../../middleware/cacheMiddleware';
import { dynamicResponseCache } from '../../middleware/dynamicCacheMiddleware';

const router = Router();

// Protected Admin Routes
router.get('/admin/all', requireAuth, requireAdmin, getAdminProducts);

if (process.env.DISABLE_CACHE === 'true') {
  router.get('/', getProducts);
  router.get('/filters', getDynamicFilters);
  router.get('/categories', getCategories);
  router.get('/:id', getProductById);
} else {
  router.get('/', dynamicResponseCache(120, 'public'), cacheResponse(120), getProducts);
  router.get('/filters', dynamicResponseCache(60, 'public'), cacheResponse(60), getDynamicFilters);
  router.get('/categories', dynamicResponseCache(300, 'public'), cacheResponse(300), getCategories);
  router.get('/:id', dynamicResponseCache(120, 'public'), cacheResponse(120), getProductById);
}

router.post('/', requireAuth, requireAdmin, validateRequest(createProductSchema), createProduct);
router.put('/:id', requireAuth, requireAdmin, validateRequest(updateProductSchema), updateProduct);
router.delete('/:id', requireAuth, requireAdmin, deleteProduct);
router.patch('/:id/toggle-featured', requireAuth, requireAdmin, toggleFeatured);
router.post('/ai-autofill', requireAuth, requireAdmin, aiAutofillProduct);
router.post('/ai-refine', requireAuth, requireAdmin, refineAiProduct);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */

export default router;
