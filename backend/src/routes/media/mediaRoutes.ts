import { Router } from 'express';
import { optimizeImageController } from '../../controllers/media/mediaController';
import * as mediaLibraryController from '../../controllers/media/mediaLibraryController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import multer from 'multer';

// Simple memory storage for the unified upload route
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

/**
 * GET /api/v1/media/optimize
 * Public endpoint to optimize, resize, compress, and transcode local public assets.
 */
router.get('/optimize', optimizeImageController);

// Media Library Routes
router.post(
  '/upload',
  requireAuth,
  requireAdmin,
  upload.single('images'),
  mediaLibraryController.uploadMedia,
);
router.get('/library', requireAuth, requireAdmin, mediaLibraryController.getMediaLibrary);
router.get('/stats', requireAuth, requireAdmin, mediaLibraryController.getMediaStats);
router.get('/health', requireAuth, requireAdmin, mediaLibraryController.getMediaHealth);
router.delete('/library/:id', requireAuth, requireAdmin, mediaLibraryController.deleteMedia);
router.post('/library/:id/restore', requireAuth, requireAdmin, mediaLibraryController.restoreMedia);
router.put(
  '/library/:id/replace',
  requireAuth,
  requireAdmin,
  upload.single('file'),
  mediaLibraryController.replaceMedia,
);

export default router;
