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
} from '../controllers/reviewController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Public Routes
router.get('/public', getPublicReviews);
router.get('/product/:productId', getProductReviews);
router.post('/:id/helpful', incrementHelpful);

// Authenticated User Routes
router.post('/', requireAuth, createReview);
router.get('/can-review/:productId', requireAuth, canReview);

// Admin Routes
router.get('/', requireAuth, requireAdmin, getAllReviews);
router.patch('/:id/status', requireAuth, requireAdmin, updateReviewStatus);
router.delete('/:id', requireAuth, requireAdmin, deleteReview);

export default router;
