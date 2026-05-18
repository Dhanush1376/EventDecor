import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { uploadProducts, uploadGallery, uploadCMS } from '../middleware/upload';

const router = Router();

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
