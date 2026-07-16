import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Review from '../../models/Review';
import Product from '../../models/Product';
import Order from '../../models/Order';
import EventJob from '../../domains/event_operations/models/EventJob';
import ShowcaseCollection from '../../models/ShowcaseCollection';
import User from '../../models/User';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';

/**
 * Computes product reviews average and total count atomically using MongoDB aggregation pipeline
 */
export const updateProductRating = async (
  productId: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession,
) => {
  if (!productId) return;

  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved' } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    const { avgRating, reviewCount } = stats[0];
    await Product.findByIdAndUpdate(
      productId,
      {
        rating: Math.round(avgRating * 10) / 10,
        reviews: reviewCount,
      },
      { session },
    );
  } else {
    // Zero out if there are no approved reviews remaining
    await Product.findByIdAndUpdate(
      productId,
      {
        rating: 0,
        reviews: 0,
      },
      { session },
    );
  }
};

export const updateShowcaseRating = async (
  showcaseId: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession,
) => {
  if (!showcaseId) return;

  const stats = await Review.aggregate([
    { $match: { showcase: new mongoose.Types.ObjectId(showcaseId), status: 'approved' } },
    {
      $group: {
        _id: '$showcase',
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    const { avgRating, reviewCount } = stats[0];
    await ShowcaseCollection.findByIdAndUpdate(
      showcaseId,
      {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: reviewCount,
      },
      { session },
    );
  } else {
    await ShowcaseCollection.findByIdAndUpdate(
      showcaseId,
      {
        rating: 0,
        reviewCount: 0,
      },
      { session },
    );
  }
};

export const getProductReviews = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { page, limit, skip } = getPaginationOptions(req.query);
  const filter: any = { product: productId, status: 'approved', isMock: { $ne: true } };

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter)
      .populate('customer', 'name')
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
        'Reviews fetched',
        formatPaginationResponse(reviews, totalCount, page, limit),
      ),
    );
});

export const getShowcaseReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const filter: any = {
    showcase: req.params.showcaseId,
    status: 'approved',
    isMock: { $ne: true },
  };

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter)
      .populate('customer', 'name')
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
        'Reviews fetched',
        formatPaginationResponse(reviews, totalCount, page, limit),
      ),
    );
});

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const {
    productId,
    showcaseId,
    rating,
    comment,
    images,
    reviewImages,
    location,
    eventType,
    favoriteElement,
    category,
  } = req.body;

  if (!productId && !showcaseId) {
    throw new ApiError(400, 'Either productId or showcaseId is required');
  }

  if (productId) {
    // Verify product exists
    const product = await Product.findById(productId).lean();
    if (!product) throw new ApiError(404, 'Product not found');

    // --- PURCHASER GATE: Only customers who received this product can review ---
    const purchasedOrder = await Order.findOne({
      user: req.user!.id,
      orderStatus: 'Delivered',
      'items.productId': productId,
    }).lean();
    if (!purchasedOrder) {
      throw new ApiError(403, 'You can only review products you have purchased and received.');
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      customer: req.user!.id,
    }).lean();
    if (existingReview) throw new ApiError(400, 'You have already reviewed this product');
  }

  if (showcaseId) {
    // Verify showcase exists
    const showcase = await ShowcaseCollection.findById(showcaseId).lean();
    if (!showcase) throw new ApiError(404, 'Showcase not found');

    // --- PURCHASER GATE: Only customers who completed this showcase booking can review ---
    const completedBooking = await EventJob.findOne({
      user: req.user!.id,
      status: 'completed',
      eventPackage: showcaseId,
    }).lean();
    if (!completedBooking) {
      throw new ApiError(
        403,
        'You can only review showcases for which you have a completed booking.',
      );
    }

    // Check if user already reviewed this showcase
    const existingReview = await Review.findOne({
      showcase: showcaseId,
      customer: req.user!.id,
    }).lean();
    if (existingReview) throw new ApiError(400, 'You have already reviewed this showcase');
  }

  const user = await User.findById(req.user!.id).lean();
  const reviewerName = user?.name || req.user!.name || req.body.customerName || 'Anonymous';

  const review = new Review({
    product: productId || undefined,
    showcase: showcaseId || undefined,
    customer: req.user!.id,
    customerName: reviewerName,
    rating,
    comment,
    images: images || (reviewImages ? reviewImages.map((img: any) => img.secureUrl) : []),
    reviewImages: reviewImages || undefined,
    location: location || undefined,
    eventType: eventType || undefined,
    favoriteElement: favoriteElement || undefined,
    category: category || undefined,
    verified: true, // Always true - derived from backend purchase gate
  });

  await review.save();

  if (Array.isArray(images) && images.length > 0) {
    const { MediaService } = require('../../services/media/MediaService');
    const logger = require('../../config/logger').default || require('../../config/logger');
    try {
      await MediaService.syncReferences('Review', review._id, images, 'images');
    } catch (err: any) {
      logger.error(`Failed to sync references for new review images: ${err}`);
    }
  }
  if (productId) {
    // Atomically recalculate using MongoDB pipeline
    await updateProductRating(productId);
  }

  if (showcaseId) {
    await updateShowcaseRating(showcaseId);
  }

  try {
    const { emitAdminEvent } = require('../../socket');
    emitAdminEvent('review_update', { reviewId: review._id });
  } catch (e) {
    const logger = require('../../config/logger').default || require('../../config/logger');
    logger.debug('Failed to emit review_update event', e);
  }

  res.status(201).json(new ApiResponse(true, 'Review submitted successfully', review));
});

export const getAllReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const { status, rating, verified, search, sort } = req.query;
  const filter: any = {};

  if (status) filter.status = status;
  if (rating) filter.rating = Number(rating);
  if (verified !== undefined) filter.verified = verified === 'true';

  // Cross-collection search logic
  if (search) {
    const searchRegex = new RegExp(search as string, 'i');

    // Find matching customers
    const User = require('../../models/User').default;
    const users = await User.find({ $or: [{ name: searchRegex }, { email: searchRegex }] })
      .select('_id')
      .lean();
    const customerIds = users.map((u: any) => u._id.toString());

    // Find matching products
    const Product = require('../../models/Product').default;
    const products = await Product.find({ title: searchRegex }).select('_id').lean();
    const productIds = products.map((p: any) => p._id.toString());

    filter.$or = [
      { comment: searchRegex },
      ...(customerIds.length > 0 ? [{ customer: { $in: customerIds } }] : []),
      ...(productIds.length > 0 ? [{ product: { $in: productIds } }] : []),
    ];
  }

  const sortOrder = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter)
      .populate('product', 'title imageSrc')
      .populate('customer', 'name email')
      .sort(sortOrder as any)
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
        'All reviews fetched',
        formatPaginationResponse(reviews, totalCount, page, limit),
      ),
    );
});

export const getReviewStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await Review.aggregate([
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalReviews: { $sum: 1 },
              avgRating: { $avg: '$rating' },
              pendingCount: {
                $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
              },
              approvedCount: {
                $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
              },
              lowRatingCount: {
                $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] },
              },
              verifiedCount: {
                $sum: { $cond: [{ $eq: ['$verified', true] }, 1, 0] },
              },
            },
          },
        ],
        thisMonth: [
          {
            $match: {
              createdAt: {
                $gte: new Date(new Date().setDate(1)),
              },
            },
          },
          { $count: 'count' },
        ],
        ratingDistribution: [
          { $group: { _id: '$rating', count: { $sum: 1 } } },
          { $sort: { _id: -1 } },
        ],
      },
    },
  ]);

  const result = stats[0];
  const totals = result.totals[0] || {
    totalReviews: 0,
    avgRating: 0,
    pendingCount: 0,
    approvedCount: 0,
    lowRatingCount: 0,
    verifiedCount: 0,
  };

  res.status(200).json(
    new ApiResponse(true, 'Review stats fetched', {
      ...totals,
      reviewsThisMonth: result.thisMonth[0]?.count || 0,
      ratingDistribution: result.ratingDistribution,
    }),
  );
});

export const getMyReview = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const review = await Review.findOne({ product: productId, customer: req.user!.id })
    .populate('product', 'title imageSrc')
    .lean();

  if (!review) {
    return res.status(200).json(new ApiResponse(true, 'No review found', null));
  }

  res.status(200).json(new ApiResponse(true, 'User review fetched', review));
});

export const updateOwnReview = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rating, comment, images, reviewImages } = req.body;

  const review = await Review.findOne({ _id: id, customer: req.user!.id });
  if (!review) throw new ApiError(404, 'Review not found or unauthorized');

  review.rating = rating;
  review.comment = comment;

  if (reviewImages) {
    const oldPublicIds = (review.reviewImages || []).map((img) => img.publicId).filter(Boolean);
    const newPublicIds = reviewImages.map((img: any) => img.publicId).filter(Boolean);
    const removedPublicIds = oldPublicIds.filter((id) => !newPublicIds.includes(id));

    if (removedPublicIds.length > 0) {
      const { CloudinaryAdapter } = require('../../services/media/CloudinaryAdapter');
      const logger = require('../../config/logger').default || require('../../config/logger');
      try {
        await CloudinaryAdapter.deleteMultiple(removedPublicIds);
      } catch (err) {
        logger.error(`Failed to delete removed review images from Cloudinary: ${err}`);
      }
    }

    review.reviewImages = reviewImages;
    review.images = reviewImages.map((img: any) => img.secureUrl);
  } else if (images) {
    review.images = images;
  }

  // If editing an approved review, it must be re-moderated
  if (review.status === 'approved') {
    review.status = 'pending';
  }

  await review.save();

  if (review.product) {
    await updateProductRating(review.product);
  }

  res.status(200).json(new ApiResponse(true, 'Review updated successfully', review));
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const review = (await Review.findById(req.params.id)) as any;
  if (!review) throw new ApiError(404, 'Review not found');

  if (typeof review.softDelete === 'function') {
    await review.softDelete(req.user, 'Admin deletion');
  } else {
    // Fallback if plugin is missing on the model interface during TS compilation edge cases
    review.isDeleted = true;
    review.deletedAt = new Date();
    await review.save();
  }

  // Soft-delete images by dropping references to 0
  if (Array.isArray(review.images) && review.images.length > 0) {
    const { MediaService } = require('../../services/media/MediaService');
    const logger = require('../../config/logger').default || require('../../config/logger');
    try {
      await MediaService.syncReferences('Review', review._id, [], 'images');
    } catch (err: any) {
      logger.error(`Failed to remove references for review images: ${err}`);
    }
  }

  // Recalculate product rating atomically using MongoDB aggregation pipeline directly in database
  if (review.product) {
    await updateProductRating(review.product);
  }
  if (review.showcase) {
    await updateShowcaseRating(review.showcase);
  }

  try {
    const { emitAdminEvent } = require('../../socket');
    emitAdminEvent('review_update', { reviewId: review._id });
  } catch (e) {
    const logger = require('../../config/logger').default || require('../../config/logger');
    logger.debug('Failed to emit review_update event', e);
  }

  res.status(200).json(new ApiResponse(true, 'Review deleted', review));
});

export const updateReviewStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, moderationReason, internalNotes } = req.body;
  const reviewId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  let review;
  try {
    review = await Review.findById(reviewId).session(session);

    if (!review) throw new ApiError(404, 'Review not found');

    review.status = status;
    review.moderatedBy = new mongoose.Types.ObjectId(req.user!.id);
    review.moderatedAt = new Date();
    if (moderationReason !== undefined) review.moderationReason = moderationReason;
    if (internalNotes !== undefined) review.internalNotes = internalNotes;

    await review.save({ session });

    // Atomically recalculate ratings
    if (review.product) {
      await updateProductRating(review.product, session);
    }
    if (review.showcase) {
      await updateShowcaseRating(review.showcase, session);
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  try {
    const { emitAdminEvent } = require('../../socket');
    emitAdminEvent('review_update', { reviewId: review._id });
  } catch (e) {
    const logger = require('../../config/logger').default || require('../../config/logger');
    logger.debug('Failed to emit review_update event', e);
  }

  res.status(200).json(new ApiResponse(true, 'Review status updated successfully', review));
});

export const bulkUpdateReviewStatus = asyncHandler(async (req: Request, res: Response) => {
  const { reviewIds, status, moderationReason, internalNotes } = req.body;

  if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
    throw new ApiError(400, 'reviewIds array is required');
  }

  const reviews = await Review.find({ _id: { $in: reviewIds } });

  const updatedReviews = [];
  const productIds = new Set<string>();
  const showcaseIds = new Set<string>();

  for (const review of reviews) {
    review.status = status;
    review.moderatedBy = new mongoose.Types.ObjectId(req.user!.id);
    review.moderatedAt = new Date();
    if (moderationReason !== undefined) review.moderationReason = moderationReason;
    if (internalNotes !== undefined) review.internalNotes = internalNotes;
    await review.save();
    updatedReviews.push(review._id);

    if (review.product) productIds.add(review.product.toString());
    if (review.showcase) showcaseIds.add(review.showcase.toString());
  }

  // Recalculate ratings
  for (const productId of productIds) {
    await updateProductRating(productId);
  }
  for (const showcaseId of showcaseIds) {
    await updateShowcaseRating(showcaseId);
  }

  res
    .status(200)
    .json(
      new ApiResponse(true, `Successfully updated ${updatedReviews.length} reviews`, {
        updatedReviews,
      }),
    );
});

export const getPublicReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const filter = { status: 'approved' as const, isMock: { $ne: true } };

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter)
      .populate('product', 'title imageSrc')
      .populate('customer', 'name')
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
        'Public approved reviews fetched',
        formatPaginationResponse(reviews, totalCount, page, limit),
      ),
    );
});

export const incrementHelpful = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');

  const alreadyVoted = review.helpfulBy && review.helpfulBy.some((id) => id.toString() === userId);
  if (alreadyVoted) {
    throw new ApiError(400, 'You have already voted this review as helpful');
  }

  const updatedReview = await Review.findByIdAndUpdate(
    req.params.id,
    {
      $inc: { helpfulCount: 1 },
      $push: { helpfulBy: userId },
    },
    { returnDocument: 'after' },
  );

  res.status(200).json(new ApiResponse(true, 'Helpful count incremented', updatedReview));
});

// Check if logged-in user can review this product
export const canReview = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const userId = req.user!.id;

  const alreadyReviewed = !!(await Review.findOne({ product: productId, customer: userId }).lean());
  if (alreadyReviewed) {
    return res.status(200).json(
      new ApiResponse(true, 'Review eligibility checked', {
        canReview: false,
        alreadyReviewed: true,
        reason: 'already_reviewed',
      }),
    );
  }

  const purchasedOrder = await Order.findOne({
    user: userId,
    orderStatus: 'Delivered',
    'items.productId': productId,
  }).lean();

  if (!purchasedOrder) {
    return res.status(200).json(
      new ApiResponse(true, 'Review eligibility checked', {
        canReview: false,
        alreadyReviewed: false,
        reason: 'not_purchased',
      }),
    );
  }

  return res.status(200).json(
    new ApiResponse(true, 'Review eligibility checked', {
      canReview: true,
      alreadyReviewed: false,
      reason: 'eligible',
    }),
  );
});

export const canReviewShowcase = asyncHandler(async (req: Request, res: Response) => {
  const { showcaseId } = req.params;
  const userId = req.user!.id;

  const alreadyReviewed = !!(await Review.findOne({
    showcase: showcaseId,
    customer: userId,
  }).lean());
  if (alreadyReviewed) {
    return res.status(200).json(
      new ApiResponse(true, 'Review eligibility checked', {
        canReview: false,
        alreadyReviewed: true,
        reason: 'already_reviewed',
      }),
    );
  }

  const completedBooking = await EventJob.findOne({
    user: userId,
    status: 'completed',
    eventPackage: showcaseId,
  }).lean();

  if (!completedBooking) {
    return res.status(200).json(
      new ApiResponse(true, 'Review eligibility checked', {
        canReview: false,
        alreadyReviewed: false,
        reason: 'not_purchased',
      }),
    );
  }

  return res.status(200).json(
    new ApiResponse(true, 'Review eligibility checked', {
      canReview: true,
      alreadyReviewed: false,
      reason: 'eligible',
    }),
  );
});
