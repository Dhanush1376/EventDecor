import crypto from 'crypto';
import sharp from 'sharp';

/**
 * Compress and resize image for optimal AI processing.
 */
export async function processImage(
  buffer: Buffer,
  _mimeType: string,
): Promise<{ base64: string; mimeType: string; hash: string }> {
  // Compute hash of original for caching
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Resize to max 1024px on longest side, convert to JPEG for universal compatibility
  const processed = await sharp(buffer)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();

  return {
    base64: processed.toString('base64'),
    mimeType: 'image/jpeg',
    hash,
  };
}

/**
 * Compute perceptual hash
 */
export async function computeImageHash(imageBuffer: Buffer): Promise<string> {
  try {
    // Resize to 9x8 grayscale (produces 8x8 = 64 bit differences)
    const pixels = await sharp(imageBuffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Compare each pixel to its right neighbor
    let hash = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = pixels[row * 9 + col];
        const right = pixels[row * 9 + col + 1];
        hash += left < right ? '1' : '0';
      }
    }

    // Convert binary string to hex
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(hash.substring(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return '';
  }
}
