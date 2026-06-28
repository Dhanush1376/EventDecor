import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotification,
} from '../../controllers/notifications/notificationCenterController';
import { requireAuth } from '../../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', getNotifications);
router.post('/mark-all-read', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.patch('/:id/archive', archiveNotification);

export default router;
