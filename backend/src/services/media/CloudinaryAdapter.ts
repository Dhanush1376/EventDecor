import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';
import { cloudinaryCircuitBreaker } from '../../utils/CircuitBreaker';
import logger from '../../config/logger';
import crypto from 'crypto';

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resourceType: 'image' | 'video' | 'raw';
  duration?: number;
  codec?: string;
}

export class CloudinaryAdapter {
  /**
   * Generates a readable public ID for Cloudinary to prevent collision and aid debugging.
   * e.g., 'Modern Chair White.jpg' -> 'modern-chair-white-a3b8'
   */
  static generatePublicId(filename: string): string {
    const slug = filename
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50); // limit length

    const randomSuffix = crypto.randomBytes(2).toString('hex');
    return slug ? `${slug}-${randomSuffix}` : `asset-${randomSuffix}`;
  }

  /**
   * Uploads a buffer to Cloudinary via a stream.
   * Protected by Circuit Breaker.
   */
  static async upload(
    buffer: Buffer,
    options: {
      folder: string;
      publicId?: string;
      resourceType: 'image' | 'video' | 'raw';
      eager?: any[];
    },
  ): Promise<CloudinaryUploadResult> {
    const uploadOptions: UploadApiOptions = {
      folder: options.folder,
      public_id: options.publicId,
      resource_type: options.resourceType,
      overwrite: true,
      eager: options.eager,
    };

    const action = () => {
      return new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              publicId: result.public_id,
              secureUrl: result.secure_url,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
              resourceType: result.resource_type as 'image' | 'video' | 'raw',
              duration: result.duration,
              codec: result.video?.codec,
            });
          } else {
            reject(new Error('Unknown Cloudinary upload error: No result returned'));
          }
        });

        stream.end(buffer);
      });
    };

    return cloudinaryCircuitBreaker.execute(action);
  }

  /**
   * Permanently deletes a single asset from Cloudinary.
   */
  static async delete(publicId: string, resourceType: string = 'image'): Promise<boolean> {
    const action = async () => {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
      return result.result === 'ok' || result.result === 'not found';
    };

    try {
      return await cloudinaryCircuitBreaker.execute(action);
    } catch (error) {
      logger.error(`[CloudinaryAdapter] Failed to delete ${publicId}:`, error);
      return false;
    }
  }

  /**
   * Permanently deletes multiple assets from Cloudinary in a batch.
   */
  static async deleteMultiple(
    publicIds: string[],
    resourceType: string = 'image',
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    // Note: cloudinary.api.delete_resources is rate limited.
    // For large lists, consider batching into chunks of 100.
    const action = async () => {
      const result = await cloudinary.api.delete_resources(publicIds, {
        resource_type: resourceType,
        invalidate: true,
      });

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
    };

    return cloudinaryCircuitBreaker.execute(action);
  }

  /**
   * Fetches metadata for an existing asset.
   */
  static async getAssetInfo(publicId: string, resourceType: string = 'image'): Promise<any> {
    const action = async () => {
      return await cloudinary.api.resource(publicId, { resource_type: resourceType });
    };

    return cloudinaryCircuitBreaker.execute(action);
  }

  /**
   * Explicitly invalidates a URL or publicId from the Cloudinary CDN.
   * Note: destroying an asset with `invalidate: true` also does this.
   */
  static async invalidateCache(publicId: string, resourceType: string = 'image'): Promise<void> {
    const action = async () => {
      await cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        invalidate: true,
        resource_type: resourceType,
      } as any);
    };

    try {
      await cloudinaryCircuitBreaker.execute(action);
    } catch (error) {
      logger.error(`[CloudinaryAdapter] Failed to invalidate cache for ${publicId}:`, error);
    }
  }

  /**
   * Lists assets inside a specific folder.
   */
  static async listFolder(
    folderPath: string,
    resourceType: string = 'image',
    maxResults: number = 50,
  ): Promise<any[]> {
    const action = async () => {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath + '/',
        resource_type: resourceType,
        max_results: maxResults,
      });
      return result.resources;
    };

    return cloudinaryCircuitBreaker.execute(action);
  }
}
