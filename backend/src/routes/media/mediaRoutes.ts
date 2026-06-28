import { Router } from 'express';
import { optimizeImageController } from '../../controllers/media/mediaController';

const router = Router();

/**
 * GET /api/v1/media/optimize
 * Public endpoint to optimize, resize, compress, and transcode local public assets.
 */
router.get('/optimize', optimizeImageController);

export default router;
