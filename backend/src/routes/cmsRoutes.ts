import { Router, Request, Response, NextFunction } from 'express';
import { getPublishedContent, getSectionByKey, updateSection, publishAll } from '../controllers/contentController';
import { aiGenerateContent } from '../controllers/cmsController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { cacheResponse } from '../middleware/cacheMiddleware';
import ContentService from '../services/contentService';

const router = Router();

const requireAdminForSensitiveSections = (req: Request, res: Response, next: NextFunction) => {
  if (ContentService.isAdminOnlySection(req.params.key as string)) {
    return requireAuth(req, res, () => requireAdmin(req, res, next));
  }
  next();
};

// Public Routes
router.get('/', cacheResponse(300), getPublishedContent);
router.get('/:key', requireAdminForSensitiveSections, cacheResponse(300), getSectionByKey);

// Admin Routes
router.put('/:key', requireAuth, requireAdmin, updateSection);
router.post('/publish-all', requireAuth, requireAdmin, publishAll);
router.post('/ai-generate', requireAuth, requireAdmin, aiGenerateContent);

export default router;
