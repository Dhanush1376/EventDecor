import crypto from 'crypto';
import sharp from 'sharp';

export async function processImage(
  buffer: Buffer,
  _mimeType: string,
): Promise<{ base64: string; mimeType: string; hash: string }> {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

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

export async function computeImageHash(imageBuffer: Buffer): Promise<string> {
  try {
    const pixels = await sharp(imageBuffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    let hash = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = pixels[row * 9 + col];
        const right = pixels[row * 9 + col + 1];
        hash += left < right ? '1' : '0';
      }
    }

    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(hash.substring(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return '';
  }
}

export function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    distance += ((xor >> 0) & 1) + ((xor >> 1) & 1) + ((xor >> 2) & 1) + ((xor >> 3) & 1);
  }
  return distance;
}
