import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { uploadProducts, uploadGallery, uploadCMS } from '../middleware/upload';
import cloudinary from '../config/cloudinary';

const router = Router();

// Get signed URL for direct Cloudinary upload (for large video files or frontend uploads)
router.get('/signed-url', requireAuth, requireAdmin, (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'siri-arts-crafts/direct-uploads' },
      process.env.CLOUDINARY_API_SECRET!
    );
    res.status(200).json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: 'siri-arts-crafts/direct-uploads'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to generate signature', error: error.message });
  }
});

// Customer Inspirations Upload (Requires requireAuth only)
router.post('/inspirations', requireAuth, ...uploadGallery.array('images', 5), (req, res) => {
  const files = req.files as any[];
  const imageUrls = files.map((file) => file.path);
  res.status(200).json({ success: true, images: imageUrls });
});

// Products Upload
router.post('/products', requireAuth, requireAdmin, ...uploadProducts.array('images', 10), (req, res) => {
  const files = req.files as any[];
  const imageUrls = files.map((file) => file.path);
  res.status(200).json({ success: true, images: imageUrls });
});

// Gallery Upload
router.post('/gallery', requireAuth, requireAdmin, ...uploadGallery.array('images', 10), (req, res) => {
  const files = req.files as any[];
  const imageUrls = files.map((file) => file.path);
  res.status(200).json({ success: true, images: imageUrls });
});

// CMS/Homepage Upload
router.post('/cms', requireAuth, requireAdmin, ...uploadCMS.single('image'), (req, res) => {
  const file = req.file as any;
  res.status(200).json({ success: true, url: file.path });
});

// Legacy/Default route (defaults to products)
router.post('/', requireAuth, requireAdmin, ...uploadProducts.array('images', 5), (req, res) => {
  const files = req.files as any[];
  const imageUrls = files.map((file) => file.path);
  res.status(200).json({ success: true, images: imageUrls });
});

export default router;
