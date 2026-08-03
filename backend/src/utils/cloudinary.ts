import getCloudinary from '../config/cloudinary';
import logger from '../config/logger';
import { cloudinaryCircuitBreaker } from './CircuitBreaker';

export const uploadOnCloudinary = async (localFilePath: string) => {
  try {
    if (!localFilePath) return null;
    const cloudinary = getCloudinary();

    const response = await cloudinaryCircuitBreaker.execute(async () => {
      return await cloudinary.uploader.upload(localFilePath, {
        resource_type: 'auto',
        folder: 'siri-arts-crafts',
        transformation: [{ fetch_format: 'auto', quality: 'auto' }],
      });
    });

    logger.info(`[Cloudinary] Uploaded asset: ${response.public_id} (${response.secure_url})`);
    return response;
  } catch (error) {
    logger.error(`[Cloudinary] Upload failed (or circuit open): ${error}`);
    return null;
  }
};

/**
 * Generate an optimized Cloudinary URL with dynamic transformations
 * Supports AVIF/WebP, automatic quality, and responsive resizing
 */
export const getOptimizedUrl = (url: string, width?: number, height?: number) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  let transformations = 'f_auto,q_auto';
  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height}`;
  if (width && height) transformations += ',c_fill';

  return `${parts[0]}/upload/${transformations}/${parts[1]}`;
};

/**
 * Generate a tiny, blurred placeholder for lazy loading
 */
export const getBlurredPlaceholder = (url: string) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  return `${parts[0]}/upload/f_auto,q_1,w_20,e_blur:1000/${parts[1]}`;
};

export const deleteFromCloudinary = async (publicId: string) => {
  try {
    const cloudinary = getCloudinary();
    await cloudinaryCircuitBreaker.execute(async () => {
      await cloudinary.uploader.destroy(publicId);
    });
    logger.info(`[Cloudinary] Deleted asset: ${publicId}`);
  } catch (error: any) {
    logger.error(`[Cloudinary] Cleanup failed: ${publicId} — ${error.message || error}`);
  }
};

export const safeDeleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const cloudinary = getCloudinary();
    const result = await cloudinaryCircuitBreaker.execute(async () => {
      return await cloudinary.uploader.destroy(publicId);
    });

    if (result.result === 'ok' || result.result === 'not found') {
      logger.info(`[Cloudinary] Deleted asset: ${publicId} (status: ${result.result})`);
      return true;
    }
    logger.warn(`[Cloudinary] Delete returned unexpected status for ${publicId}: ${result.result}`);
    return false;
  } catch (error: any) {
    logger.error(`[Cloudinary] Cleanup failed: ${publicId} — ${error.message || error}`);
    return false;
  }
};

export const assetExistsInCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const cloudinary = getCloudinary();
    const result = await cloudinary.api.resource(publicId);
    return !!result;
  } catch (error: any) {
    if (error?.http_code === 404) return false;
    throw error;
  }
};

/**
 * Robust extraction of Cloudinary public_id from a URL.
 * Handles transformations and version segments safely.
 */
export const extractPublicId = (url: string): string | null => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;

    let publicIdWithExt = parts.slice(1).join('/upload/'); // Join back if public_id contains /upload/

    const segments = publicIdWithExt.split('/');

    // 1. Remove transformations segment if present (contains comma or common prefixes)
    if (segments.length > 1 && (segments[0].includes(',') || /^[whcfq]_/.test(segments[0]))) {
      segments.shift();
    }

    // 2. Remove version segment if present (e.g. v1234567890)
    if (segments.length > 1 && /^v\d+$/.test(segments[0])) {
      segments.shift();
    }

    publicIdWithExt = segments.join('/');

    // 3. Remove extension
    const dotIndex = publicIdWithExt.lastIndexOf('.');
    if (dotIndex !== -1) {
      return publicIdWithExt.substring(0, dotIndex);
    }
    return publicIdWithExt;
  } catch {
    return null;
  }
};

/**
 * Resolves the true public_id for a given URL by checking the Media collection first,
 * and falling back to robust string parsing if not found.
 */
export const resolvePublicId = async (url: string): Promise<string | null> => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const mongoose = require('mongoose');
    // Lazy load to prevent circular dependencies
    const Media = mongoose.models.Media || require('../models/Media').default;

    const media = await Media.findOne({ secureUrl: url }).lean();
    if (media && media.publicId) {
      return media.publicId;
    }
  } catch (err: any) {
    logger.warn(
      `[Cloudinary] Failed to resolve publicId from DB for ${url}, falling back to extraction. Error: ${err.message}`,
    );
  }

  return extractPublicId(url);
};

export const extractAllCloudinaryUrls = (obj: any): string[] => {
  const urls: string[] = [];
  const traverse = (item: any) => {
    if (!item) return;
    if (typeof item === 'string') {
      if (item.includes('cloudinary.com')) {
        urls.push(item);
      }
    } else if (Array.isArray(item)) {
      item.forEach(traverse);
    } else if (typeof item === 'object') {
      Object.values(item).forEach(traverse);
    }
  };
  traverse(obj);
  return urls;
};

export default getCloudinary;
