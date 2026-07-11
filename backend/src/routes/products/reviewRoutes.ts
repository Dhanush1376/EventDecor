import { Router } from 'express';
import {
  getProductReviews,
  createReview,
  getAllReviews,
  deleteReview,
  getPublicReviews,
  incrementHelpful,
  canReview,
  getShowcaseReviews,
  canReviewShowcase,
  getReviewStats,
  getMyReview,
  updateOwnReview,
} from '../../controllers/products/reviewController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import { createReviewSchema, updateReviewSchema } from '../../validators/reviewValidator';

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
router.get('/my/:productId', requireAuth, getMyReview);
router.put('/:id', requireAuth, validateRequest(updateReviewSchema), updateOwnReview);

// Admin Routes
router.get('/stats', requireAuth, requireAdmin, getReviewStats);
router.get('/', requireAuth, requireAdmin, getAllReviews);
router.delete('/:id', requireAuth, requireAdmin, deleteReview);

export default router;
