import { Request, Response } from 'express';
import Review from '../models/Review';
import Product from '../models/Product';
import Order from '../models/Order';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';

export const getProductReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const filter: any = { product: req.params.productId, status: 'approved' };

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);

  res.status(200).json(new ApiResponse(true, 'Reviews fetched', formatPaginationResponse(reviews, totalCount, page, limit)));
});

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const { productId, rating, comment, images, location, eventType, favoriteElement, category, verified } = req.body;

  if (productId) {
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    // --- PURCHASER GATE: Only customers who received this product can review ---
    const purchasedOrder = await Order.findOne({
      user: req.user!.id,
      orderStatus: 'Delivered',
      'items.productId': productId,
    });
    if (!purchasedOrder) {
      throw new ApiError(403, 'You can only review products you have purchased and received.');
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ product: productId, customer: req.user!.id });
    if (existingReview) throw new ApiError(400, 'You have already reviewed this product');
  }

  const review = new Review({
    product: productId || undefined,
    customer: req.user!.id,
    customerName: req.body.customerName || 'Anonymous',
    rating,
    comment,
    images: images || [],
    location: location || undefined,
    eventType: eventType || undefined,
    favoriteElement: favoriteElement || undefined,
    category: category || undefined,
    verified: verified !== undefined ? verified : true,
  });

  await review.save();

  if (productId) {
    // Update product rating
    const allReviews = await Review.find({ product: productId, status: 'approved' });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(productId, { rating: Math.round(avgRating * 10) / 10, reviews: allReviews.length });
  }

  res.status(201).json(new ApiResponse(true, 'Review submitted successfully', review));
});

export const getAllReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const { status } = req.query;
  const filter: any = {};
  if (status) filter.status = status;

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter).populate('product', 'title imageSrc').populate('customer', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);

  res.status(200).json(new ApiResponse(true, 'All reviews fetched', formatPaginationResponse(reviews, totalCount, page, limit)));
});

export const updateReviewStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    throw new ApiError(400, 'Invalid review status');
  }

  const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!review) throw new ApiError(404, 'Review not found');

  // Recalculate product rating after status change
  const approvedReviews = await Review.find({ product: review.product, status: 'approved' });
  if (approvedReviews.length > 0) {
    const avgRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length;
    await Product.findByIdAndUpdate(review.product, { rating: Math.round(avgRating * 10) / 10, reviews: approvedReviews.length });
  }

  res.status(200).json(new ApiResponse(true, 'Review status updated', review));
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  res.status(200).json(new ApiResponse(true, 'Review deleted', review));
});

export const getPublicReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const filter = { status: 'approved' as const };

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter).populate('product', 'title imageSrc').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);

  res.status(200).json(new ApiResponse(true, 'Public approved reviews fetched', formatPaginationResponse(reviews, totalCount, page, limit)));
});

export const incrementHelpful = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { $inc: { helpfulCount: 1 } }, { new: true });
  if (!review) throw new ApiError(404, 'Review not found');
  res.status(200).json(new ApiResponse(true, 'Helpful count incremented', review));
});

// Check if logged-in user can review this product
// Returns: { canReview: bool, reason: string, alreadyReviewed: bool }
export const canReview = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const userId = req.user!.id;

  const alreadyReviewed = !!(await Review.findOne({ product: productId, customer: userId }));
  if (alreadyReviewed) {
    return res.status(200).json(new ApiResponse(true, 'Review eligibility checked', {
      canReview: false, alreadyReviewed: true, reason: 'already_reviewed',
    }));
  }

  const purchasedOrder = await Order.findOne({
    user: userId,
    orderStatus: 'Delivered',
    'items.productId': productId,
  });

  if (!purchasedOrder) {
    return res.status(200).json(new ApiResponse(true, 'Review eligibility checked', {
      canReview: false, alreadyReviewed: false, reason: 'not_purchased',
    }));
  }

  return res.status(200).json(new ApiResponse(true, 'Review eligibility checked', {
    canReview: true, alreadyReviewed: false, reason: 'eligible',
  }));
});
