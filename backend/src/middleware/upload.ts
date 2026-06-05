import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import getCloudinary from '../config/cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import crypto from 'crypto';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import fs from 'fs';
import os from 'os';

/** Multer file already streamed to Cloudinary (gallery path — no in-memory buffer). */
type PreUploadedMulterFile = Express.Multer.File & {
  secure_url?: string;
  cloudinaryUploaded?: boolean;
};

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
]);

const allowedExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.heic',
  '.heif',
  '.gif',
  '.bmp',
  '.tiff',
  '.tif',
  '.ico',
  '.mp4',
  '.webm',
  '.ogg',
  '.mov',
]);

const videoMimeTypes = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);
const videoExtensions = new Set(['.mp4', '.webm', '.ogg', '.mov']);

/**
 * Sanitize filename to prevent XSS and path traversal.
 * Strips everything except alphanumerics, dots, dashes, and underscores.
 */
const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '').replace(/\.+/g, '.');
};

export const verifyImageSignature = (buffer: Buffer): string | null => {
  if (buffer.length < 4) return null;
  const hex = buffer.toString('hex', 0, 4).toUpperCase();

  // PNG: 89 50 4E 47
  if (hex === '89504E47') {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (hex.startsWith('FFD8FF')) {
    return 'image/jpeg';
  }
  // GIF: 47 49 46 38 (GIF8)
  if (hex === '47494638') {
    return 'image/gif';
  }
  // BMP: 42 4D (BM)
  if (hex.startsWith('424D')) {
    return 'image/bmp';
  }
  // TIFF: 49 49 2A 00 or 4D 4D 00 2A
  if (hex === '49492A00' || hex === '4D4D002A') {
    return 'image/tiff';
  }
  // ICO: 00 00 01 00
  if (hex === '00000100') {
    return 'image/x-icon';
  }
  // WebM: 1A 45 DF A3 (EBML)
  if (hex === '1A45DFA3') {
    return 'video/webm';
  }
  // OGG: 4F 67 67 53 (OggS)
  if (hex === '4F676753') {
    return 'video/ogg';
  }
  // WEBP: RIFF (first 4 bytes: 52 49 46 46) and WEBP (bytes 8-11: 57 45 42 50)
  if (hex === '52494646') {
    const webpHex = buffer.toString('hex', 8, 12).toUpperCase();
    if (webpHex === '57454250') {
      return 'image/webp';
    }
  }
  // AVIF / HEIC / HEIF / MP4 / MOV: FTYP (bytes 4-7: 66 74 79 70)
  const ftyp = buffer.toString('hex', 4, 8).toUpperCase();
  if (ftyp === '66747970') {
    const brand = buffer.toString('hex', 8, 12).toUpperCase();
    if (brand === '61766966' || brand === '6D736631') {
      return 'image/avif';
    }
    const heicBrands = new Set([
      '68656963', // heic
      '68656978', // heix
      '68657663', // hevc
      '68657678', // hevx
      '6D696631', // mif1
      '6D736631', // msf1
      '68656966', // heif
    ]);
    if (heicBrands.has(brand)) {
      return 'image/heic';
    }
    const videoBrands = new Set([
      '6D703431', // mp41
      '6D703432', // mp42
      '69736F6D', // isom
      '69736F32', // iso2
      '6D703437', // mp47
      '61766331', // avc1
      '71742020', // qt (QuickTime MOV)
    ]);
    if (brand.startsWith('6D7034') || videoBrands.has(brand)) {
      return 'video/mp4';
    }
  }
  return null;
};

const createFileFilter =
  (allowVideo: boolean) => (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
    const isVideo = videoMimeTypes.has(file.mimetype) || videoExtensions.has(ext);
    const isAllowedExt = allowedExtensions.has(ext) && (allowVideo || !videoExtensions.has(ext));
    const isAllowedMime =
      (allowedMimeTypes.has(file.mimetype) && (allowVideo || !isVideo)) ||
      file.mimetype === 'application/octet-stream'; // iOS/Safari sometimes sends HEIC/HEIF as octet-stream

    if (isAllowedExt && isAllowedMime) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          400,
          'Invalid file format. Supported formats: JPG, JPEG, PNG, WEBP, AVIF, HEIC, HEIF, GIF, BMP, TIFF, ICO for images; MP4, WEBM, OGG, MOV for videos.',
        ),
      );
    }
  };

const imageOnlyFileFilter = createFileFilter(false);
const fileFilter = createFileFilter(true);

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  },
});

const multerProducts = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit before compression
  fileFilter: imageOnlyFileFilter,
});

// Gallery/video limits
const multerGallery = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit before compression
  fileFilter,
});

const multerCMS = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit before compression
  fileFilter: imageOnlyFileFilter,
});

const multerAvatar = multer({
  storage: diskStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: imageOnlyFileFilter,
});

/**
 * Stream file buffer directly to Cloudinary
 */
const readMagicBytes = async (filePath: string): Promise<Buffer> => {
  const fd = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    await fd.read(buffer, 0, 12, 0);
    return buffer;
  } finally {
    await fd.close();
  }
};

/**
 * Upload file directly to Cloudinary from disk
 */
const uploadFileToCloudinary = (
  filePath: string,
  folder: string,
  originalname: string,
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    // Generate secure unique public ID via SHA-256 hash containing random bytes
    const hash = crypto.createHash('sha256');
    hash.update(originalname + Date.now() + crypto.randomBytes(8).toString('hex'));
    const securePublicId = hash.digest('hex').substring(0, 16);

    const isVideo = ['.mp4', '.webm', '.mov', '.ogg'].some((ext) =>
      originalname.toLowerCase().endsWith(ext),
    );

    const uploadOptions: any = {
      folder: `siri-arts-crafts/${folder}`,
      public_id: securePublicId,
      resource_type: isVideo ? 'video' : 'image',
    };

    if (!isVideo) {
      uploadOptions.transformation = [{ fetch_format: 'auto', quality: 'auto' }];
      uploadOptions.eager = [{ width: 400, crop: 'scale', fetch_format: 'auto', quality: 'auto' }];
    }

    const cloudinary = getCloudinary();
    cloudinary.uploader.upload(filePath, uploadOptions, (error: any, result: any) => {
      if (error) {
        reject(error);
      } else if (result) {
        resolve(result);
      } else {
        reject(new Error('Cloudinary upload result was empty'));
      }
    });
  });
};

const activeUploads = new Map<string, number>();
const MAX_CONCURRENT_UPLOADS = 3;

/**
 * Resilient upload with progressive retry backoff
 */
const uploadFileWithRetry = async (
  filePath: string,
  folder: string,
  originalname: string,
  retries = 3,
  delayMs = 1000,
): Promise<UploadApiResponse> => {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadFileToCloudinary(filePath, folder, originalname);
    } catch (error) {
      lastError = error;
      logger.warn(
        `[CLOUDINARY RETRY] Attempt ${attempt}/${retries} failed for ${originalname}. Error: ${error}`,
      );
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError || new Error(`Cloudinary upload failed after ${retries} attempts`);
};

const optimizeDiskFileIfNeeded = async (file: Express.Multer.File): Promise<void> => {
  if (!file.path) return;
  const magicBytes = await readMagicBytes(file.path);
  const mime = verifyImageSignature(magicBytes);
  if (
    mime &&
    mime.startsWith('image/') &&
    mime !== 'image/gif' &&
    mime !== 'image/x-icon' &&
    mime !== 'image/svg+xml'
  ) {
    try {
      const sharp = require('sharp');
      const sharpInstance = sharp(file.path);
      const metadata = await sharpInstance.metadata();

      let pipeline = sharpInstance;
      if (metadata.width && metadata.height && (metadata.width > 2048 || metadata.height > 2048)) {
        pipeline = pipeline.resize({
          width: 2048,
          height: 2048,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const tempOutputPath = `${file.path}_optimized.webp`;
      await pipeline.webp({ quality: 80, effort: 4 }).toFile(tempOutputPath);

      // Replace original file with optimized one
      await fs.promises.unlink(file.path);
      await fs.promises.rename(tempOutputPath, file.path);

      file.mimetype = 'image/webp';
      const lastDot = file.originalname.lastIndexOf('.');
      file.originalname =
        (lastDot !== -1 ? file.originalname.substring(0, lastDot) : file.originalname) + '.webp';
      const stats = await fs.promises.stat(file.path);
      file.size = stats.size;
    } catch (err) {
      logger.error(
        `[IMAGE COMPRESSION] Failed to optimize upload file for ${file.originalname}: ${err}`,
      );
    }
  }
};

const cleanupTempFiles = async (files: Express.Multer.File[]) => {
  for (const file of files) {
    if (file.path) {
      try {
        await fs.promises.unlink(file.path);
      } catch (err) {
        // ignore if already deleted
      }
    }
  }
};

/**
 * Express middleware helper bridging Multer and Cloudinary
 */
const handleCloudinaryUploadMiddleware = (
  folder: string,
  isArray: boolean,
  allowVideo: boolean = false,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let filesToCleanup: Express.Multer.File[] = [];

    // Concurrent upload limiting
    const userId = (req as any).user?._id?.toString() || req.ip || 'anonymous';
    const currentUploads = activeUploads.get(userId) || 0;
    if (currentUploads >= MAX_CONCURRENT_UPLOADS) {
      return next(
        new ApiError(
          429,
          'Too many concurrent uploads. Please wait for current uploads to finish.',
        ),
      );
    }
    activeUploads.set(userId, currentUploads + 1);

    try {
      if (isArray) {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return next();
        }
        filesToCleanup = [...files];

        // Safety Guard: Limit maximum files in a single request to 10
        const maxFilesCount = 10;
        if (files.length > maxFilesCount) {
          throw new ApiError(
            400,
            `Too many files uploaded in a single request. Maximum allowed is ${maxFilesCount}`,
          );
        }

        // Safety Guard: Limit combined payload size of all files to 100MB
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        const maxTotalSize = 100 * 1024 * 1024;
        if (totalSize > maxTotalSize) {
          throw new ApiError(400, `Combined upload payload size exceeds safety ceiling of 100MB`);
        }

        const uploadedFiles: any[] = [];
        for (const file of files) {
          if (!file.path) {
            throw new ApiError(400, `Upload failed for ${file.originalname}`);
          }

          const magicBytes = await readMagicBytes(file.path);
          const detectedMime = verifyImageSignature(magicBytes);

          if (!detectedMime) {
            throw new ApiError(
              400,
              `Malicious or invalid file contents detected in ${file.originalname}`,
            );
          }

          // Strict validation: Reject video files on image-only endpoints, even if octet-stream was allowed by Multer
          if (!allowVideo && videoMimeTypes.has(detectedMime)) {
            throw new ApiError(
              400,
              `Video files are not allowed for this endpoint (${file.originalname})`,
            );
          }

          // Optimize image on disk
          await optimizeDiskFileIfNeeded(file);
          const sanitizedOriginalName = sanitizeFilename(file.originalname);

          const result = await uploadFileWithRetry(file.path, folder, sanitizedOriginalName);

          uploadedFiles.push({
            path: result.secure_url || result.url,
            secure_url: result.secure_url || result.url,
            thumbnail_url: result.eager?.[0]?.secure_url || null,
            originalname: sanitizedOriginalName,
            mimetype: file.mimetype,
            size: file.size,
          });
        }

        req.files = uploadedFiles as any;
      } else {
        const file = req.file as Express.Multer.File;
        if (!file) {
          return next();
        }
        filesToCleanup = [file];

        if (!file.path) {
          throw new ApiError(400, `Upload failed for ${file.originalname}`);
        }

        const magicBytes = await readMagicBytes(file.path);
        const detectedMime = verifyImageSignature(magicBytes);

        if (!detectedMime) {
          throw new ApiError(
            400,
            `Malicious or invalid file contents detected in ${file.originalname}`,
          );
        }

        // Strict validation: Reject video files on image-only endpoints, even if octet-stream was allowed by Multer
        if (!allowVideo && videoMimeTypes.has(detectedMime)) {
          throw new ApiError(
            400,
            `Video files are not allowed for this endpoint (${file.originalname})`,
          );
        }

        // Optimize image on disk
        await optimizeDiskFileIfNeeded(file);
        const sanitizedOriginalName = sanitizeFilename(file.originalname);

        const result = await uploadFileWithRetry(file.path, folder, sanitizedOriginalName);

        (req as any).file = {
          path: result.secure_url || result.url,
          secure_url: result.secure_url || result.url,
          thumbnail_url: result.eager?.[0]?.secure_url || null,
          originalname: sanitizedOriginalName,
          mimetype: file.mimetype,
          size: file.size,
        };
      }

      await cleanupTempFiles(filesToCleanup);

      const count = activeUploads.get(userId) || 1;
      if (count <= 1) activeUploads.delete(userId);
      else activeUploads.set(userId, count - 1);

      next();
    } catch (error) {
      await cleanupTempFiles(filesToCleanup);

      const count = activeUploads.get(userId) || 1;
      if (count <= 1) activeUploads.delete(userId);
      else activeUploads.set(userId, count - 1);

      next(error);
    }
  };
};

// Export middleware arrays ensuring strict Express request lifecycle mapping
export const uploadProducts = {
  array: (fieldName: string, maxCount?: number) => [
    multerProducts.array(fieldName, maxCount),
    handleCloudinaryUploadMiddleware('products', true, false),
  ],
};

export const uploadGallery = {
  array: (fieldName: string, maxCount?: number) => [
    multerGallery.array(fieldName, maxCount),
    handleCloudinaryUploadMiddleware('gallery', true, true),
  ],
};

export const uploadCMS = {
  single: (fieldName: string) => [
    multerCMS.single(fieldName),
    handleCloudinaryUploadMiddleware('cms', false, false),
  ],
};

export const uploadAvatar = {
  single: (fieldName: string) => [
    multerAvatar.single(fieldName),
    handleCloudinaryUploadMiddleware('avatars', false, false),
  ],
};

// Generic upload for backward compatibility
export const upload = uploadProducts;
