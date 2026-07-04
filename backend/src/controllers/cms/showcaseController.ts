import { Request, Response } from 'express';
import ShowcaseCollection from '../../models/ShowcaseCollection';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import { MediaService } from '../../services/media/MediaService';

export const getShowcases = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.query;
  const filter: any = { isActive: true };
  if (category) filter.category = category;

  const collections = await ShowcaseCollection.find(filter).sort({ popularityScore: -1 }).lean();
  res.status(200).json(new ApiResponse(true, 'Showcase collections fetched', collections));
});

export const getShowcaseById = asyncHandler(async (req: Request, res: Response) => {
  const collection = await ShowcaseCollection.findById(req.params.id).lean();
  if (!collection) throw new ApiError(404, 'Showcase collection not found');
  res.status(200).json(new ApiResponse(true, 'Showcase collection details', collection));
});

export const createShowcase = asyncHandler(async (req: Request, res: Response) => {
  const collection = new ShowcaseCollection(req.body);
  await collection.save();

  try {
    if (collection.image) {
      await MediaService.syncReferences(
        'ShowcaseCollection',
        collection._id,
        [collection.image],
        'image',
      );
    }
    if (collection.gallery && Array.isArray(collection.gallery)) {
      await MediaService.syncReferences(
        'ShowcaseCollection',
        collection._id,
        collection.gallery,
        'gallery',
      );
    }
  } catch (err) {
    logger.error(`Failed to sync references for new showcase: ${err}`);
  }

  res
    .status(201)
    .json(new ApiResponse(true, 'Showcase collection created successfully', collection));
});

export const updateShowcase = asyncHandler(async (req: Request, res: Response) => {
  const collection = await ShowcaseCollection.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
  });
  if (!collection) throw new ApiError(404, 'Showcase collection not found');

  try {
    if (collection.image) {
      await MediaService.syncReferences(
        'ShowcaseCollection',
        collection._id,
        [collection.image],
        'image',
      );
    } else {
      await MediaService.syncReferences('ShowcaseCollection', collection._id, [], 'image');
    }

    const gallery =
      collection.gallery && Array.isArray(collection.gallery) ? collection.gallery : [];
    await MediaService.syncReferences('ShowcaseCollection', collection._id, gallery, 'gallery');
  } catch (err) {
    logger.error(`Failed to sync references for updated showcase: ${err}`);
  }

  res
    .status(200)
    .json(new ApiResponse(true, 'Showcase collection updated successfully', collection));
});

export const deleteShowcase = asyncHandler(async (req: Request, res: Response) => {
  const collection = await ShowcaseCollection.findByIdAndDelete(req.params.id);
  if (!collection) throw new ApiError(404, 'Showcase collection not found');

  try {
    await MediaService.syncReferences('ShowcaseCollection', collection._id, [], 'image');
    await MediaService.syncReferences('ShowcaseCollection', collection._id, [], 'gallery');
  } catch (err) {
    logger.error(`Failed to remove references for deleted showcase: ${err}`);
  }

  res.status(200).json(new ApiResponse(true, 'Showcase collection deleted successfully', null));
});
