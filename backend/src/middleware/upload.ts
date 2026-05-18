import multer from "multer";
import { Request, Response, NextFunction } from "express";
import cloudinary from "../config/cloudinary";
import { UploadApiResponse } from "cloudinary";
import crypto from "crypto";
import ApiError from "../utils/ApiError";
import logger from "../config/logger";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
]);

// Memory storage keeps file buffers in transient memory to verify signatures
const memoryStorage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = file.originalname.substring(file.originalname.lastIndexOf(".")).toLowerCase();
  const isAllowedExt = allowedExtensions.has(ext);
  const isAllowedMime = allowedMimeTypes.has(file.mimetype);

  if (isAllowedExt && isAllowedMime) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Only JPG, JPEG, PNG, WEBP, and AVIF image formats are allowed"));
  }
};

const multerProducts = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

const multerGallery = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

const multerCMS = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

const multerAvatar = multer({
  storage: memoryStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter,
});

/**
 * Verify Magic Numbers byte-signature of file buffer
 */
export const verifyImageSignature = (buffer: Buffer): string | null => {
  if (buffer.length < 4) return null;
  const hex = buffer.toString("hex", 0, 4).toUpperCase();
  
  // PNG: 89 50 4E 47
  if (hex === "89504E47") {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (hex.startsWith("FFD8FF")) {
    return "image/jpeg";
  }
  // WEBP: RIFF (first 4 bytes: 52 49 46 46) and WEBP (bytes 8-11: 57 45 42 50)
  if (hex === "52494646") {
    const webpHex = buffer.toString("hex", 8, 12).toUpperCase();
    if (webpHex === "57454250") {
      return "image/webp";
    }
  }
  // AVIF: FTYP (bytes 4-7: 66 74 79 70) and brand (bytes 8-11: 61 76 69 66)
  const ftyp = buffer.toString("hex", 4, 8).toUpperCase();
  if (ftyp === "66747970") {
    const brand = buffer.toString("hex", 8, 12).toUpperCase();
    if (brand === "61766966" || brand === "6D736631") {
      return "image/avif";
    }
  }

  return null;
};

/**
 * Stream file buffer directly to Cloudinary
 */
const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: string,
  originalname: string
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    // Generate secure unique public ID via SHA-256 hash containing random bytes
    const hash = crypto.createHash("sha256");
    hash.update(originalname + Date.now() + crypto.randomBytes(8).toString("hex"));
    const securePublicId = hash.digest("hex").substring(0, 16);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `siri-arts-crafts/${folder}`,
        public_id: securePublicId,
        resource_type: "image",
        transformation: [
          { fetch_format: "auto", quality: "auto" }
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error("Cloudinary upload result was empty"));
        }
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Resilient upload with progressive retry backoff
 */
const uploadBufferWithRetry = async (
  buffer: Buffer,
  folder: string,
  originalname: string,
  retries = 3,
  delayMs = 1000
): Promise<UploadApiResponse> => {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadBufferToCloudinary(buffer, folder, originalname);
    } catch (error) {
      lastError = error;
      logger.warn(`[CLOUDINARY RETRY] Attempt ${attempt}/${retries} failed for ${originalname}. Error: ${error}`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError || new Error(`Cloudinary upload failed after ${retries} attempts`);
};

/**
 * Express middleware helper bridging Multer buffers and Cloudinary streams
 */
const handleCloudinaryUploadMiddleware = (folder: string, isArray: boolean) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (isArray) {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return next();
        }

        // Safety Guard: Limit maximum files in a single request to 10
        const maxFilesCount = 10;
        if (files.length > maxFilesCount) {
          throw new ApiError(400, `Too many files uploaded in a single request. Maximum allowed is ${maxFilesCount}`);
        }

        // Safety Guard: Limit combined payload size of all files to 25MB
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        const maxTotalSize = 25 * 1024 * 1024;
        if (totalSize > maxTotalSize) {
          throw new ApiError(400, `Combined upload payload size exceeds safety ceiling of 25MB`);
        }

        const uploadedFiles: any[] = [];
        for (const file of files) {
          // Double check byte header signatures for security
          const detectedMime = verifyImageSignature(file.buffer);
          if (!detectedMime) {
            throw new ApiError(400, `Malicious or invalid file contents detected in ${file.originalname}`);
          }

          // Upload with retry handling
          const result = await uploadBufferWithRetry(file.buffer, folder, file.originalname);

          uploadedFiles.push({
            path: result.secure_url || result.url,
            secure_url: result.secure_url || result.url,
            originalname: file.originalname,
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

        // Double check byte header signatures for security
        const detectedMime = verifyImageSignature(file.buffer);
        if (!detectedMime) {
          throw new ApiError(400, `Malicious or invalid file contents detected in ${file.originalname}`);
        }

        // Upload with retry handling
        const result = await uploadBufferWithRetry(file.buffer, folder, file.originalname);

        (req as any).file = {
          path: result.secure_url || result.url,
          secure_url: result.secure_url || result.url,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        };
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Export middleware arrays ensuring strict Express request lifecycle mapping
export const uploadProducts = {
  array: (fieldName: string, maxCount?: number) => [
    multerProducts.array(fieldName, maxCount),
    handleCloudinaryUploadMiddleware("products", true),
  ],
};

export const uploadGallery = {
  array: (fieldName: string, maxCount?: number) => [
    multerGallery.array(fieldName, maxCount),
    handleCloudinaryUploadMiddleware("gallery", true),
  ],
};

export const uploadCMS = {
  single: (fieldName: string) => [
    multerCMS.single(fieldName),
    handleCloudinaryUploadMiddleware("cms", false),
  ],
};

export const uploadAvatar = {
  single: (fieldName: string) => [
    multerAvatar.single(fieldName),
    handleCloudinaryUploadMiddleware("avatars", false),
  ],
};

// Generic upload for backward compatibility
export const upload = uploadProducts;
