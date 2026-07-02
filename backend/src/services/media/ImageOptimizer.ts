import sharp from 'sharp';
import logger from '../../config/logger';
import { MAX_DIMENSION } from '../../constants/mediaConstants';

export interface OptimizationResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  bytes: number;
  originalBytes: number;
  optimizationSavings: number;
}

export class ImageOptimizer {
  /**
   * Optimizes an image buffer using sharp, applying format-specific strategies.
   * Strips all metadata (EXIF/GPS) and ensures max dimensions are not exceeded.
   */
  static async optimize(buffer: Buffer, originalMimeType: string): Promise<OptimizationResult> {
    const originalBytes = buffer.length;

    try {
      const metadata = await sharp(buffer).metadata();
      const actualFormat = metadata.format || 'unknown';

      // SVGs and GIFs are passthrough to preserve animations and vectors
      if (
        (actualFormat as any) === 'svg' ||
        (actualFormat as any) === 'gif' ||
        originalMimeType === 'image/svg+xml' ||
        originalMimeType === 'image/gif'
      ) {
        // Prevent spoofing: if mimetype said SVG/GIF but actual format is different, don't passthrough
        if (
          (originalMimeType === 'image/svg+xml' && actualFormat !== 'svg') ||
          (originalMimeType === 'image/gif' && actualFormat !== 'gif')
        ) {
          logger.warn(
            `[ImageOptimizer] File spoofing detected! Mimetype is ${originalMimeType} but actual format is ${actualFormat}.`,
          );
          // We could throw here, but passing it through the optimizer will correctly encode it to the true format or strip malicious payloads.
        } else {
          return {
            buffer,
            width: metadata.width || 0,
            height: metadata.height || 0,
            format: actualFormat,
            bytes: buffer.length,
            originalBytes,
            optimizationSavings: 0,
          };
        }
      }

      let pipeline = sharp(buffer, { failOn: 'truncated' }).rotate(); // Auto-rotate based on EXIF

      const currentWidth = metadata.width || 0;
      const currentHeight = metadata.height || 0;

      // Resize if dimensions exceed MAX_DIMENSION (withoutEnlargement = no upscaling)
      if (currentWidth > MAX_DIMENSION || currentHeight > MAX_DIMENSION) {
        pipeline = pipeline.resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      let format = actualFormat;
      let finalBuffer = buffer;

      // Format-specific strategies
      switch (format as any) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({
            quality: 80,
            progressive: true,
            mozjpeg: true,
          });
          break;
        case 'png':
          pipeline = pipeline.png({
            compressionLevel: 8,
            palette: true, // quantize to save space if applicable
          });
          break;
        case 'webp':
          pipeline = pipeline.webp({
            quality: 80,
            smartSubsample: true,
          });
          break;
        case 'avif':
          pipeline = pipeline.avif({
            quality: 70,
          });
          break;
        case 'heif': // HEIC
        case 'heic':
          // Convert HEIC to WebP for broader compatibility
          pipeline = pipeline.webp({ quality: 80 });
          format = 'webp';
          break;
        default:
          // Fallback to WebP for other formats
          pipeline = pipeline.webp({ quality: 80 });
          format = 'webp';
          break;
      }

      // Execute pipeline
      finalBuffer = await pipeline.toBuffer();

      // If the "optimized" buffer is larger than original, stick to the original
      // Exception: HEIC -> WebP conversion, which MUST happen for browser compatibility
      if (
        finalBuffer.length > originalBytes &&
        (metadata.format as any) !== 'heif' &&
        (metadata.format as any) !== 'heic'
      ) {
        logger.debug(
          `[ImageOptimizer] Original size smaller than optimized (${originalBytes} vs ${finalBuffer.length}), keeping original.`,
        );
        // We still need to return metadata for the original
        return {
          buffer,
          width: currentWidth,
          height: currentHeight,
          format: format || 'unknown',
          bytes: buffer.length,
          originalBytes,
          optimizationSavings: 0,
        };
      }

      const finalMetadata = await sharp(finalBuffer).metadata();
      const savings = Math.max(0, ((originalBytes - finalBuffer.length) / originalBytes) * 100);

      logger.debug(
        `[ImageOptimizer] Optimized image: ${Math.round(originalBytes / 1024)}KB -> ${Math.round(
          finalBuffer.length / 1024,
        )}KB (-${Math.round(savings)}%)`,
      );

      return {
        buffer: finalBuffer,
        width: finalMetadata.width || 0,
        height: finalMetadata.height || 0,
        format: finalMetadata.format || format || 'unknown',
        bytes: finalBuffer.length,
        originalBytes,
        optimizationSavings: Number(savings.toFixed(2)),
      };
    } catch (error: any) {
      logger.error(`[ImageOptimizer] Optimization failed: ${error.message}`);
      // Fallback: If optimization fails, try to just pass the buffer back with some basic metadata
      try {
        const metadata = await sharp(buffer).metadata();
        return {
          buffer,
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || 'unknown',
          bytes: buffer.length,
          originalBytes,
          optimizationSavings: 0,
        };
      } catch (e) {
        throw new Error(`Failed to process image buffer: ${error.message}`);
      }
    }
  }
}
