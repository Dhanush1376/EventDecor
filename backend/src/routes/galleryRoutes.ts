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
import { redisResponseCache } from '../middleware/redisResponseCache';
import { validate } from '../middleware/validateMiddleware';
import {
  createGalleryValidator,
  updateGalleryValidator,
  galleryIdParam,
} from '../validators/galleryValidator';

const router = Router();

// Public Routes (list endpoints only — :id increments view counts)
router.get('/', redisResponseCache(120), cacheResponse(120), getGalleryItems);
router.get('/categories', redisResponseCache(300), cacheResponse(300), getGalleryCategories);
router.get('/:id', cacheResponse(60), getGalleryById);

// Authenticated User Routes
router.post('/:id/like', requireAuth, likeGalleryItem);

// Admin Routes
router.post('/', requireAuth, requireAdmin, createGalleryValidator, validate, createGalleryItem);
router.put('/:id', requireAuth, requireAdmin, updateGalleryValidator, validate, updateGalleryItem);
router.delete('/:id', requireAuth, requireAdmin, ...galleryIdParam, validate, deleteGalleryItem);

export default router;
