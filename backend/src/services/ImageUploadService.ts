import { uploadOnCloudinary, safeDeleteFromCloudinary } from '../utils/cloudinary';
import fs from 'fs';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

export interface UploadedImageMetadata {
  url: string;
  publicId?: string;
}

export class ImageUploadService {
  /**
   * Uploads multiple images (from remote URLs or local Multer files) to Cloudinary
   * and cleans up local temporary files.
   *
   * @param remoteUrls Array of strings (remote URLs)
   * @param localFiles Array of Express.Multer.File objects
   * @param returnMetadata If true, returns objects with url and publicId. Default false returns string[].
   * @returns Array of uploaded secure URLs or metadata objects
   */
  static async processAndUploadImages(
    remoteUrls: string[] = [],
    localFiles: Express.Multer.File[] = [],
    returnMetadata = false,
  ): Promise<any[]> {
    const results: UploadedImageMetadata[] = [];
    const rollbackPublicIds: string[] = [];

    try {
      // Handle remote URLs
      for (const url of remoteUrls) {
        if (typeof url === 'string' && url.startsWith('http')) {
          const response = await uploadOnCloudinary(url);
          if (response) {
            results.push({ url: response.secure_url, publicId: response.public_id });
            if (response.public_id) rollbackPublicIds.push(response.public_id);
          }
        }
      }

      // Handle local file uploads
      for (const file of localFiles) {
        const cloudinaryUrl = (file as any).secure_url || file.path;
        if ((file as any).cloudinaryUploaded && cloudinaryUrl) {
          results.push({ url: cloudinaryUrl, publicId: (file as any).publicId });
          if ((file as any).publicId) rollbackPublicIds.push((file as any).publicId);
          continue;
        }

        const response = await uploadOnCloudinary(file.path);
        if (response) {
          results.push({ url: response.secure_url, publicId: response.public_id });
          if (response.public_id) rollbackPublicIds.push(response.public_id);
        }
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }

      if (results.length === 0) {
        throw new ApiError(400, 'No files or valid URLs provided');
      }

      return returnMetadata ? results : results.map((r) => r.url);
    } catch (error) {
      logger.error(
        `[ImageUploadService] Batch upload failed, rolling back ${rollbackPublicIds.length} assets. Error: ${error}`,
      );
      for (const pid of rollbackPublicIds) {
        await safeDeleteFromCloudinary(pid);
      }
      throw error;
    }
  }
}
