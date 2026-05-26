import { Router } from 'express';
import { trackEvent, trackBatchEvents, initSession } from '../controllers/trackingController';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for tracking endpoints: 30 events/minute per IP
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many tracking events. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
});

router.post('/event', trackingLimiter, trackEvent);
router.post('/batch', trackingLimiter, trackBatchEvents);
router.post('/session', initSession);

export default router;
