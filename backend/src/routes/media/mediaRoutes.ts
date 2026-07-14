import { Router } from 'express';
import * as mediaLibraryController from '../../controllers/media/mediaLibraryController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import multer from 'multer';

// Simple memory storage for the unified upload route
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// NOTE: The public GET /optimize proxy was removed. It fetched arbitrary remote
// URLs and served the transcoded bytes from backend egress (SSRF + unbounded
// bandwidth). Image optimization is handled entirely by Cloudinary transforms on
// the frontend (see frontend/src/utils/media/imageUtils.js).

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
