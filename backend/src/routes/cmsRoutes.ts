import { Router } from 'express';
import { getPublishedContent, getSectionByKey, updateSection, publishAll } from '../controllers/contentController';
import { aiGenerateContent } from '../controllers/cmsController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { cacheResponse } from '../middleware/cacheMiddleware';

const router = Router();

// Public Routes
router.get('/', cacheResponse(300), getPublishedContent);
router.get('/:key', cacheResponse(300), getSectionByKey);

// Admin Routes
router.put('/:key', requireAuth, requireAdmin, updateSection);
router.post('/publish-all', requireAuth, requireAdmin, publishAll);
router.post('/ai-generate', requireAuth, requireAdmin, aiGenerateContent);

export default router;
