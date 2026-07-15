import multer from 'multer';
import { verifyImageSignature } from '../utils/security/fileSignature';
import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';
import { MediaService } from '../services/media/MediaService';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
]);

const videoMimeTypes = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);

const createFileFilter =
  (allowVideo: boolean) => (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const isVideo = videoMimeTypes.has(file.mimetype);
    if (allowedMimeTypes.has(file.mimetype) && (allowVideo || !isVideo)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Invalid file format.'));
    }
  };

const memoryStorage = multer.memoryStorage();

const multerProducts = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: createFileFilter(false),
});
const multerGallery = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: createFileFilter(true),
});
const multerCMS = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: createFileFilter(false),
});
const multerAvatar = multer({
  storage: memoryStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: createFileFilter(false),
});
const multerReviews = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: createFileFilter(false),
});

const activeUploads = new Map<string, number>();
const MAX_CONCURRENT_UPLOADS = 5;

const handleStorageUpload = (folder: string, isArray: boolean, allowVideo: boolean = false) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?._id?.toString() || req.ip || 'anonymous';
    const currentUploads = activeUploads.get(userId) || 0;
    if (currentUploads >= MAX_CONCURRENT_UPLOADS) {
      return next(new ApiError(429, 'Too many concurrent uploads.'));
    }
    activeUploads.set(userId, currentUploads + 1);

    try {
      if (isArray) {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) return next();

        const uploadedFiles = [];
        for (const file of files) {
          const detectedMime = verifyImageSignature(file.buffer);
          if (!detectedMime)
            throw new ApiError(400, `Malicious or invalid file: ${file.originalname}`);

          const isVideo = videoMimeTypes.has(detectedMime);
          if (!allowVideo && isVideo)
            throw new ApiError(400, `Video not allowed for ${file.originalname}`);

          const result = await MediaService.uploadSingle(file.buffer, detectedMime, {
            module: folder,
            filename: file.originalname,
            uploadedBy: userId !== 'anonymous' ? userId : undefined,
          });

          uploadedFiles.push({
            path: result.secureUrl,
            secure_url: result.secureUrl,
            thumbnail_url: result.thumbnails?.[0]?.url || null,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: result.bytes,
            mediaId: result._id,
            publicId: result.publicId,
            width: result.width,
            height: result.height,
            format: result.format,
            uploadedAt: result.createdAt,
          });
        }
        req.files = uploadedFiles as any;
      } else {
        const file = req.file as Express.Multer.File;
        if (!file) return next();

        const detectedMime = verifyImageSignature(file.buffer);
        if (!detectedMime)
          throw new ApiError(400, `Malicious or invalid file: ${file.originalname}`);

        const isVideo = videoMimeTypes.has(detectedMime);
        if (!allowVideo && isVideo)
          throw new ApiError(400, `Video not allowed for ${file.originalname}`);

        const result = await MediaService.uploadSingle(file.buffer, detectedMime, {
          module: folder,
          filename: file.originalname,
          uploadedBy: userId !== 'anonymous' ? userId : undefined,
        });

        (req as any).file = {
          path: result.secureUrl,
          secure_url: result.secureUrl,
          thumbnail_url: result.thumbnails?.[0]?.url || null,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: result.bytes,
          mediaId: result._id,
          publicId: result.publicId,
          width: result.width,
          height: result.height,
          format: result.format,
          uploadedAt: result.createdAt,
        };
      }

      next();
    } catch (error) {
      next(error);
    } finally {
      const count = activeUploads.get(userId) || 1;
      if (count <= 1) activeUploads.delete(userId);
      else activeUploads.set(userId, count - 1);
    }
  };
};

export const uploadProducts = {
  array: (fieldName: string, maxCount?: number) => [
    multerProducts.array(fieldName, maxCount),
    handleStorageUpload('products', true, false),
  ],
};

export const uploadGallery = {
  array: (fieldName: string, maxCount?: number) => [
    multerGallery.array(fieldName, maxCount),
    handleStorageUpload('gallery', true, true),
  ],
};

export const uploadCMS = {
  single: (fieldName: string) => [
    multerCMS.single(fieldName),
    handleStorageUpload('cms', false, false),
  ],
};

export const uploadAvatar = {
  single: (fieldName: string) => [
    multerAvatar.single(fieldName),
    handleStorageUpload('avatars', false, false),
  ],
};

export const uploadReviews = {
  array: (fieldName: string, maxCount?: number) => [
    multerReviews.array(fieldName, maxCount),
    handleStorageUpload('reviews', true, false),
  ],
};

export const upload = uploadProducts;

export { verifyImageSignature };
