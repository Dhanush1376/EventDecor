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

    logger.info(`File uploaded to Cloudinary: ${response.url}`);
    return response;
  } catch (error) {
    logger.error(`Cloudinary upload failed (or circuit open): ${error}`);
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
  } catch (error) {
    logger.error(`Cloudinary delete failed (or circuit open): ${error}`);
  }
};

export const extractPublicId = (url: string): string | null => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;

    let publicIdWithExt = parts[1];

    if (publicIdWithExt.startsWith('v')) {
      const slashIndex = publicIdWithExt.indexOf('/');
      if (slashIndex !== -1) {
        publicIdWithExt = publicIdWithExt.substring(slashIndex + 1);
      }
    }

    const dotIndex = publicIdWithExt.lastIndexOf('.');
    if (dotIndex !== -1) {
      return publicIdWithExt.substring(0, dotIndex);
    }
    return publicIdWithExt;
  } catch {
    return null;
  }
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
