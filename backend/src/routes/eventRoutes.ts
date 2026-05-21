import { Router } from 'express';
import { getEvents, getEventById, createEvent, updateEvent } from '../controllers/eventController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { redisResponseCache } from '../middleware/redisResponseCache';

const router = Router();

router.get('/', redisResponseCache(120), cacheResponse(120), getEvents);
router.get('/:id', redisResponseCache(120), cacheResponse(120), getEventById);

// Admin Routes
router.post('/', requireAuth, requireAdmin, createEvent);
router.put('/:id', requireAuth, requireAdmin, updateEvent);

export default router;
