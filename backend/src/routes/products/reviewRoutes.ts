import { Router } from 'express';
import {
  getProductReviews,
  createReview,
  getAllReviews,
  updateReviewStatus,
  deleteReview,
  getPublicReviews,
  incrementHelpful,
  canReview,
  getShowcaseReviews,
  canReviewShowcase,
} from '../../controllers/products/reviewController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import { createReviewSchema } from '../../validators/reviewValidator';

const router = Router();

// Public Routes
router.get('/public', getPublicReviews);
router.get('/product/:productId', getProductReviews);
router.get('/showcase/:showcaseId', getShowcaseReviews);
router.post('/:id/helpful', requireAuth, incrementHelpful);

// Authenticated User Routes
router.post('/', requireAuth, validateRequest(createReviewSchema), createReview);
router.get('/can-review/:productId', requireAuth, canReview);
router.get('/can-review-showcase/:showcaseId', requireAuth, canReviewShowcase);

// Admin Routes
router.get('/', requireAuth, requireAdmin, getAllReviews);
router.patch('/:id/status', requireAuth, requireAdmin, updateReviewStatus);
router.delete('/:id', requireAuth, requireAdmin, deleteReview);

export default router;
