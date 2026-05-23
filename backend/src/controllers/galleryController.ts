import { Request, Response } from 'express';
import Gallery from '../models/Gallery';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { deleteFromCloudinary, extractPublicId } from '../utils/cloudinary';
import logger from '../config/logger';
import { bumpPublicCacheVersion } from '../utils/cacheVersion';

export const getGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const { category, event, search, type } = req.query;
  const { page, limit, skip } = getPaginationOptions(req.query);

  const filter: any = { isActive: true };
  if (category) filter.category = category;
  if (event) filter.event = event;
  if (type) filter.type = type;
  if (search) filter.$text = { $search: search as string };

  const [items, totalCount] = await Promise.all([
    Gallery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Gallery.countDocuments(filter),
  ]);

  res.status(200).json(new ApiResponse(true, 'Gallery items fetched', formatPaginationResponse(items, totalCount, page, limit)));
});

export const getGalleryById = asyncHandler(async (req: Request, res: Response) => {
  const item = await Gallery.findById(req.params.id)
    .populate('linkedProducts')
    .populate('similarInspirations');
  if (!item) throw new ApiError(404, 'Gallery item not found');

  // Increment view count
  await Gallery.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

  res.status(200).json(new ApiResponse(true, 'Gallery item fetched', item));
});

export const createGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  const item = new Gallery(req.body);
  await item.save();
  await bumpPublicCacheVersion();
  res.status(201).json(new ApiResponse(true, 'Gallery item created', item));
});

export const updateGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  const oldItem = await Gallery.findById(req.params.id);

  const item = await Gallery.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) throw new ApiError(404, 'Gallery item not found');

  if (oldItem && req.body.image && oldItem.image !== req.body.image) {
    const publicId = extractPublicId(oldItem.image);
    if (publicId) {
      deleteFromCloudinary(publicId).catch(err => logger.error(`Failed to clean up old gallery image: ${err}`));
    }
  }

  if (oldItem && oldItem.video && oldItem.video !== req.body.video) {
    const publicId = extractPublicId(oldItem.video);
    if (publicId) {
      deleteFromCloudinary(publicId).catch(err => logger.error(`Failed to clean up old gallery video: ${err}`));
    }
  }

  await bumpPublicCacheVersion();
  res.status(200).json(new ApiResponse(true, 'Gallery item updated', item));
});

export const deleteGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  const item = await Gallery.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Gallery item not found');

  await Gallery.findByIdAndDelete(req.params.id);

  if (item.image) {
    const publicId = extractPublicId(item.image);
    if (publicId) {
      deleteFromCloudinary(publicId).catch(err => logger.error(`Failed to clean up gallery image: ${err}`));
    }
  }

  if (item.video) {
    const publicId = extractPublicId(item.video);
    if (publicId) {
      deleteFromCloudinary(publicId).catch(err => logger.error(`Failed to clean up gallery video: ${err}`));
    }
  }

  await bumpPublicCacheVersion();
  res.status(200).json(new ApiResponse(true, 'Gallery item completely deleted successfully', item));
});

export const likeGalleryItem = asyncHandler(async (req: any, res: Response) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(401, 'Unauthorized to like items');
  }

  // Find item and only increment if the user's ID is not already in the likedBy array
  const item = await Gallery.findOneAndUpdate(
    { _id: req.params.id, likedBy: { $ne: req.user.id } },
    { 
      $addToSet: { likedBy: req.user.id },
      $inc: { likes: 1 } 
    },
    { new: true }
  );

  if (!item) {
    // If not found, either the item doesn't exist, or it was already liked
    const currentItem = await Gallery.findById(req.params.id);
    if (!currentItem) {
      throw new ApiError(404, 'Gallery item not found');
    }
    // Idempotent success response
    return res.status(200).json(new ApiResponse(true, 'Gallery item already liked', currentItem));
  }

  res.status(200).json(new ApiResponse(true, 'Gallery item liked', item));
});

export const getGalleryCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await Gallery.distinct('category', { isActive: true });
  res.status(200).json(new ApiResponse(true, 'Gallery categories fetched', categories));
});
