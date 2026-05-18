import { Router } from 'express';
import {
  getGalleryItems,
  getGalleryById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  likeGalleryItem,
  getGalleryCategories,
} from '../controllers/galleryController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Public Routes
router.get('/', getGalleryItems);
router.get('/categories', getGalleryCategories);
router.get('/:id', getGalleryById);

// Authenticated User Routes
router.post('/:id/like', requireAuth, likeGalleryItem);

// Admin Routes
router.post('/', requireAuth, requireAdmin, createGalleryItem);
router.put('/:id', requireAuth, requireAdmin, updateGalleryItem);
router.delete('/:id', requireAuth, requireAdmin, deleteGalleryItem);

export default router;
