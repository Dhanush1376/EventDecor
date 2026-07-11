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
  const { limit, skip } = getPaginationOptions(req.query);
  const dashboardData = await LoyaltyService.getDashboardData(userId, skip, limit);
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

  const settings = await storeSettingsService.getSettings();
  const refereeBonus = settings.loyalty.referralBonusReferee;
  const referrerBonus = settings.loyalty.referralBonusReferrer;

  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        `Referral code successfully registered! Welcomed with ₹${refereeBonus} wallet cash. Referrer will receive ₹${referrerBonus} upon your first purchase.`,
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

    const { RuleEngine } = require('../../services/RuleEngine');
    const userForRule = await require('../../models/User').default.findById(review.customer).lean();

    try {
      await RuleEngine.evaluateTrigger('on_review', { user: userForRule, review });
    } catch (ruleErr) {
      require('../../config/logger').default.error('Failed to evaluate review rules:', ruleErr);
    }

    const message = 'Review successfully approved! Dynamic rules evaluated.';

    res.status(200).json(
      new ApiResponse(true, message, {
        review,
      }),
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
      .json(
        new ApiResponse(true, 'Review has been rejected. No rewards were credited.', { review }),
      );
  }
});

export const adjustWalletBalance = asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user.id;
  const { userId, type, amount, description } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || '';

  if (!userId || !type || !amount || !description) {
    throw new ApiError(400, 'userId, type (credit/debit), amount, and description are required');
  }

  const transaction = await LoyaltyService.adjustWalletBalance(
    adminId,
    userId,
    type,
    Number(amount),
    description,
    ipAddress,
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        `Successfully ${type === 'credit' ? 'credited' : 'debited'} wallet`,
        transaction,
      ),
    );
});
