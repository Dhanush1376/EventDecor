import { Router } from 'express';
import { getEvents, getEventById, createEvent, updateEvent } from '../controllers/eventController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getEvents);
router.get('/:id', getEventById);

// Admin Routes
router.post('/', requireAuth, requireAdmin, createEvent);
router.put('/:id', requireAuth, requireAdmin, updateEvent);

export default router;
