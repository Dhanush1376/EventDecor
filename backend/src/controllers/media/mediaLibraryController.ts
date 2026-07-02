import { Request, Response } from 'express';
import { MediaService } from '../../services/media/MediaService';
import { CloudinaryAdapter } from '../../services/media/CloudinaryAdapter';
import Media from '../../models/Media';
import { enqueueMediaJob } from '../../jobs/mediaJobs';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import mongoose from 'mongoose';

export const uploadMedia = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }

  const { folder, tags } = req.body;
  const parsedTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;

  const result = await MediaService.uploadSingle(req.file.buffer, req.file.mimetype, {
    module: folder || 'default',
    folder,
    filename: req.file.originalname,
    tags: parsedTags,
    uploadedBy: (req as any).user?._id,
  });

  const apiVersion = req.query.v || req.headers['x-api-version'] || 'v2';

  if (apiVersion === '1' || apiVersion === 'v1') {
    res.status(201).json({
      success: true,
      images: [result.secureUrl], // v1 legacy contract (array of URLs)
    });
  } else {
    res.status(201).json({
      success: true,
      data: result, // v2 new contract (IMedia object)
    });
  }
};

export const getMediaLibrary = async (req: Request, res: Response) => {
  const { page = 1, limit = 50, folder, type, search, status = 'active' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;

  const query: any = { status };

  if (folder) query.folder = { $regex: `^${folder}`, $options: 'i' };
  if (type) query.resourceType = type;
  if (search) {
    query.$or = [
      { originalFilename: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Media.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Media.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
};

export const deleteMedia = async (req: Request, res: Response) => {
  const { id } = req.params;

  const media = await Media.findById(id);
  if (!media) {
    throw new ApiError(404, 'Media not found');
  }

  if (media.referenceCount > 0) {
    throw new ApiError(
      409,
      `Cannot delete media: It is still referenced by ${media.referenceCount} entity(s). Please remove all references first.`,
    );
  }

  media.status = 'pending_delete';
  await media.softDelete((req as any).user, 'Admin manual soft delete');

  res.json({
    success: true,
    message: 'Media marked for deletion. It will be permanently removed after 30 days.',
  });
};

export const restoreMedia = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Use findOneWithDeleted because it might be filtered by pre-find hook
  const media = await (Media as any).findOneWithDeleted({ _id: id });

  if (!media) {
    throw new ApiError(404, 'Media not found');
  }

  if (media.status !== 'pending_delete') {
    throw new ApiError(400, 'Media is not in pending_delete status');
  }

  media.status = 'active';
  await media.restore();

  res.json({
    success: true,
    message: 'Media restored successfully.',
  });
};

export const replaceMedia = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!req.file) {
    throw new ApiError(400, 'No replacement file uploaded');
  }

  const media = await Media.findById(id);
  if (!media) {
    throw new ApiError(404, 'Media not found');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Upload the new asset
    const newAsset = await MediaService.uploadSingle(req.file.buffer, req.file.mimetype, {
      module: media.folder.split('/')[1] || 'default',
      folder: media.folder,
      filename: req.file.originalname,
      tags: req.body.tags ? req.body.tags.split(',') : media.tags,
      uploadedBy: (req as any).user?._id,
    });

    if (String(newAsset._id) === String(media._id)) {
      await session.abortTransaction();
      session.endSession();
      throw new ApiError(400, 'The uploaded file is identical to the current file.');
    }

    // 2. Store old version info
    const MAX_VERSION_HISTORY = 5;
    media.previousVersions.unshift({
      publicId: media.publicId,
      secureUrl: media.secureUrl,
      bytes: media.bytes,
      format: media.format,
      replacedAt: new Date(),
      replacedBy: (req as any).user?._id,
    });

    if (media.previousVersions.length > MAX_VERSION_HISTORY) {
      media.previousVersions.pop();
    }

    // 3. Update current document to point to new asset
    const oldPublicId = media.publicId;
    const oldSecureUrl = media.secureUrl;

    media.publicId = newAsset.publicId;
    media.secureUrl = newAsset.secureUrl;
    media.bytes = newAsset.bytes;
    media.format = newAsset.format;
    media.width = newAsset.width;
    media.height = newAsset.height;
    media.hash = newAsset.hash;
    media.version += 1;
    media.updatedAt = new Date();

    await media.save({ session });

    // Clean up the temporary document if it was freshly uploaded and has no references
    if (newAsset.referenceCount === 0) {
      await Media.deleteOne({ _id: newAsset._id }).session(session);
    }

    await session.commitTransaction();
    session.endSession();

    // 4. Cleanup old asset (background queue) and invalidate CDN cache
    try {
      await enqueueMediaJob('delete-old-version', { oldPublicId });
      await enqueueMediaJob('sync-cached-urls', {
        mediaId: media._id,
        oldUrl: oldSecureUrl,
        newUrl: media.secureUrl,
      });
    } catch (queueErr) {
      logger.warn(
        '[MediaService] Queue unavailable, falling back to sync execution for replace jobs',
      );
      // Fallback
    }

    CloudinaryAdapter.invalidateCache(oldPublicId);

    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getMediaStats = async (req: Request, res: Response) => {
  const [totals, byType, byStatus] = await Promise.all([
    Media.aggregate([
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalBytes: { $sum: '$bytes' },
          savedBytes: { $sum: { $subtract: ['$originalBytes', '$bytes'] } },
        },
      },
    ]),
    Media.aggregate([
      {
        $group: {
          _id: '$resourceType',
          count: { $sum: 1 },
          bytes: { $sum: '$bytes' },
        },
      },
    ]),
    Media.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      summary: totals[0] || { totalCount: 0, totalBytes: 0, savedBytes: 0 },
      byType,
      byStatus,
    },
  });
};

export const getMediaHealth = async (req: Request, res: Response) => {
  try {
    const [orphans, duplicates, totalStorage] = await Promise.all([
      Media.countDocuments({ referenceCount: 0, status: 'active' }),
      Media.aggregate([
        { $group: { _id: '$hash', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: 'duplicates' },
      ]),
      Media.aggregate([{ $group: { _id: null, totalBytes: { $sum: '$bytes' } } }]),
    ]);

    const duplicatesCount = duplicates[0]?.duplicates || 0;
    const storageUsed = totalStorage[0]?.totalBytes || 0;

    let cloudinaryStatus = 'unknown';
    try {
      const cloudinary = require('cloudinary').v2;
      const pingRes = await cloudinary.api.ping();
      cloudinaryStatus = pingRes.status === 'ok' ? 'operational' : 'error';
    } catch (err) {
      cloudinaryStatus = 'unreachable';
    }

    res.json({
      success: true,
      data: {
        orphans,
        duplicates: duplicatesCount,
        storageUsed,
        queueStatus: 'operational', // BullMQ is monitored separately or via bull-board
        cloudinaryStatus,
        failedJobs: 0, // In a full implementation, query BullMQ failed count
      },
    });
  } catch (error) {
    logger.error('Failed to get media health', error);
    res.status(500).json({ success: false, message: 'Health check failed' });
  }
};
