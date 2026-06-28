import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import logger from '../../config/logger';
import ApiError from '../../utils/ApiError';

// Define paths relative to src/controllers
const FRONTEND_PUBLIC_DIR = path.resolve(__dirname, '../../../../frontend/public');
const CACHE_DIR = path.resolve(__dirname, '../../cache');

// Ensure Cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (err) {
  logger.error(`[MEDIA CACHE INIT ERROR] Failed to create cache directory: ${err}`);
}

/**
 * Controller to dynamically optimize, crop, compress, and transcode local images.
 * Employs file-based caching for maximum throughput and low RAM footprint.
 */
export const optimizeImageController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      throw new ApiError(400, 'URL query parameter is required.');
    }

    // 1. Resolve local path or fetch remote buffer
    let inputForSharp: string | Buffer;
    const isRemote = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');

    if (isRemote) {
      try {
        const abortController = new AbortController();
        req.on('close', () => abortController.abort());

        const response = await fetch(imageUrl, { signal: abortController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        inputForSharp = Buffer.from(arrayBuffer);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        throw new ApiError(404, `Failed to fetch remote image: ${imageUrl} - ${err.message}`);
      }
    } else {
      if (imageUrl.includes('..') || imageUrl.includes('%2e%2e') || imageUrl.includes('%2E%2E')) {
        throw new ApiError(403, 'Access denied: Directory traversal detected.');
      }

      const normalizedUrl = path.normalize(imageUrl);
      const relativePath =
        normalizedUrl.startsWith('/') || normalizedUrl.startsWith('\\')
          ? normalizedUrl.substring(1)
          : normalizedUrl;

      const sourcePath = path.join(FRONTEND_PUBLIC_DIR, relativePath);

      if (!sourcePath.startsWith(FRONTEND_PUBLIC_DIR)) {
        throw new ApiError(403, 'Access denied: file location is outside allowed path.');
      }

      if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
        if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URLS) {
          try {
            const frontendUrl = process.env.FRONTEND_URLS.split(',')[0].replace(/\/$/, '');
            const fullUrl = `${frontendUrl}/${relativePath}`;
            const abortController = new AbortController();
            req.on('close', () => abortController.abort());
            const response = await fetch(fullUrl, { signal: abortController.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            inputForSharp = Buffer.from(arrayBuffer);
          } catch (err: any) {
            if (err.name === 'AbortError') return;
            throw new ApiError(404, `Source image not found locally or remotely: ${imageUrl}`);
          }
        } else {
          throw new ApiError(404, `Source image not found: ${imageUrl}`);
        }
      } else {
        inputForSharp = sourcePath;
      }
    }

    // 2. Parse query parameters
    const w = req.query.w ? parseInt(req.query.w as string, 10) : undefined;
    const h = req.query.h ? parseInt(req.query.h as string, 10) : undefined;
    const q = req.query.q ? parseInt(req.query.q as string, 10) : 80;

    // Auto-detect format based on Accept header if not explicitly provided
    let fmt = req.query.fmt as string;
    if (!fmt) {
      const accept = req.headers.accept || '';
      if (accept.includes('image/avif')) {
        fmt = 'avif';
      } else if (accept.includes('image/webp')) {
        fmt = 'webp';
      } else {
        // Fallback to jpeg
        fmt = 'jpeg';
      }
    }

    // Sanitize parameters
    if (w !== undefined && (isNaN(w) || w <= 0 || w > 3840)) {
      throw new ApiError(400, 'Invalid width parameter.');
    }
    if (h !== undefined && (isNaN(h) || h <= 0 || h > 3840)) {
      throw new ApiError(400, 'Invalid height parameter.');
    }
    if (isNaN(q) || q < 1 || q > 100) {
      throw new ApiError(400, 'Invalid quality parameter.');
    }
    if (!['webp', 'avif', 'jpeg', 'jpg', 'png'].includes(fmt)) {
      throw new ApiError(400, 'Unsupported format requested.');
    }

    // Normalize jpeg format name
    const format: any = fmt === 'jpg' ? 'jpeg' : fmt;

    // 3. Cache Check
    const cacheKey = crypto
      .createHash('sha256')
      .update(`${imageUrl}:${w || ''}:${h || ''}:${q}:${fmt}`)
      .digest('hex');
    const cacheFilePath = path.join(CACHE_DIR, `${cacheKey}.${fmt}`);

    if (res.headersSent) return;

    // Set Response Headers for Cache and Delivery
    const contentTypeMap: Record<string, string> = {
      webp: 'image/webp',
      avif: 'image/avif',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };
    res.setHeader('Content-Type', contentTypeMap[fmt] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // If cache file exists, stream it back instantly
    if (fs.existsSync(cacheFilePath)) {
      fs.createReadStream(cacheFilePath).pipe(res);
      return;
    }

    // 4. Process image using sharp
    let sharpInstance = sharp(inputForSharp as any);

    if (w || h) {
      sharpInstance = sharpInstance.resize({
        width: w,
        height: h,
        fit: w && h ? 'cover' : 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert format and apply quality/compression
    if (format === 'webp') {
      sharpInstance = sharpInstance.webp({ quality: q, effort: 4 });
    } else if (format === 'avif') {
      sharpInstance = sharpInstance.avif({ quality: q, effort: 2 });
    } else if (format === 'jpeg') {
      sharpInstance = sharpInstance.jpeg({ quality: q, progressive: true });
    } else if (format === 'png') {
      sharpInstance = sharpInstance.png({ quality: q, compressionLevel: 8 });
    }

    // Output buffer
    const processedBuffer = await sharpInstance.toBuffer();

    // 5. Write to cache file asynchronously
    fs.writeFile(cacheFilePath, processedBuffer, (err) => {
      if (err) {
        logger.error(`[MEDIA CACHE WRITE ERROR] Failed to write to cache: ${err}`);
      }
    });

    if (res.headersSent) return;

    // 6. Respond with optimized buffer
    res.send(processedBuffer);
  } catch (error) {
    if (res.headersSent) return;
    next(error);
  }
};
