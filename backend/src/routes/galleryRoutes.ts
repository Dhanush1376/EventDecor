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
import { cacheResponse } from '../middleware/cacheMiddleware';

const router = Router();

// Public Routes
router.get('/', cacheResponse(60), getGalleryItems);
router.get('/categories', cacheResponse(60), getGalleryCategories);
router.get('/:id', cacheResponse(60), getGalleryById);

// Authenticated User Routes
router.post('/:id/like', requireAuth, likeGalleryItem);

// Admin Routes
router.post('/', requireAuth, requireAdmin, createGalleryItem);
router.put('/:id', requireAuth, requireAdmin, updateGalleryItem);
router.delete('/:id', requireAuth, requireAdmin, deleteGalleryItem);

export default router;
