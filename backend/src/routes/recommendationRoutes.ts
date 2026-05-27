import { Router } from 'express';
import {
  getFeed,
  getSimilar,
  getTrending,
  getSeasonal,
  getForYou,
  getCompleteSetup,
  getAlsoViewed,
} from '../controllers/recommendationController';
import { getHomepageSections } from '../controllers/personalizedSectionsController';
import { requireAuth } from '../middleware/authMiddleware';
import { recommendationLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply recommendation limiter globally to all routes in this file
router.use(recommendationLimiter);

// Public endpoints (work for both anonymous and authenticated users)
router.get('/feed', getFeed);
router.get('/similar/:targetType/:targetId', getSimilar);
router.get('/trending', getTrending);
router.get('/seasonal', getSeasonal);
router.get('/complete-setup/:targetId', getCompleteSetup);
router.get('/also-viewed/:targetId', getAlsoViewed);

// Authenticated-only endpoints
router.get('/for-you', requireAuth, getForYou);

router.get('/homepage-sections', getHomepageSections);

export default router;
