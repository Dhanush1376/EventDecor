import { Router } from 'express';
import {
  getFeed,
  getSimilar,
  getTrending,
  getSeasonal,
  getForYou,
  getCompleteSetup,
  getAlsoViewed,
} from '../../controllers/discovery/recommendationController';
import { getHomepageSections } from '../../controllers/cms/personalizedSectionsController';
import { requireAuth } from '../../middleware/authMiddleware';
import { recommendationLimiter } from '../../middleware/rateLimiter';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import {
  recommendationQuerySchema,
  recommendationParamsSchema,
} from '../../validators/recommendationValidator';
import { z } from 'zod';

const router = Router();

// Apply recommendation limiter globally to all routes in this file
router.use(recommendationLimiter);

// Public endpoints (work for both anonymous and authenticated users)
router.get('/feed', validateRequest(z.object({ query: recommendationQuerySchema })), getFeed);
router.get(
  '/similar/:targetType/:targetId',
  validateRequest(
    z.object({ params: recommendationParamsSchema, query: recommendationQuerySchema }),
  ),
  getSimilar,
);
router.get(
  '/trending',
  validateRequest(z.object({ query: recommendationQuerySchema })),
  getTrending,
);
router.get(
  '/seasonal',
  validateRequest(z.object({ query: recommendationQuerySchema })),
  getSeasonal,
);
router.get(
  '/complete-setup/:targetId',
  validateRequest(
    z.object({ params: recommendationParamsSchema, query: recommendationQuerySchema }),
  ),
  getCompleteSetup,
);
router.get(
  '/also-viewed/:targetId',
  validateRequest(
    z.object({ params: recommendationParamsSchema, query: recommendationQuerySchema }),
  ),
  getAlsoViewed,
);

// Authenticated-only endpoints
router.get(
  '/for-you',
  requireAuth,
  validateRequest(z.object({ query: recommendationQuerySchema })),
  getForYou,
);

router.get('/homepage-sections', getHomepageSections);

export default router;
