import { uploadOnCloudinary } from '../utils/cloudinary';
import fs from 'fs';
import ApiError from '../utils/ApiError';

export class ImageUploadService {
  /**
   * Uploads multiple images (from remote URLs or local Multer files) to Cloudinary
   * and cleans up local temporary files.
   *
   * @param remoteUrls Array of strings (remote URLs)
   * @param localFiles Array of Express.Multer.File objects
   * @returns Array of uploaded secure URLs
   */
  static async processAndUploadImages(
    remoteUrls: string[] = [],
    localFiles: Express.Multer.File[] = [],
  ): Promise<string[]> {
    const urls: string[] = [];

    // Handle remote URLs
    for (const url of remoteUrls) {
      if (typeof url === 'string' && url.startsWith('http')) {
        const response = await uploadOnCloudinary(url);
        if (response) {
          urls.push(response.secure_url);
        }
      }
    }

    // Handle local file uploads
    for (const file of localFiles) {
      const cloudinaryUrl = (file as any).secure_url || file.path;
      if ((file as any).cloudinaryUploaded && cloudinaryUrl) {
        urls.push(cloudinaryUrl);
        continue;
      }

      const response = await uploadOnCloudinary(file.path);
      if (response) {
        urls.push(response.secure_url);
      }
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    if (urls.length === 0) {
      throw new ApiError(400, 'No files or valid URLs provided');
    }

    return urls;
  }
}
