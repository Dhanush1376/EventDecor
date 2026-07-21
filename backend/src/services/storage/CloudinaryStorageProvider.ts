import { StorageProvider, UploadOptions, UploadResult } from './StorageProvider';
import getCloudinary from '../../config/cloudinary';
import crypto from 'crypto';
import logger from '../../config/logger';
import streamifier from 'streamifier';

export class CloudinaryStorageProvider implements StorageProvider {
  async uploadBuffer(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const { folder, originalname, isVideo } = options;
      const isPdf = originalname.toLowerCase().endsWith('.pdf');

      const hash = crypto.createHash('sha256');
      hash.update(originalname + Date.now() + crypto.randomBytes(8).toString('hex'));
      const securePublicId = hash.digest('hex').substring(0, 16);

      const cloudinary = getCloudinary();

      const uploadParams: any = {
        folder: `siri-arts-crafts/${folder}`,
        public_id: securePublicId,
        resource_type: isVideo ? 'video' : isPdf ? 'raw' : 'image',
      };

      if (!isVideo && !isPdf) {
        // Strip metadata, resize to max width 1920px, convert to WebP, aggressive quality
        uploadParams.transformation = [
          { width: 1920, crop: 'limit', fetch_format: 'webp', quality: 'auto:good' },
        ];

        // Generate responsive variants automatically
        uploadParams.eager = [
          { width: 400, crop: 'limit', fetch_format: 'webp', quality: 'auto:good' },
          { width: 800, crop: 'limit', fetch_format: 'webp', quality: 'auto:good' },
          { width: 1200, crop: 'limit', fetch_format: 'webp', quality: 'auto:good' },
        ];
        uploadParams.eager_async = true;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadParams,
        (error: any, result: any) => {
          if (error) {
            logger.error(`[CLOUDINARY] Upload failed for ${originalname}: ${error.message}`);
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Cloudinary upload returned empty result'));
          }

          const thumbnailUrl = result.eager?.[0]?.secure_url || null;

          resolve({
            url: result.secure_url,
            thumbnail_url: thumbnailUrl,
            format: result.format,
            size: result.bytes,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            resourceType: result.resource_type,
            duration: result.duration,
            codec: result.video?.codec,
          });
        },
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  async deleteFile(url: string): Promise<boolean> {
    try {
      // Extract public ID from URL
      // e.g., https://res.cloudinary.com/cloud_name/image/upload/v1234/folder/public_id.webp
      const parts = url.split('/');
      const fileWithExt = parts.pop();
      const folder = parts.pop();
      if (!fileWithExt || !folder) return false;

      const publicId = fileWithExt.split('.')[0];
      const fullPublicId = `siri-arts-crafts/${folder}/${publicId}`;

      const cloudinary = getCloudinary();
      const result = await cloudinary.uploader.destroy(fullPublicId);
      return result.result === 'ok';
    } catch (error) {
      logger.error(`[CLOUDINARY] Delete failed for URL ${url}: ${error}`);
      return false;
    }
  }

  /**
   * Permanently delete multiple files from storage in a batch.
   */
  async deleteMultiple(identifiers: string[]): Promise<{ succeeded: string[]; failed: string[] }> {
    const cloudinary = getCloudinary();
    try {
      const publicIds = identifiers.map((url) => {
        try {
          const parts = url.split('/');
          const filename = parts[parts.length - 1];
          const folder = parts[parts.length - 2];
          return `siri-arts-crafts/${folder}/${filename.split('.')[0]}`;
        } catch {
          return url;
        }
      });
      const result = await cloudinary.api.delete_resources(publicIds, { invalidate: true });
      const succeeded: string[] = [];
      const failed: string[] = [];
      if (result.deleted) {
        for (const [id, status] of Object.entries(result.deleted)) {
          if (status === 'deleted' || status === 'not_found') {
            succeeded.push(id);
          } else {
            failed.push(id);
          }
        }
      }
      return { succeeded, failed };
    } catch (error) {
      logger.error(`[CloudinaryStorage] Failed to delete multiple: ${error}`);
      return { succeeded: [], failed: identifiers };
    }
  }

  /**
   * Get metadata info for an asset in storage.
   */
  async getAssetInfo(identifier: string): Promise<any> {
    const cloudinary = getCloudinary();
    try {
      const parts = identifier.split('/');
      const filename = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      const publicId = `siri-arts-crafts/${folder}/${filename.split('.')[0]}`;
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      logger.error(`[CloudinaryStorage] Failed to get asset info: ${error}`);
      return null;
    }
  }

  /**
   * Invalidate asset in CDN cache.
   */
  async invalidateCache(identifier: string): Promise<void> {
    const cloudinary = getCloudinary();
    try {
      const parts = identifier.split('/');
      const filename = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      const publicId = `siri-arts-crafts/${folder}/${filename.split('.')[0]}`;
      await cloudinary.uploader.explicit(publicId, { type: 'upload', invalidate: true });
    } catch (error) {
      logger.error(`[CloudinaryStorage] Failed to invalidate cache: ${error}`);
    }
  }

  // --- Lifecycle Management Methods ---

  isProviderUrl(url: string): boolean {
    return url.includes('cloudinary.com');
  }

  isOwnedAsset(url: string): boolean {
    if (!this.isProviderUrl(url)) return false;

    // Check if it belongs to our configured cloud name
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    if (!cloudName) return false;

    return url.includes(`/${cloudName}/`);
  }

  extractAssetId(url: string): string | null {
    if (!this.isProviderUrl(url)) return null;

    try {
      const parts = url.split('/');
      const fileWithExt = parts.pop();
      const folder = parts.pop();
      if (!fileWithExt || !folder) return null;

      const publicId = fileWithExt.split('.')[0];
      return `siri-arts-crafts/${folder}/${publicId}`;
    } catch {
      return null;
    }
  }

  async deleteBatch(
    assetIds: string[],
    batchSize?: number,
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const size = batchSize || 50;
    const delayMs = parseInt(process.env.CLOUDINARY_BATCH_DELAY_MS || '1000');
    const results = { succeeded: [] as string[], failed: [] as string[] };

    // We already have deleteMultiple but this one uses rate-limited batches
    for (let i = 0; i < assetIds.length; i += size) {
      const batch = assetIds.slice(i, i + size);

      const batchResult = await this.deleteMultiple(batch);
      results.succeeded.push(...batchResult.succeeded);
      results.failed.push(...batchResult.failed);

      // Throttle between batches
      if (i + size < assetIds.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return results;
  }
}
