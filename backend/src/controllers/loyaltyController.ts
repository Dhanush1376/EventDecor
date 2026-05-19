import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import User from '../models/User';
import WalletTransaction from '../models/WalletTransaction';
import Coupon from '../models/Coupon';
import Review from '../models/Review';
import Order from '../models/Order';
import { LoyaltyService } from '../services/loyaltyService';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { updateProductRating } from './reviewController';

export const getLoyaltyDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Self-heal: ensure referral code exists
  if (!user.referralCode) {
    user.referralCode = LoyaltyService.generateReferralCode(user.name);
    await user.save();
  }

  // Fetch detailed wallet ledger sorted by latest transaction first
  const transactions = await WalletTransaction.find({ userId })
    .populate('orderId', 'invoiceNumber total')
    .sort({ createdAt: -1 });

  // Fetch active promotional coupons for the coupon center
  const activeCoupons = await Coupon.find({ isActive: true, expiryDate: { $gt: new Date() } });

  // Compute lifetime spend progress to display next tier goal
  const validOrders = await Order.find({ user: userId, orderStatus: { $nin: ['Cancelled', 'Refunded'] } });
  const lifetimeSpend = validOrders.reduce((sum, ord) => sum + ord.total, 0);

  let nextTier = 'Silver';
  let spendRequired = Math.max(0, 5000 - lifetimeSpend);
  let progressPercentage = Math.min(100, Math.round((lifetimeSpend / 5000) * 100));

  if (user.loyaltyTier === 'Silver') {
    nextTier = 'Gold';
    spendRequired = Math.max(0, 15000 - lifetimeSpend);
    progressPercentage = Math.min(100, Math.round((lifetimeSpend / 15000) * 100));
  } else if (user.loyaltyTier === 'Gold') {
    nextTier = 'Platinum';
    spendRequired = Math.max(0, 40000 - lifetimeSpend);
    progressPercentage = Math.min(100, Math.round((lifetimeSpend / 40000) * 100));
  } else if (user.loyaltyTier === 'Platinum') {
    nextTier = 'None (Max Tier reached)';
    spendRequired = 0;
    progressPercentage = 100;
  }

  res.status(200).json(
    new ApiResponse(true, 'Loyalty wallet and rewards dashboard loaded successfully', {
      walletBalance: user.walletBalance || 0,
      siriCoins: user.siriCoins || 0,
      loyaltyTier: user.loyaltyTier || 'Bronze',
      referralCode: user.referralCode,
      referralsCount: user.referralsCount || 0,
      lifetimeSpend,
      nextTier,
      spendRequired,
      progressPercentage,
      transactions,
      coupons: activeCoupons
    })
  );
});

export const applyReferralCode = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { referralCode } = req.body;

  if (!referralCode) {
    throw new ApiError(400, 'Referral code is required');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User session not found');
  }

  if (user.referredBy) {
    throw new ApiError(400, 'You have already applied a referral code');
  }

  const cleanCode = referralCode.trim().toUpperCase();

  if (user.referralCode === cleanCode) {
    throw new ApiError(400, 'Self-referral is forbidden. Please enter a friend\'s referral code.');
  }

  const referrer = await User.findOne({ referralCode: cleanCode });
  if (!referrer) {
    throw new ApiError(404, 'Invalid referral code. Please check and try again.');
  }

  // Instantly register referrer and reward the referee with ₹50 signup credits atomically without read-modify-write saves
  await User.findByIdAndUpdate(userId, {
    $set: { referredBy: referrer._id },
    $inc: { walletBalance: 50 }
  });

  await WalletTransaction.create({
    userId,
    type: 'credit',
    amount: 50,
    source: 'referral_bonus',
    description: `Applied referral code of ${referrer.name || 'Friend'} - Welcomed with Siri Cash!`,
    status: 'active'
  });

  res.status(200).json(
    new ApiResponse(true, `Referral code successfully registered! Welcomed with ₹50 wallet cash. Referrer will receive ₹150 upon your first purchase.`, {
      referredBy: referrer.name
    })
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
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(true, 'Fetched reviews list for moderation', formatPaginationResponse(reviews, totalCount, page, limit))
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
      review._id.toString()
    );

    res.status(200).json(new ApiResponse(true, 'Review successfully approved and rewards dispatched to reviewer wallet!', review));
  } else {
    review.status = 'rejected';
    await review.save();

    // Recalculate product rating atomically using MongoDB aggregation pipeline directly in database
    if (review.product) {
      await updateProductRating(review.product);
    }

    res.status(200).json(new ApiResponse(true, 'Review has been rejected. No rewards were credited.', review));
  }
});
