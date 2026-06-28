import { Router } from 'express';
import {
  trackEvent,
  trackBatchEvents,
  initSession,
} from '../../controllers/system/trackingController';
import { recommendationLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.post('/event', recommendationLimiter, trackEvent);
router.post('/batch', recommendationLimiter, trackBatchEvents);
router.post('/session', initSession);

export default router;
