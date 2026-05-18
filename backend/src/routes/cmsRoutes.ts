import { Router } from 'express';
import { getPublishedContent, getSectionByKey, updateSection, publishAll } from '../controllers/contentController';
import { aiGenerateContent } from '../controllers/cmsController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Public Routes
router.get('/', getPublishedContent);
router.get('/:key', getSectionByKey);

// Admin Routes
router.put('/:key', requireAuth, requireAdmin, updateSection);
router.post('/publish-all', requireAuth, requireAdmin, publishAll);
router.post('/ai-generate', requireAuth, requireAdmin, aiGenerateContent);

export default router;
