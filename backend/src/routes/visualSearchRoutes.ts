import { Router } from 'express';
import multer from 'multer';
import {
  analyzeImage,
  getPublicConfig,
  getAdminConfig,
  updateAdminConfig,
  validateProvider,
  getAnalytics,
  generateProductTags,
  getHealth,
} from '../controllers/visualSearchController';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/authMiddleware';
import { visualSearchLimiter } from '../middleware/rateLimiter';

const router = Router();

// Multer setup for image upload (memory storage, max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (allowed.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

// ── Public Endpoints ──
router.get('/config', getPublicConfig);
router.get('/health', getHealth);
router.post('/analyze', visualSearchLimiter, optionalAuth, upload.single('image'), analyzeImage);

// ── Admin Endpoints ──
router.get('/admin/config', requireAuth, requireAdmin, getAdminConfig);
router.put('/admin/config', requireAuth, requireAdmin, updateAdminConfig);
router.post('/admin/validate-provider', requireAuth, requireAdmin, validateProvider);
router.get('/admin/analytics', requireAuth, requireAdmin, getAnalytics);
router.post('/admin/generate-tags', requireAuth, requireAdmin, generateProductTags);

export default router;
