import { z } from 'zod';
import {
  SUPPORTED_IMAGE_MIMES,
  SUPPORTED_VIDEO_MIMES,
  UPLOAD_LIMITS,
} from '../constants/mediaConstants';
import ApiError from '../utils/ApiError';

export const MediaUploadSchema = z.object({
  module: z.string().optional().default('default'),
  folder: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
});

export const MediaReplaceSchema = z.object({
  tags: z.union([z.string(), z.array(z.string())]).optional(),
});

/**
 * Robustly verifies file signatures (magic numbers) instead of relying solely on the file extension.
 * This function checks the initial bytes of a buffer to confirm its type.
 */
export const verifyFileSignature = (buffer: Buffer, mimetype: string): boolean => {
  if (!buffer || buffer.length < 8) return false;

  const hexString = buffer.toString('hex', 0, 8).toLowerCase();

  const signatures: Record<string, string[]> = {
    'image/jpeg': [
      'ffd8ffe0',
      'ffd8ffe1',
      'ffd8ffe2',
      'ffd8ffe3',
      'ffd8ffe8',
      'ffd8ffee',
      'ffd8ffdb',
    ],
    'image/png': ['89504e47'],
    'image/gif': ['47494638'],
    'image/webp': ['52494646'], // Matches 'RIFF' header
    'image/avif': ['0000001c66747970', '0000002066747970'], // 'ftyp' starts at byte 4
    'image/heic': ['0000001866747970', '0000002066747970'],
    'video/mp4': ['0000001866747970', '0000002066747970', '0000001466747970'],
    'video/webm': ['1a45dfa3'],
  };

  // SVGs are text based, so we can't reliably magic number check them in this way.
  if (mimetype === 'image/svg+xml') {
    return buffer.toString('utf8', 0, 100).includes('<svg');
  }

  const validSignatures = signatures[mimetype];
  if (!validSignatures) {
    // If we don't have a signature mapped for it, we assume the MIME is correctly passed if it's
    // one of the less common video formats like quicktime. But we should be careful.
    return true; // Weak fallback
  }

  // Handle video containers: MP4, QuickTime / MOV, and WebM
  if (mimetype === 'video/mp4' || mimetype === 'video/quicktime') {
    if (buffer.length < 12) return false;
    const ftyp = buffer.toString('hex', 4, 8).toLowerCase();
    if (ftyp === '66747970') {
      return true; // Valid MP4 / MOV / QuickTime container with 'ftyp' box
    }
    const atom = buffer.toString('ascii', 4, 8).toLowerCase();
    if (['moov', 'mdat', 'wide', 'free'].includes(atom)) return true;
    return false;
  }

  if (mimetype === 'video/webm') {
    return buffer.toString('hex', 0, 4).toLowerCase() === '1a45dfa3';
  }

  // Handle formats like WEBP and MP4/AVIF that have offsets or varying lengths for the magic number
  if (mimetype === 'image/webp') {
    const isRiff = hexString.startsWith('52494646');
    const isWebp = buffer.toString('utf8', 8, 12) === 'WEBP';
    return isRiff && isWebp;
  }

  return validSignatures.some((sig) => hexString.startsWith(sig));
};

/**
 * Validates a file's mime type, extension, size and magic bytes against security constraints.
 */
export const validateFile = (file: Express.Multer.File, module: string = 'default') => {
  if (!file) {
    throw new ApiError(400, 'No file provided');
  }

  // 1. Basic extension check (we rely on mimetype & magic bytes for security, allowing multiple dots in filenames)
  const filename = file.originalname || '';
  if (!filename.includes('.')) {
    throw new ApiError(400, 'File must have an extension');
  }

  // 2. MIME type check
  const isImage = SUPPORTED_IMAGE_MIMES.has(file.mimetype);
  const isVideo = SUPPORTED_VIDEO_MIMES.has(file.mimetype);

  if (!isImage && !isVideo) {
    throw new ApiError(415, `Unsupported media format: ${file.mimetype}`);
  }

  // 3. Size check based on media type and module context (Videos get 100MB limit)
  const limit = isVideo
    ? UPLOAD_LIMITS.videos
    : UPLOAD_LIMITS[module as keyof typeof UPLOAD_LIMITS] || UPLOAD_LIMITS.default;
  if (file.size > limit) {
    throw new ApiError(
      413,
      `File size exceeds limit for ${module} (${Math.round(limit / 1024 / 1024)}MB)`,
    );
  }

  // 4. Magic bytes verification (Anti-spoofing)
  if (!verifyFileSignature(file.buffer, file.mimetype)) {
    throw new ApiError(400, 'File content does not match its format/extension');
  }

  return { isImage, isVideo };
};
