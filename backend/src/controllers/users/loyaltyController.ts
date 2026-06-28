import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import Review from '../../models/Review';
import { LoyaltyService } from '../../services/loyaltyService';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';
import { updateProductRating } from '../products/reviewController';
import storeSettingsService from '../../services/StoreSettingsService';

export const getLoyaltyTiers = asyncHandler(async (req: Request, res: Response) => {
  const settings = await storeSettingsService.getSettings();
  res.status(200).json(new ApiResponse(true, 'Loyalty tiers fetched', settings.loyalty.tiers));
});

export const getLoyaltyDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const dashboardData = await LoyaltyService.getDashboardData(userId);
  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Loyalty wallet and rewards dashboard loaded successfully',
        dashboardData,
      ),
    );
});

export const applyReferralCode = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { referralCode } = req.body;

  if (!referralCode) {
    throw new ApiError(400, 'Referral code is required');
  }

  const result = await LoyaltyService.applyReferralCode(userId, referralCode);

  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        `Referral code successfully registered! Welcomed with ₹50 wallet cash. Referrer will receive ₹150 upon your first purchase.`,
        result,
      ),
    );
});

// Admin Review Moderation with Payout Rewards
export const getAdminReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const status = req.query.status as string | undefined;
  const filter: Record<string, string> = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    filter.status = status;
  }

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter)
      .populate('product', 'title imageSrc')
      .populate('customer', 'name email walletBalance')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Fetched reviews list for moderation',
        formatPaginationResponse(reviews, totalCount, page, limit),
      ),
    );
});

export const moderateReview = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId, action } = req.body; // action: 'approve' | 'reject'

  if (!reviewId || !['approve', 'reject'].includes(action)) {
    throw new ApiError(400, 'Review ID and valid action are required');
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  if (review.status !== 'pending') {
    throw new ApiError(400, `Review has already been moderated with status: ${review.status}`);
  }

  if (action === 'approve') {
    review.status = 'approved';
    await review.save();

    // Recalculate product rating atomically using MongoDB aggregation pipeline directly in database
    if (review.product) {
      await updateProductRating(review.product);
    }

    // Reward Reviewer instantly based on review quality (Text: ₹10, Photo: ₹25, Video: ₹50)
    const hasPhoto = review.images && review.images.length > 0;
    const hasVideo = false; // Video features simulated

    await LoyaltyService.processReviewRewards(
      review.customer.toString(),
      review.rating,
      hasPhoto,
      hasVideo,
      review._id.toString(),
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          true,
          'Review successfully approved and rewards dispatched to reviewer wallet!',
          review,
        ),
      );
  } else {
    review.status = 'rejected';
    await review.save();

    // Recalculate product rating atomically using MongoDB aggregation pipeline directly in database
    if (review.product) {
      await updateProductRating(review.product);
    }

    res
      .status(200)
      .json(new ApiResponse(true, 'Review has been rejected. No rewards were credited.', review));
  }
});
