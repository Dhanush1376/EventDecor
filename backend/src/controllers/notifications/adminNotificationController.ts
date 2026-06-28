import { Request, Response } from 'express';
import AdminNotification from '../../models/AdminNotification';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import { getPaginationOptions } from '../../utils/pagination';
import { setPaginationHeaders } from '../../utils/paginationHeaders';

/**
 * Fetch all admin notifications
 */
export const getAdminNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationOptions(req.query);

  const [notifications, total, unreadCount] = await Promise.all([
    AdminNotification.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    AdminNotification.countDocuments(),
    AdminNotification.countDocuments({ isRead: false }),
  ]);

  setPaginationHeaders(res, total, page, limit);
  res.status(200).json(
    new ApiResponse(true, 'Admin notifications fetched', {
      notifications,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit),
    }),
  );
});

/**
 * Mark a single notification as read
 */
export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await AdminNotification.findByIdAndUpdate(
    req.params.id,
    { isRead: true },
    { returnDocument: 'after' },
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
