import multer, { StorageEngine } from "multer";
import { Request, Response, NextFunction } from "express";
import getCloudinary from "../config/cloudinary";
import type { UploadApiResponse } from "cloudinary";
import crypto from "crypto";
import { Transform } from "stream";
import ApiError from "../utils/ApiError";
import logger from "../config/logger";
import type sharp from "sharp";

/** Multer file already streamed to Cloudinary (gallery path — no in-memory buffer). */
type PreUploadedMulterFile = Express.Multer.File & {
  secure_url?: string;
  cloudinaryUploaded?: boolean;
};

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/x-icon",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".heic",
  ".heif",
  ".gif",
  ".bmp",
  ".tiff",
  ".tif",
  ".ico",
  ".mp4",
  ".webm",
  ".ogg",
  ".mov",
]);

/**
 * Sanitize filename to prevent XSS and path traversal.
 * Strips everything except alphanumerics, dots, dashes, and underscores.
 */
const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, "").replace(/\.+/g, ".");
};

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
  // GIF: 47 49 46 38 (GIF8)
  if (hex === "47494638") {
    return "image/gif";
  }
  // BMP: 42 4D (BM)
  if (hex.startsWith("424D")) {
    return "image/bmp";
  }
  // TIFF: 49 49 2A 00 or 4D 4D 00 2A
  if (hex === "49492A00" || hex === "4D4D002A") {
    return "image/tiff";
  }
  // ICO: 00 00 01 00
  if (hex === "00000100") {
    return "image/x-icon";
  }
  // WebM: 1A 45 DF A3 (EBML)
  if (hex === "1A45DFA3") {
    return "video/webm";
  }
  // WEBP: RIFF (first 4 bytes: 52 49 46 46) and WEBP (bytes 8-11: 57 45 42 50)
  if (hex === "52494646") {
    const webpHex = buffer.toString("hex", 8, 12).toUpperCase();
    if (webpHex === "57454250") {
      return "image/webp";
    }
  }
  // AVIF / HEIC / HEIF / MP4 / MOV: FTYP (bytes 4-7: 66 74 79 70)
  const ftyp = buffer.toString("hex", 4, 8).toUpperCase();
  if (ftyp === "66747970") {
    const brand = buffer.toString("hex", 8, 12).toUpperCase();
    if (brand === "61766966" || brand === "6D736631") {
      return "image/avif";
    }
    const heicBrands = new Set([
      "68656963", // heic
      "68656978", // heix
      "68657663", // hevc
      "68657678", // hevx
      "6D696631", // mif1
      "6D736631", // msf1
      "68656966", // heif
    ]);
    if (heicBrands.has(brand)) {
      return "image/heic";
    }
    const videoBrands = new Set([
      "6D703431", // mp41
      "6D703432", // mp42
      "69736F6D", // isom
      "69736F32", // iso2
      "6D703437", // mp47
      "61766331", // avc1
      "71742020", // qt (QuickTime MOV)
    ]);
    if (brand.startsWith("6D7034") || videoBrands.has(brand)) {
      return "video/mp4";
    }
  }
  return null;
};

/**
 * Intercepts the first 12 bytes of a stream to verify magic bytes before piping to Cloudinary.
 * Prevents malware/ZIP bombs from bypassing stream storage.
 */
class SignatureValidationStream extends Transform {
  private buffered = Buffer.alloc(0);
  private checked = false;
  private filename: string;

  constructor(filename: string) {
    super();
    this.filename = filename;
  }

  _transform(chunk: Buffer, encoding: string, callback: Function) {
    if (this.checked) {
      this.push(chunk);
      return callback();
    }

    this.buffered = Buffer.concat([this.buffered, chunk]);

    // 12 bytes is enough to check all signatures (WEBP, MP4, etc.)
    if (this.buffered.length >= 12) {
      this.checked = true;
      const mime = verifyImageSignature(this.buffered);
      if (!mime) {
        logger.warn(`[SECURITY] Blocked malicious stream upload for: ${this.filename}`);
        return callback(new ApiError(400, "Malicious or invalid file contents detected in stream."));
      }
      this.push(this.buffered);
      this.buffered = Buffer.alloc(0);
    } else {
      callback();
    }
  }

  _flush(callback: Function) {
    if (!this.checked && this.buffered.length > 0) {
      const mime = verifyImageSignature(this.buffered);
      if (!mime) {
        logger.warn(`[SECURITY] Blocked malicious small stream upload for: ${this.filename}`);
        return callback(new ApiError(400, "Malicious or invalid file contents detected in stream."));
      }
      this.push(this.buffered);
    }
    callback();
  }
}

// Memory storage keeps file buffers in transient memory to verify signatures
const memoryStorage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = file.originalname.substring(file.originalname.lastIndexOf(".")).toLowerCase();
  const isAllowedExt = allowedExtensions.has(ext);
  const isAllowedMime = allowedMimeTypes.has(file.mimetype) || file.mimetype === "application/octet-stream"; // iOS/Safari sometimes sends HEIC/HEIF as octet-stream

  if (isAllowedExt && isAllowedMime) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Invalid file format. Supported formats: JPG, JPEG, PNG, WEBP, AVIF, HEIC, HEIF, GIF, BMP, TIFF, ICO for images; MP4, WEBM, OGG, MOV for videos."));
  }
};

const multerProducts = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

/**
 * Stream multipart uploads directly to Cloudinary (no full-file RAM buffer).
 * C-04: avoids 50 MB heap spikes per concurrent gallery/video upload on small instances.
 */
const createCloudinaryStreamStorage = (folder: string): StorageEngine => ({
  _handleFile(req, file, cb) {
    const sanitizedName = sanitizeFilename(file.originalname);
    const hash = crypto.createHash("sha256");
    hash.update(sanitizedName + Date.now() + crypto.randomBytes(8).toString("hex"));
    const securePublicId = hash.digest("hex").substring(0, 16);
    const isVideo = [".mp4", ".webm", ".mov", ".ogg"].some((ext) =>
      sanitizedName.toLowerCase().endsWith(ext)
    );

    const uploadOptions: Record<string, unknown> = {
      folder: `siri-arts-crafts/${folder}`,
      public_id: securePublicId,
      resource_type: isVideo ? "video" : "image",
    };

    if (!isVideo) {
      uploadOptions.transformation = [{ fetch_format: "auto", quality: "auto" }];
      uploadOptions.format = "webp";
    }

    const cloudinary = getCloudinary();
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error: any, result: any) => {
        if (error) {
          cb(error);
          return;
        }
        if (!result) {
          cb(new Error("Cloudinary upload result was empty"));
          return;
        }
        
        let finalOriginalName = sanitizedName;
        let finalMimeType = file.mimetype;
        if (!isVideo) {
          finalMimeType = "image/webp";
          const lastDot = sanitizedName.lastIndexOf(".");
          finalOriginalName = (lastDot !== -1 ? sanitizedName.substring(0, lastDot) : sanitizedName) + ".webp";
        }

        const uploaded: PreUploadedMulterFile = {
          fieldname: file.fieldname,
          originalname: finalOriginalName,
          encoding: file.encoding,
          mimetype: finalMimeType,
          destination: "",
          filename: result.public_id,
          path: result.secure_url || result.url,
          size: result.bytes,
          stream: file.stream,
          buffer: Buffer.alloc(0),
          secure_url: result.secure_url || result.url,
          cloudinaryUploaded: true,
        };
        cb(null, uploaded);
      }
    );

    const signatureValidator = new SignatureValidationStream(sanitizedName);
    file.stream.on("error", (streamErr: any) => cb(streamErr));
    signatureValidator.on("error", (streamErr: any) => cb(streamErr));
    uploadStream.on("error", (streamErr: any) => cb(streamErr));
    
    if (!isVideo) {
      const sharp = require("sharp");
      const transformer = sharp()
        .resize({
          width: 2048,
          height: 2048,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 });

      transformer.on("error", (streamErr: any) => cb(streamErr));
      file.stream.pipe(signatureValidator).pipe(transformer).pipe(uploadStream);
    } else {
      file.stream.pipe(signatureValidator).pipe(uploadStream);
    }
  },
  _removeFile(_req, _file, cb) {
    cb(null);
  },
});

// Gallery/video: stream to Cloudinary; 50MB cap applies to streamed bytes, not heap allocation
const multerGallery = multer({
  storage: createCloudinaryStreamStorage("gallery"),
  limits: { fileSize: 50 * 1024 * 1024 },
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

    const isVideo = [".mp4", ".webm", ".mov", ".ogg"].some(ext => originalname.toLowerCase().endsWith(ext));

    const uploadOptions: any = {
      folder: `siri-arts-crafts/${folder}`,
      public_id: securePublicId,
      resource_type: isVideo ? "video" : "image",
    };

    if (!isVideo) {
      uploadOptions.transformation = [
        { fetch_format: "auto", quality: "auto" }
      ];
    }

    const cloudinary = getCloudinary();
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error: any, result: any) => {
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

const optimizeMemoryFileIfNeeded = async (file: Express.Multer.File): Promise<void> => {
  if (!file.buffer?.length) return;
  const mime = verifyImageSignature(file.buffer);
  if (mime && mime.startsWith("image/") && mime !== "image/gif" && mime !== "image/x-icon" && mime !== "image/svg+xml") {
    try {
      const sharp = require("sharp");
      const sharpInstance = sharp(file.buffer);
      const metadata = await sharpInstance.metadata();

      let pipeline = sharpInstance;
      if (metadata.width && metadata.height && (metadata.width > 2048 || metadata.height > 2048)) {
        pipeline = pipeline.resize({
          width: 2048,
          height: 2048,
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      file.buffer = await pipeline
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      file.mimetype = "image/webp";
      const lastDot = file.originalname.lastIndexOf(".");
      file.originalname = (lastDot !== -1 ? file.originalname.substring(0, lastDot) : file.originalname) + ".webp";
      file.size = file.buffer.length;
    } catch (err) {
      logger.error(`[IMAGE COMPRESSION] Failed to optimize upload buffer for ${file.originalname}: ${err}`);
    }
  }
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

        // Safety Guard: Limit combined payload size of all files to 100MB
        const totalSize = files.reduce((acc, file) => acc + file.size, 0);
        const maxTotalSize = 100 * 1024 * 1024;
        if (totalSize > maxTotalSize) {
          throw new ApiError(400, `Combined upload payload size exceeds safety ceiling of 100MB`);
        }

        const uploadedFiles: any[] = [];
        for (const file of files) {
          const streamed = file as PreUploadedMulterFile;
          
          if (streamed.cloudinaryUploaded && streamed.path) {
            uploadedFiles.push({
              path: streamed.path,
              secure_url: streamed.secure_url || streamed.path,
              originalname: sanitizeFilename(file.originalname),
              mimetype: file.mimetype,
              size: file.size,
            });
            continue;
          }

          if (!file.buffer?.length) {
            throw new ApiError(400, `Upload failed for ${file.originalname}`);
          }

          const detectedMime = verifyImageSignature(file.buffer);
          if (!detectedMime) {
            throw new ApiError(400, `Malicious or invalid file contents detected in ${file.originalname}`);
          }

          // Optimize image buffer
          await optimizeMemoryFileIfNeeded(file);
          const sanitizedOriginalName = sanitizeFilename(file.originalname);

          const result = await uploadBufferWithRetry(file.buffer, folder, sanitizedOriginalName);

          uploadedFiles.push({
            path: result.secure_url || result.url,
            secure_url: result.secure_url || result.url,
            originalname: sanitizedOriginalName,
            mimetype: file.mimetype,
            size: file.size,
          });
        }

        req.files = uploadedFiles as any;
      } else {
        const file = req.file as PreUploadedMulterFile;
        if (!file) {
          return next();
        }

        if (file.cloudinaryUploaded && file.path) {
          (req as any).file = {
            path: file.path,
            secure_url: file.secure_url || file.path,
            originalname: sanitizeFilename(file.originalname),
            mimetype: file.mimetype,
            size: file.size,
          };
          return next();
        }

        if (!file.buffer?.length) {
          throw new ApiError(400, `Upload failed for ${file.originalname}`);
        }

        const detectedMime = verifyImageSignature(file.buffer);
        if (!detectedMime) {
          throw new ApiError(400, `Malicious or invalid file contents detected in ${file.originalname}`);
        }

        // Optimize image buffer
        await optimizeMemoryFileIfNeeded(file);
        const sanitizedOriginalName = sanitizeFilename(file.originalname);

        const result = await uploadBufferWithRetry(file.buffer, folder, sanitizedOriginalName);

        (req as any).file = {
          path: result.secure_url || result.url,
          secure_url: result.secure_url || result.url,
          originalname: sanitizedOriginalName,
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
