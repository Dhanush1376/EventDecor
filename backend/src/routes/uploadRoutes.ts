import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { uploadLimiter, signedUrlLimiter } from '../middleware/rateLimiter';
import { uploadProducts, uploadGallery, uploadCMS } from '../middleware/upload';
import getCloudinary from '../config/cloudinary';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// Pre-flight check for multipart uploads to prevent slow-loris / stream memory exhaustion
const checkContentLength = (req: Request, res: Response, next: import('express').NextFunction) => {
  const contentLength = req.headers['content-length'];
  if (!contentLength) {
    return next(new ApiError(411, 'Length Required: Content-Length header is missing.'));
  }
  const size = parseInt(contentLength, 10);
  if (isNaN(size) || size > 50 * 1024 * 1024) { // 50MB max
    return next(new ApiError(413, 'Payload Too Large. Max size is 50MB.'));
  }
  next();
};

const ALLOWED_UPLOAD_FOLDERS = new Set([
  'siri-arts-crafts/direct-uploads',
  'event_decor_ecommerce/assets',
  'event_decor_ecommerce/gallery',
]);

/**
 * C-03: Signed params for direct browser → Cloudinary uploads (reduces backend memory load).
 * Query: folder, resource_type (image|video|raw), optional public_id prefix
 */
router.get(
  '/signed-url',
  signedUrlLimiter,
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      throw new ApiError(500, 'Cloudinary is not configured');
    }

    const folder = String(req.query.folder || 'siri-arts-crafts/direct-uploads');
    if (!ALLOWED_UPLOAD_FOLDERS.has(folder)) {
      throw new ApiError(400, 'Invalid upload folder');
    }

    const resourceType = String(req.query.resource_type || 'image');
    if (!['image', 'video', 'raw'].includes(resourceType)) {
      throw new ApiError(400, 'resource_type must be image, video, or raw');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder,
    };

    const signature = getCloudinary().utils.api_sign_request(paramsToSign, apiSecret);

    res.status(200).json(
      new ApiResponse(true, 'Signed upload parameters generated', {
        timestamp,
        signature,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        folder,
        resourceType,
        uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      })
    );
  })
);

// C-02: Multipart routes use multer (not express.json) — safe for large video uploads up to multer limits
router.post('/inspirations', uploadLimiter, requireAuth, checkContentLength, ...uploadGallery.array('images', 5), (req, res) => {
  const files = req.files as Express.Multer.File[];
  const imageUrls = files.map((file: any) => file.path);
  res.status(200).json({ success: true, images: imageUrls });
});

router.post('/products', uploadLimiter, requireAuth, requireAdmin, checkContentLength, ...uploadProducts.array('images', 10), (req, res) => {
  const files = req.files as Express.Multer.File[];
  const imageUrls = files.map((file: any) => file.path);
  res.status(200).json({ success: true, images: imageUrls });
});

router.post('/gallery', uploadLimiter, requireAuth, requireAdmin, checkContentLength, ...uploadGallery.array('images', 10), (req, res) => {
  const files = req.files as Express.Multer.File[];
  const imageUrls = files.map((file: any) => file.path);
  res.status(200).json({ success: true, images: imageUrls });
});

router.post('/cms', uploadLimiter, requireAuth, requireAdmin, checkContentLength, ...uploadCMS.single('image'), (req, res) => {
  const file = req.file as any;
  res.status(200).json({ success: true, url: file.path });
});

router.post('/', uploadLimiter, requireAuth, requireAdmin, checkContentLength, ...uploadProducts.array('images', 5), (req, res) => {
  const files = req.files as Express.Multer.File[];
  const imageUrls = files.map((file: any) => file.path);
  res.status(200).json({ success: true, images: imageUrls });
});

export default router;
