import { Router, Request, Response, NextFunction } from 'express';
import {
  getPublishedContent,
  getSectionByKey,
  updateSection,
  publishAll,
} from '../../controllers/cms/contentController';
import { aiGenerateContent } from '../../controllers/cms/cmsController';
import { requireAuth, requireRole } from '../../middleware/authMiddleware';
import { cacheResponse } from '../../middleware/cacheMiddleware';
import { dynamicResponseCache } from '../../middleware/dynamicCacheMiddleware';
import ContentService from '../../services/contentService';

const router = Router();

const requireAdminForSensitiveSections = (req: Request, res: Response, next: NextFunction) => {
  if (ContentService.isAdminOnlySection(req.params.key as string)) {
    return requireAuth(req, res, () =>
      requireRole(['super_admin', 'main_admin', 'admin', 'content_manager'])(req, res, () => {
        const { applyNoCacheHeaders } = require('../../middleware/noCacheMiddleware');
        applyNoCacheHeaders(res);
        next();
      }),
    );
  }
  next();
};

// Public Routes — memory + Redis + CDN cache for fast cold starts
router.get('/', dynamicResponseCache(300, 'public'), cacheResponse(300), getPublishedContent);
router.get(
  '/:key',
  requireAdminForSensitiveSections,
  dynamicResponseCache(300, 'public'),
  cacheResponse(300),
  getSectionByKey,
);

// Admin Routes
router.put(
  '/:key',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'content_manager']),
  updateSection,
);
router.post(
  '/publish-all',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'content_manager']),
  publishAll,
);
router.post(
  '/ai-generate',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'content_manager']),
  aiGenerateContent,
);

import {
  analyzeShowcaseImage,
  refineShowcaseImage,
} from '../../controllers/discovery/aiVisionController';
router.post('/ai-vision-showcase', analyzeShowcaseImage);
router.post(
  '/ai-vision-refine-showcase',
  requireAuth,
  requireRole(['super_admin', 'main_admin', 'admin', 'content_manager']),
  refineShowcaseImage,
);

export default router;
