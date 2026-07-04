import { Request, Response } from 'express';
import SearchSynonym from '../../models/SearchSynonym';
import SearchPin from '../../models/SearchPin';
import { reindexAll } from '../../services/search/searchIndexer';
import { clearAllCaches } from '../../services/search/searchCache';
import logger from '../../config/logger';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';

export const getSynonyms = asyncHandler(async (req: Request, res: Response) => {
  const synonyms = await SearchSynonym.find().sort({ createdAt: -1 }).lean();
  res.status(200).json(new ApiResponse(true, 'Synonyms fetched successfully', synonyms));
});

export const createSynonym = asyncHandler(async (req: Request, res: Response) => {
  const { groupName, terms, language, category, isActive } = req.body;

  const normalizedTerms = Array.isArray(terms)
    ? terms.map((t: string) => t.toLowerCase().trim()).filter(Boolean)
    : [];

  try {
    const newSynonym = await SearchSynonym.create({
      groupName,
      terms: normalizedTerms,
      language,
      category,
      isActive,
      createdBy: (req as any).user?._id,
    });

    await clearAllCaches();
    res.status(201).json(new ApiResponse(true, 'Synonym created successfully', newSynonym));
  } catch (error: any) {
    if (error.code === 11000) {
      throw new ApiError(400, 'Synonym group already exists');
    }
    throw error;
  }
});

export const updateSynonym = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  if (updateData.terms && Array.isArray(updateData.terms)) {
    updateData.terms = updateData.terms.map((t: string) => t.toLowerCase().trim()).filter(Boolean);
  }

  const updated = await SearchSynonym.findByIdAndUpdate(id, updateData, { new: true });

  if (!updated) {
    throw new ApiError(404, 'Synonym not found');
  }

  await clearAllCaches();
  res.status(200).json(new ApiResponse(true, 'Synonym updated successfully', updated));
});

export const deleteSynonym = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await SearchSynonym.findByIdAndDelete(id);

  if (!deleted) {
    throw new ApiError(404, 'Synonym not found');
  }

  await clearAllCaches();
  res.status(200).json(new ApiResponse(true, 'Synonym deleted successfully'));
});

export const getPins = asyncHandler(async (req: Request, res: Response) => {
  const pins = await SearchPin.find()
    .populate('pinnedProductIds', 'title imageSrc slug price')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(true, 'Pins fetched successfully', pins));
});

export const createPin = asyncHandler(async (req: Request, res: Response) => {
  const { keyword, pinnedProductIds, boostScore, isActive } = req.body;

  try {
    const newPin = await SearchPin.create({
      keyword: keyword.toLowerCase().trim(),
      pinnedProductIds,
      boostScore,
      isActive,
      createdBy: (req as any).user?._id,
    });

    await clearAllCaches();
    await newPin.populate('pinnedProductIds', 'title imageSrc slug price');
    res.status(201).json(new ApiResponse(true, 'Pin created successfully', newPin));
  } catch (error: any) {
    if (error.code === 11000) {
      throw new ApiError(400, 'Pin for this keyword already exists');
    }
    throw error;
  }
});

export const updatePin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  if (updateData.keyword) {
    updateData.keyword = updateData.keyword.toLowerCase().trim();
  }

  const updated = await SearchPin.findByIdAndUpdate(id, updateData, { new: true }).populate(
    'pinnedProductIds',
    'title imageSrc slug price',
  );

  if (!updated) {
    throw new ApiError(404, 'Pin not found');
  }

  await clearAllCaches();
  res.status(200).json(new ApiResponse(true, 'Pin updated successfully', updated));
});

export const deletePin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await SearchPin.findByIdAndDelete(id);

  if (!deleted) {
    throw new ApiError(404, 'Pin not found');
  }

  await clearAllCaches();
  res.status(200).json(new ApiResponse(true, 'Pin deleted successfully'));
});

export const triggerReindex = asyncHandler(async (req: Request, res: Response) => {
  // Run asynchronously to not block the request
  reindexAll().catch((err) => {
    logger.error(`[SynonymController] Async reindex failed: ${err.message}`);
  });

  res.status(200).json(new ApiResponse(true, 'Search reindex triggered in background'));
});
