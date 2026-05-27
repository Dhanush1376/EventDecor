import { Router, Request, Response, NextFunction } from 'express';
import { getPublishedContent, getSectionByKey, updateSection, publishAll } from '../controllers/contentController';
import { aiGenerateContent } from '../controllers/cmsController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { redisResponseCache } from '../middleware/redisResponseCache';
import ContentService from '../services/contentService';

const router = Router();

const requireAdminForSensitiveSections = (req: Request, res: Response, next: NextFunction) => {
  if (ContentService.isAdminOnlySection(req.params.key as string)) {
    return requireAuth(req, res, () => requireAdmin(req, res, () => {
      const { applyNoCacheHeaders } = require('../middleware/noCacheMiddleware');
      applyNoCacheHeaders(res);
      next();
    }));
  }
  next();
};

// Public Routes — memory + Redis + CDN cache for fast cold starts
router.get('/', redisResponseCache(300), cacheResponse(300), getPublishedContent);
router.get('/:key', requireAdminForSensitiveSections, redisResponseCache(300), cacheResponse(300), getSectionByKey);

// Admin Routes
router.put('/:key', requireAuth, requireAdmin, updateSection);
router.post('/publish-all', requireAuth, requireAdmin, publishAll);
router.post('/ai-generate', requireAuth, requireAdmin, aiGenerateContent);

export default router;
