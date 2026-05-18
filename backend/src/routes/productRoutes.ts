import { Router } from 'express';
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  toggleFeatured,
  getCategories,
  aiAutofillProduct
} from '../controllers/productController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { productValidator } from '../validators/productValidator';
import { validate } from '../middleware/validateMiddleware';

const router = Router();

router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductById);

// Protected Admin Routes
router.post('/', requireAuth, requireAdmin, productValidator, validate, createProduct);
router.put('/:id', requireAuth, requireAdmin, productValidator, validate, updateProduct);
router.delete('/:id', requireAuth, requireAdmin, deleteProduct);
router.patch('/:id/toggle-featured', requireAuth, requireAdmin, toggleFeatured);
router.post('/ai-autofill', requireAuth, requireAdmin, aiAutofillProduct);

export default router;
