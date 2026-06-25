import { Request, Response } from 'express';
import InAppNotification from '../models/InAppNotification';
import logger from '../config/logger';

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;

    const query: any = { user: userId, archived: false };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await InAppNotification.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await InAppNotification.countDocuments(query);
    const unreadCount = await InAppNotification.countDocuments({
      user: userId,
      read: false,
      archived: false,
    });

    res.status(200).json({
      success: true,
      data: notifications,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        unreadCount,
      },
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const notification = await InAppNotification.findOneAndUpdate(
      { _id: id, user: userId },
      { read: true },
      { new: true },
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    await InAppNotification.updateMany({ user: userId, read: false }, { read: true });

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
};

export const archiveNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const notification = await InAppNotification.findOneAndUpdate(
      { _id: id, user: userId },
      { archived: true },
      { new: true },
    );

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Notification archived' });
  } catch (error) {
    logger.error('Error archiving notification:', error);
    res.status(500).json({ success: false, message: 'Failed to archive notification' });
  }
};
