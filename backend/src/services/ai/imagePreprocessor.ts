import sharp from 'sharp';
import logger from '../../config/logger';

export const preprocessImage = async (
  base64Image: string,
  mimeType: string,
  maxSize: number = 800,
): Promise<{ base64: string; mimeType: string }> => {
  try {
    const buffer = Buffer.from(base64Image, 'base64');

    // Process image:
    // 1. Convert to JPEG to reduce size (and ensure compatibility with all vision models)
    // 2. Resize to fit within maxSize x maxSize (maintaining aspect ratio)
    // 3. Set quality to 80 to compress
    // 4. Auto-rotate to fix EXIF orientation, but strip EXIF metadata
    const processedBuffer = await sharp(buffer)
      .resize({
        width: maxSize,
        height: maxSize,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .rotate() // auto-orient based on exif
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      base64: processedBuffer.toString('base64'),
      mimeType: 'image/jpeg',
    };
  } catch (error: any) {
    logger.warn(
      `[AI_IMAGE_PREPROCESSOR] Failed to process image: ${error.message}. Falling back to original image.`,
    );
    return { base64: base64Image, mimeType };
  }
};
