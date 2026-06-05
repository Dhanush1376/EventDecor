import { Router } from 'express';
import { getEvents, getEventById, createEvent, updateEvent } from '../controllers/eventController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { cacheResponse } from '../middleware/cacheMiddleware';
import { dynamicResponseCache } from '../middleware/dynamicCacheMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { createEventValidator, updateEventValidator } from '../validators/eventValidator';

const router = Router();

router.get('/', dynamicResponseCache(120, 'public'), cacheResponse(120), getEvents);
router.get('/:id', dynamicResponseCache(120, 'public'), cacheResponse(120), getEventById);

// Admin Routes
router.post('/', requireAuth, requireAdmin, createEventValidator, validate, createEvent);
router.put('/:id', requireAuth, requireAdmin, updateEventValidator, validate, updateEvent);

export default router;
