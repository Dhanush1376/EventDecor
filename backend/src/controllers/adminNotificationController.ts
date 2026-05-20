import { Request, Response } from 'express';
import AdminNotification from '../models/AdminNotification';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import { emitAdminNotification } from '../socket';

/**
 * Fetch all admin notifications
 */
export const getAdminNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  
  const notifications = await AdminNotification.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
    
  const total = await AdminNotification.countDocuments();
  const unreadCount = await AdminNotification.countDocuments({ isRead: false });

  res.status(200).json(new ApiResponse(true, 'Admin notifications fetched', {
    notifications,
    total,
    unreadCount,
    page,
    pages: Math.ceil(total / limit)
  }));
});

/**
 * Mark a single notification as read
 */
export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await AdminNotification.findByIdAndUpdate(
    req.params.id, 
    { isRead: true },
    { new: true }
  );
  
  res.status(200).json(new ApiResponse(true, 'Notification marked as read', notification));
});

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  await AdminNotification.updateMany({ isRead: false }, { isRead: true });
  res.status(200).json(new ApiResponse(true, 'All notifications marked as read'));
});

/**
 * Delete a notification
 */
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  await AdminNotification.findByIdAndDelete(req.params.id);
  res.status(200).json(new ApiResponse(true, 'Notification deleted'));
});

/**
 * Internal Helper: Create & Emit Notification
 */
export const createAdminNotification = async (payload: {
  title: string;
  message: string;
  type: 'order' | 'custom_request' | 'payment' | 'inquiry' | 'user' | 'system';
  actionLink?: string;
  metadata?: Record<string, any>;
}) => {
  try {
    const notification = new AdminNotification(payload);
    await notification.save();
    
    // Emit via WebSocket to all connected admins instantly
    emitAdminNotification(notification);
    
    return notification;
  } catch (error) {
    console.error('Failed to create admin notification:', error);
  }
};
