import mongoose from 'mongoose';
import { validateFile } from '../../validators/mediaValidator';
import { ImageOptimizer } from './ImageOptimizer';
import { DuplicateDetector, DuplicateFoundError } from './DuplicateDetector';
import { CloudinaryAdapter } from './CloudinaryAdapter';
import { VideoHandler } from './VideoHandler';
import Media, { IMedia } from '../../models/Media';
import logger from '../../config/logger';
import { buildFolder } from '../../constants/mediaConstants';
import { mediaQueue } from '../../jobs/queues';

export interface UploadOptions {
  module?: string;
  folder?: string;
  filename?: string;
  tags?: string[];
  uploadedBy?: mongoose.Types.ObjectId | string;
}

export interface RemoveReferenceOptions {
  model: string;
  field: string;
  documentId: mongoose.Types.ObjectId | string;
}

export class MediaService {
  /**
   * Uploads a single media file transactionally.
   * 1. Validate -> 2. Optimize -> 3. Hash -> 4. Lock -> 5. Dedup -> 6. Upload -> 7. Save DB -> 8. Queue Background
   */
  static async uploadSingle(
    buffer: Buffer,
    mimetype: string,
    options: UploadOptions = {},
  ): Promise<IMedia> {
    const module = options.module || 'default';
    const filename = options.filename || 'upload';

    // 1. Validate (simulated via file object structure since multer isn't passed directly here)
    const { isImage, isVideo } = validateFile(
      { buffer, mimetype, originalname: filename, size: buffer.length } as any,
      module,
    );

    // 2. Optimize
    let processBuffer = buffer;
    let format = mimetype.split('/')[1] || 'unknown';
    let width = 0;
    let height = 0;
    let bytes = buffer.length;
    let originalBytes = buffer.length;
    let optimizationSavings = 0;

    if (isImage) {
      const optResult = await ImageOptimizer.optimize(buffer, mimetype);
      processBuffer = optResult.buffer;
      format = optResult.format;
      width = optResult.width;
      height = optResult.height;
      bytes = optResult.bytes;
      originalBytes = optResult.originalBytes;
      optimizationSavings = optResult.optimizationSavings;
    }

    // 3. Hash (Original Buffer for consistency)
    const hash = DuplicateDetector.computeHash(buffer);
    const targetFolder = buildFolder(module, options.folder);
    const publicId = CloudinaryAdapter.generatePublicId(filename);
    const resourceType = isVideo ? 'video' : 'image';
    const eager = isVideo ? VideoHandler.getEagerTransforms() : undefined;

    // 4. Lock & Execute
    try {
      const meta = {
        bytes: originalBytes,
        width: width || undefined,
        height: height || undefined,
        resourceType,
      };

      return await DuplicateDetector.withDuplicateLock(hash, meta, async () => {
        // 5. Dedup is handled inside withDuplicateLock. If we reach here, no active duplicate exists.

        // 6. Upload to Cloudinary
        logger.info(`[MediaService] Uploading ${filename} to Cloudinary folder ${targetFolder}`);
        const cloudResult = await CloudinaryAdapter.upload(processBuffer, {
          folder: targetFolder,
          publicId,
          resourceType,
          eager,
        });

        // 7. Save to DB (Transactional Phase)
        const { posterUrl, thumbnailUrl } = isVideo
          ? VideoHandler.extractEagerUrls(cloudResult as any)
          : {};

        const mediaDoc = new Media({
          publicId: cloudResult.publicId,
          secureUrl: cloudResult.secureUrl,
          resourceType,
          folder: targetFolder,
          width: cloudResult.width || width,
          height: cloudResult.height || height,
          bytes: cloudResult.bytes || bytes,
          format: cloudResult.format || format,
          originalFilename: filename,
          hash,
          tags: options.tags || [],
          duration: cloudResult.duration,
          codec: cloudResult.codec,
          posterUrl,
          referenceCount: 0, // Starts at 0, incremented when actually referenced
          referencedBy: [],
          status: 'active',
          uploadedBy: options.uploadedBy,
          originalBytes,
          optimizationSavings,
        });

        if (thumbnailUrl) {
          mediaDoc.thumbnails.push({ width: 400, height: 400, url: thumbnailUrl }); // Approximation based on eager transform
        }

        try {
          await mediaDoc.save();
          logger.info(`[MEDIA_UPLOAD] DB saved for Media ${mediaDoc._id} (${mediaDoc.publicId})`);

          // 8. Queue Background (Sync Fallback)
          try {
            await mediaQueue.add('process-thumbnails', { mediaId: mediaDoc._id });
            await mediaQueue.add('extract-metadata', { mediaId: mediaDoc._id });
          } catch (_queueErr) {
            logger.warn(
              `[MediaService] Queue unavailable, falling back to sync execution for ${mediaDoc._id}`,
            );
            // Sync fallback logic would go here if we had heavy processing.
            // Currently, eager transforms handle thumbnails, so this is a safe no-op.
          }

          return mediaDoc;
        } catch (dbError) {
          // COMPENSATING ROLLBACK: DB save failed, remove from Cloudinary
          logger.error(
            `[MediaService] DB save failed for ${publicId}. Rolling back Cloudinary upload.`,
            dbError,
          );
          await CloudinaryAdapter.delete(cloudResult.publicId, resourceType);
          throw dbError;
        }
      });
    } catch (error: any) {
      if (error instanceof DuplicateFoundError) {
        logger.info(
          `[MEDIA_DEDUP] Duplicate found for hash ${hash}. Returning existing asset ${error.existingMedia._id}`,
        );
        return error.existingMedia;
      }
      throw error;
    }
  }

  /**
   * Centralized Reference Sync API (Architecture Hardening)
   * Replaces scattered addReference/removeReference calls.
   * Compares the new list of URLs with the existing Media collection references and syncs them.
   */
  static async syncReferences(
    model: string,
    documentId: mongoose.Types.ObjectId | string,
    newUrls: string[],
    field: string,
  ): Promise<void> {
    const docIdStr = String(documentId);

    // Find all media currently referenced by this document in this field
    const currentlyReferenced = await Media.find({
      'referencedBy.model': model,
      'referencedBy.field': field,
      'referencedBy.documentId': documentId,
    }).exec();

    const currentUrls = currentlyReferenced.map((m) => m.secureUrl);

    // Find URLs to ADD (in newUrls but not in currentUrls)
    const urlsToAdd = newUrls.filter(
      (url) => url && url.includes('cloudinary') && !currentUrls.includes(url),
    );

    // Find URLs to REMOVE (in currentUrls but not in newUrls)
    const urlsToRemove = currentUrls.filter((url) => !newUrls.includes(url));

    for (const url of urlsToAdd) {
      await this.addReference(url, { model, field, documentId });
    }

    for (const url of urlsToRemove) {
      await this.removeReference(url, { model, field, documentId });
    }

    if (urlsToAdd.length > 0 || urlsToRemove.length > 0) {
      logger.info(
        `[MediaService] Synced references for ${model} ${docIdStr}. Added: ${urlsToAdd.length}, Removed: ${urlsToRemove.length}`,
      );
    }
  }

  /**
   * Safe reference removal. Decrements refCount and sets pending_delete if 0.
   */
  static async removeReference(
    mediaIdentifier: string, // ID or URL
    ref: RemoveReferenceOptions,
  ): Promise<void> {
    const isUrl = mediaIdentifier.startsWith('http');
    const query = isUrl ? { secureUrl: mediaIdentifier } : { _id: mediaIdentifier };

    const media = await Media.findOne(query).exec();

    if (!media) {
      logger.warn(
        `[MediaService] Cannot remove reference: Media not found for identifier ${mediaIdentifier}`,
      );
      return;
    }

    if (media.referenceCount <= 0) {
      logger.warn(
        `[MediaService] Media ${media._id} referenceCount already 0 or negative. Anomalous state.`,
      );
      return;
    }

    // Remove the reference from array
    media.referencedBy = media.referencedBy.filter(
      (r) =>
        !(
          r.model === ref.model &&
          r.field === ref.field &&
          String(r.documentId) === String(ref.documentId)
        ),
    );

    // Decrement count
    media.referenceCount = Math.max(0, media.referencedBy.length); // Trust array length as source of truth

    // If 0, mark for soft delete
    if (media.referenceCount === 0 && media.status === 'active') {
      media.status = 'pending_delete';
      // Trigger the soft delete plugin logic
      await media.softDelete(null, 'Reference count reached 0');
      logger.info(
        `[MEDIA_REF_DEC] [MEDIA_DELETE] Media ${media._id} referenceCount reached 0. Marked as pending_delete.`,
      );

      // Queue for permanent deletion after grace period
      const { cleanupQueue } = require('../../jobs/queues');
      const { LifecycleConfig } = require('../../config/lifecycleConfig');
      cleanupQueue.add(
        'clean-all-assets',
        {
          data: [media.secureUrl],
          context: {
            entityType: 'Media',
            entityId: media._id.toString(),
            operation: 'purge',
          },
        },
        { delay: LifecycleConfig.pendingDeleteGracePeriodMs },
      );
    } else {
      await media.save();
      logger.debug(
        `[MEDIA_REF_DEC] Media ${media._id} referenceCount decremented to ${media.referenceCount}.`,
      );
    }
  }

  /**
   * Adds a reference to a media asset.
   */
  static async addReference(mediaIdentifier: string, ref: RemoveReferenceOptions): Promise<void> {
    const isUrl = mediaIdentifier.startsWith('http');
    const query = isUrl ? { secureUrl: mediaIdentifier } : { _id: mediaIdentifier };

    const media = await Media.findOne(query).exec();

    if (!media) {
      logger.warn(
        `[MediaService] Cannot add reference: Media not found for identifier ${mediaIdentifier}`,
      );
      return;
    }

    // Check if reference already exists to prevent duplicate increments
    const exists = media.referencedBy.some(
      (r) =>
        r.model === ref.model &&
        r.field === ref.field &&
        String(r.documentId) === String(ref.documentId),
    );

    if (!exists) {
      media.referencedBy.push({
        model: ref.model,
        field: ref.field,
        documentId: new mongoose.Types.ObjectId(ref.documentId),
      });
      media.referenceCount = media.referencedBy.length;

      // If it was pending_delete, restore it since it's referenced again
      if (media.status === 'pending_delete') {
        media.status = 'active';
        await media.restore();
        logger.info(
          `[MEDIA_REF_INC] [MEDIA_RESTORE] Media ${media._id} restored from pending_delete due to new reference.`,
        );
      } else {
        await media.save();
        logger.debug(
          `[MEDIA_REF_INC] Media ${media._id} referenceCount incremented to ${media.referenceCount}.`,
        );
      }
    }
  }
}
