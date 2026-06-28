import { Request, Response } from 'express';
import ShowcaseCollection from '../../models/ShowcaseCollection';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import { deleteFromCloudinary, extractPublicId } from '../../utils/cloudinary';

export const getShowcases = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.query;
  const filter: any = { isActive: true };
  if (category) filter.category = category;

  const collections = await ShowcaseCollection.find(filter).sort({ popularityScore: -1 }).lean();
  res.status(200).json(new ApiResponse(true, 'Showcase collections fetched', collections));
});

export const getShowcaseById = asyncHandler(async (req: Request, res: Response) => {
  const collection = await ShowcaseCollection.findById(req.params.id);
  if (!collection) throw new ApiError(404, 'Showcase collection not found');
  res.status(200).json(new ApiResponse(true, 'Showcase collection details', collection));
});

export const createShowcase = asyncHandler(async (req: Request, res: Response) => {
  const collection = new ShowcaseCollection(req.body);
  await collection.save();
  res
    .status(201)
    .json(new ApiResponse(true, 'Showcase collection created successfully', collection));
});

export const updateShowcase = asyncHandler(async (req: Request, res: Response) => {
  const collection = await ShowcaseCollection.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
  });
  if (!collection) throw new ApiError(404, 'Showcase collection not found');
  res
    .status(200)
    .json(new ApiResponse(true, 'Showcase collection updated successfully', collection));
});

export const deleteShowcase = asyncHandler(async (req: Request, res: Response) => {
  const collection = await ShowcaseCollection.findByIdAndDelete(req.params.id);
  if (!collection) throw new ApiError(404, 'Showcase collection not found');

  if (collection.image) {
    const publicId = extractPublicId(collection.image);
    if (publicId)
      deleteFromCloudinary(publicId).catch((err) =>
        logger.error(`Failed to clean up showcase image: ${err}`),
      );
  }

  if (collection.gallery && Array.isArray(collection.gallery)) {
    for (const img of collection.gallery) {
      const publicId = extractPublicId(img);
      if (publicId)
        deleteFromCloudinary(publicId).catch((err) =>
          logger.error(`Failed to clean up showcase gallery image: ${err}`),
        );
    }
  }

  res.status(200).json(new ApiResponse(true, 'Showcase collection deleted successfully', null));
});
