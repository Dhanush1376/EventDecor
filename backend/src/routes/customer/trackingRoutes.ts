import { Router } from 'express';
import {
  getMyTrackingTimeline,
  getCustomer360Profile,
} from '../../controllers/customer/trackingController';
import { requireAuth as protect } from '../../middleware/authMiddleware';

const router = Router();

// Protect all customer routes
router.use(protect);

router.get('/timeline', getMyTrackingTimeline);
router.get('/profile-360', getCustomer360Profile);

export default router;
