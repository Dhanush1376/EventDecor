import { Router } from 'express';
import { generateSocialPreviewHtml, generateOgImage } from '../controllers/socialController';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Rate limiter specific for social OG image generation (prevents abuse)
const socialImageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many image requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// The endpoints that the crawlers hit directly via Nginx/Vercel proxy
router.get('/product/:id', generateSocialPreviewHtml);

// The endpoint that generates the dynamic image (referenced in the HTML)
router.get('/product/:id/image.png', socialImageLimiter, generateOgImage);

export default router;
