import { Router } from 'express';
import {
  getGalleryItems,
  getGalleryById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  likeGalleryItem,
  getGalleryCategories,
  getDynamicGalleryFilters,
} from '../controllers/galleryController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { dynamicResponseCache } from '../middleware/dynamicCacheMiddleware';
import { validate } from '../middleware/validateMiddleware';
import {
  createGalleryValidator,
  updateGalleryValidator,
  galleryIdParam,
} from '../validators/galleryValidator';

const router = Router();

// Public Routes (list endpoints only — :id increments view counts)
router.get('/', dynamicResponseCache(300, 'public'), cacheResponse(300), getGalleryItems);
router.get(
  '/filters',
  dynamicResponseCache(60, 'public'),
  cacheResponse(60),
  getDynamicGalleryFilters,
);
router.get(
  '/categories',
  dynamicResponseCache(600, 'public'),
  cacheResponse(600),
  getGalleryCategories,
);
router.get('/:id', cacheResponse(60), getGalleryById);

// Authenticated User Routes
router.post('/:id/like', requireAuth, likeGalleryItem);

// Admin Routes
router.post('/', requireAuth, requireAdmin, createGalleryValidator, validate, createGalleryItem);
router.put('/:id', requireAuth, requireAdmin, updateGalleryValidator, validate, updateGalleryItem);
router.delete('/:id', requireAuth, requireAdmin, ...galleryIdParam, validate, deleteGalleryItem);

export default router;
