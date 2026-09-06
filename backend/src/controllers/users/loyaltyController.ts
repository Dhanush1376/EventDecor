import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import mongoose from 'mongoose';
import Review from '../../models/Review';
import Order from '../../models/Order';
import User from '../../models/User';
import WalletTransaction from '../../models/WalletTransaction';
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

  if (reviews.length > 0) {
    const customerIds = [
      ...new Set(reviews.filter((r) => r.customer).map((r) => r.customer._id.toString())),
    ];
    const objectIds = customerIds.map((id) => new mongoose.Types.ObjectId(id));
    const totalSpentData = await Order.aggregate([
      { $match: { user: { $in: objectIds }, orderStatus: 'Delivered' } },
      { $group: { _id: '$user', totalSpent: { $sum: '$total' } } },
    ]);
    const totalSpentMap = new Map(totalSpentData.map((d) => [d._id.toString(), d.totalSpent]));
    reviews.forEach((r: any) => {
      if (r.customer) {
        r.customer.totalSpent = totalSpentMap.get(r.customer._id.toString()) || 0;
      }
    });
  }

  // Ensure originalImages is populated on all reviews for admin inspection
  reviews.forEach((r: any) => {
    if (!r.originalImages || r.originalImages.length === 0) {
      r.originalImages =
        r.reviewImages && r.reviewImages.length > 0
          ? r.reviewImages.map((img: any) => img.secureUrl)
          : r.images || [];
    }
  });

  // Calculate previously disbursed rewards for each review from WalletTransaction & review.rewardPaid
  const reviewIds = reviews.map((r: any) => new mongoose.Types.ObjectId(r._id));
  const rewardTransactions = await WalletTransaction.find({
    reviewId: { $in: reviewIds },
    source: 'review_reward',
    status: 'active',
  }).lean();

  const rewardPaidMap = new Map<string, number>();
  rewardTransactions.forEach((tx: any) => {
    if (tx.reviewId) {
      const key = tx.reviewId.toString();
      rewardPaidMap.set(key, (rewardPaidMap.get(key) || 0) + (tx.amount || 0));
    }
  });

  reviews.forEach((r: any) => {
    const txTotal = rewardPaidMap.get(r._id.toString()) || 0;
    const resolved = Math.max(r.rewardPaid || 0, txTotal);
    r.rewardPaid = resolved > 0 ? resolved : r.status === 'approved' ? 20 : 0;
  });

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

export const updateReviewImages = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId, approvedImages } = req.body;

  if (!reviewId || !Array.isArray(approvedImages)) {
    throw new ApiError(400, 'Review ID and approvedImages array are required');
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  // Preserve original uploaded images before modifying approved images
  if (!review.originalImages || review.originalImages.length === 0) {
    review.originalImages =
      review.reviewImages && review.reviewImages.length > 0
        ? review.reviewImages.map((img: any) => img.secureUrl)
        : review.images || [];
  }

  review.images = approvedImages;
  if (review.reviewImages && review.reviewImages.length > 0) {
    review.reviewImages = review.reviewImages.filter((img: any) =>
      approvedImages.includes(img.secureUrl),
    );
  }

  await review.save();

  res.status(200).json(
    new ApiResponse(true, 'Review images successfully updated!', {
      reviewId: review._id,
      images: review.images,
      originalImages: review.originalImages,
    }),
  );
});

export const moderateReview = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId, action, customRewardAmount, approvedImages } = req.body; // action: 'approve' | 'reject' | 'undo'

  if (!reviewId || !['approve', 'reject', 'undo'].includes(action)) {
    throw new ApiError(400, 'Review ID and valid action are required');
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  if (action === 'undo') {
    if (review.status === 'pending') {
      throw new ApiError(400, 'Review is already in pending status');
    }

    review.status = 'pending';
    await review.save();

    // Recalculate product rating atomically using MongoDB aggregation pipeline directly in database
    if (review.product) {
      await updateProductRating(review.product);
    }

    return res.status(200).json(
      new ApiResponse(true, 'Review has been unpublished and reverted to pending moderation.', {
        review,
      }),
    );
  }

  if (review.status !== 'pending') {
    throw new ApiError(400, `Review has already been moderated with status: ${review.status}`);
  }

  if (action === 'approve') {
    review.status = 'approved';

    // Preserve original uploaded images before updating approved set
    if (!review.originalImages || review.originalImages.length === 0) {
      review.originalImages =
        review.reviewImages && review.reviewImages.length > 0
          ? review.reviewImages.map((img: any) => img.secureUrl)
          : review.images || [];
    }

    if (Array.isArray(approvedImages)) {
      review.images = approvedImages;
      if (review.reviewImages && review.reviewImages.length > 0) {
        review.reviewImages = review.reviewImages.filter((img: any) =>
          approvedImages.includes(img.secureUrl),
        );
      }
    }

    await review.save();

    // Recalculate product rating atomically using MongoDB aggregation pipeline directly in database
    if (review.product) {
      await updateProductRating(review.product);
    }

    let message = 'Review successfully approved!';

    if (customRewardAmount && typeof customRewardAmount === 'number' && customRewardAmount > 0) {
      const user = await User.findById(review.customer);
      if (user) {
        const balanceBefore = user.walletBalance || 0;
        const balanceAfter = balanceBefore + customRewardAmount;
        user.walletBalance = balanceAfter;
        await user.save();

        await WalletTransaction.create([
          {
            userId: user._id,
            type: 'credit',
            amount: customRewardAmount,
            source: 'review_reward',
            description: 'Reward for approved product review (Manual)',
            status: 'active',
            reviewId: review._id,
            adminId: new mongoose.Types.ObjectId((req as any).user.id),
            balanceBefore,
            balanceAfter,
          },
        ]);
        review.rewardPaid = (review.rewardPaid || 0) + customRewardAmount;
        await review.save();
        message = `Review successfully approved! ₹${customRewardAmount} credited manually.`;
      }
    } else if (customRewardAmount === 0 || (review.rewardPaid && review.rewardPaid > 0)) {
      message = 'Review successfully approved without additional reward payout.';
    } else {
      const { RuleEngine } = require('../../services/RuleEngine');
      const userForRule = await User.findById(review.customer).lean();

      try {
        await RuleEngine.evaluateTrigger('on_review', { user: userForRule, review });
      } catch (ruleErr) {
        require('../../config/logger').default.error('Failed to evaluate review rules:', ruleErr);
      }
    }

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
