import { Request, Response } from 'express';
import Gallery from '../models/Gallery';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { deleteFromCloudinary, extractPublicId } from '../utils/cloudinary';
import logger from '../config/logger';
import { bumpPublicCacheVersion } from '../utils/cache/cacheVersion';
import { ChangeTracker } from '../utils/ChangeTracker';

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildGalleryFilterQuery(queryParams: any) {
  const { category, event, search, type, style, ...dynamicFilters } = queryParams;

  const filter: any = { isActive: true };
  if (category && String(category).toLowerCase() !== 'all') filter.category = category;
  if (event && String(event).toLowerCase() !== 'all') filter.event = event;
  if (type && String(type).toLowerCase() !== 'all') filter.type = type;
  if (style && String(style).toLowerCase() !== 'all') filter.style = style;

  let sortQuery: any = { createdAt: -1 };

  if (search) {
    const cleanSearch = String(search).trim();
    if (cleanSearch) {
      filter.$text = { $search: cleanSearch };
      sortQuery = { score: { $meta: 'textScore' } };
    }
  }

  // Dynamic Filters (e.g. ?Tags=Wedding)
  const dynamicFilterOrs: any[] = [];
  Object.keys(dynamicFilters).forEach((key) => {
    // Ignore pagination and known sorts
    if (['page', 'limit', 'skip', 'sort'].includes(key)) return;

    const values = String(dynamicFilters[key])
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (values.length > 0) {
      const valRegexes = values.map((v) => new RegExp(`^${escapeRegex(v)}$`, 'i'));

      dynamicFilterOrs.push({
        $or: [
          { tags: { $in: valRegexes } },
          { style: { $in: valRegexes } },
          { event: { $in: valRegexes } },
        ],
      });
    }
  });

  if (dynamicFilterOrs.length > 0) {
    if (filter.$and) {
      filter.$and.push(...dynamicFilterOrs);
    } else {
      filter.$and = dynamicFilterOrs;
    }
  }

  return { filter, sortQuery };
}

export const getGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const { filter, sortQuery } = buildGalleryFilterQuery(req.query);

  const [items, totalCount] = await Promise.all([
    Gallery.find(filter)
      .select('-colorPalette -story -similarInspirations -likedBy -tags')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean(),
    Gallery.countDocuments(filter),
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        true,
        'Gallery items fetched',
        formatPaginationResponse(items, totalCount, page, limit),
      ),
    );
});

export const getDynamicGalleryFilters = asyncHandler(async (req: Request, res: Response) => {
  const { filter } = buildGalleryFilterQuery(req.query);

  const facetPipeline: any = {
    categories: [{ $sortByCount: '$category' }],
    events: [{ $match: { event: { $exists: true, $ne: '' } } }, { $sortByCount: '$event' }],
    styles: [{ $match: { style: { $exists: true, $ne: '' } } }, { $sortByCount: '$style' }],
    tags: [{ $unwind: '$tags' }, { $sortByCount: '$tags' }],
  };

  const aggregation = await Gallery.aggregate([{ $match: filter }, { $facet: facetPipeline }]);

  const result = aggregation[0];
  const filterGroups: any[] = [];

  if (result.categories?.length > 1) {
    filterGroups.push({
      id: 'category',
      label: 'Category',
      type: 'checkbox',
      options: result.categories.map((c: any) => ({
        value: c._id,
        label: c._id,
        count: c.count,
      })),
    });
  }

  if (result.events?.length > 1) {
    filterGroups.push({
      id: 'event',
      label: 'Event Type',
      type: 'checkbox',
      options: result.events.map((e: any) => ({
        value: e._id,
        label: e._id,
        count: e.count,
      })),
    });
  }

  if (result.styles?.length > 1) {
    filterGroups.push({
      id: 'style',
      label: 'Design Style',
      type: 'checkbox',
      options: result.styles.map((s: any) => ({
        value: s._id,
        label: s._id,
        count: s.count,
      })),
    });
  }

  if (result.tags?.length > 1) {
    filterGroups.push({
      id: 'tags',
      label: 'Tags',
      type: 'checkbox',
      options: result.tags.slice(0, 15).map((t: any) => ({
        value: t._id,
        label: t._id,
        count: t.count,
      })),
    });
  }

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.status(200).json(new ApiResponse(true, 'Filters fetched successfully', filterGroups));
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

export const createGalleryItem = asyncHandler(async (req: Request | any, res: Response) => {
  const item = new Gallery(req.body);
  await item.save();
  await ChangeTracker.trackChange('Gallery', item._id, null, item.toObject(), req.user, 'create');
  await bumpPublicCacheVersion();
  res.status(201).json(new ApiResponse(true, 'Gallery item created', item));
});

export const updateGalleryItem = asyncHandler(async (req: Request | any, res: Response) => {
  const oldItem = await Gallery.findById(req.params.id);

  const item = await Gallery.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!item) throw new ApiError(404, 'Gallery item not found');

  if (oldItem && item) {
    await ChangeTracker.trackChange(
      'Gallery',
      item._id,
      oldItem.toObject(),
      item.toObject(),
      req.user,
      'update',
    );
  }

  if (oldItem && req.body.image && oldItem.image !== req.body.image) {
    const publicId = extractPublicId(oldItem.image);
    if (publicId) {
      deleteFromCloudinary(publicId).catch((err) =>
        logger.error(`Failed to clean up old gallery image: ${err}`),
      );
    }
  }

  if (oldItem && oldItem.video && oldItem.video !== req.body.video) {
    const publicId = extractPublicId(oldItem.video);
    if (publicId) {
      deleteFromCloudinary(publicId).catch((err) =>
        logger.error(`Failed to clean up old gallery video: ${err}`),
      );
    }
  }

  await bumpPublicCacheVersion();
  res.status(200).json(new ApiResponse(true, 'Gallery item updated', item));
});

export const deleteGalleryItem = asyncHandler(async (req: Request | any, res: Response) => {
  const item = await Gallery.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Gallery item not found');

  await item.softDelete(req.user, 'Deleted via galleryController');

  await bumpPublicCacheVersion();
  res
    .status(200)
    .json(new ApiResponse(true, 'Gallery item moved to recycle bin successfully', item));
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
      $inc: { likes: 1 },
    },
    { returnDocument: 'after' },
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
