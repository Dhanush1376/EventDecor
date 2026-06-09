import { StorageProvider, UploadOptions, UploadResult } from './StorageProvider';
import getCloudinary from '../../config/cloudinary';
import crypto from 'crypto';
import logger from '../../config/logger';
import streamifier from 'streamifier';

export class CloudinaryStorageProvider implements StorageProvider {
  async uploadBuffer(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const { folder, originalname, isVideo } = options;

      const hash = crypto.createHash('sha256');
      hash.update(originalname + Date.now() + crypto.randomBytes(8).toString('hex'));
      const securePublicId = hash.digest('hex').substring(0, 16);

      const cloudinary = getCloudinary();

      const uploadParams: any = {
        folder: `siri-arts-crafts/${folder}`,
        public_id: securePublicId,
        resource_type: isVideo ? 'video' : 'image',
      };

      if (!isVideo) {
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

          resolve({
            url: result.secure_url,
            thumbnail_url: result.eager?.[0]?.secure_url || null,
            format: result.format || 'unknown',
            size: result.bytes,
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
}
