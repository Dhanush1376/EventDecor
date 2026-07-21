import logger from '../../../config/logger';
import AdminNotification from '../../../models/AdminNotification';

export class InAppAdapter {
  public static async send(recipient: any, payload: any, priority: string) {
    try {
      if (recipient.role === 'ADMIN' || recipient.role === 'SUPER_ADMIN') {
        const notification = new AdminNotification({
          title: payload.subject || 'Admin Notification',
          message: payload.message || payload.html || '',
          type: payload.type || 'system',
          actionLink: payload.actionLink,
          metadata: payload.metadata,
        });

        await notification.save();

        // Emit via WebSocket to all connected admins instantly
        const { emitAdminNotification } = require('../../../socket');
        emitAdminNotification(notification);

        logger.info(`[IN-APP ADAPTER] Created AdminNotification ${notification._id}`);
        return { success: true, notificationId: notification._id };
      } else {
        // Implement User in-app notification if needed
        logger.info(`[IN-APP ADAPTER] Skipped InApp for role ${recipient.role}`);
        return { success: true };
      }
    } catch (error) {
      logger.error(`[IN-APP ADAPTER] Failed to create in-app notification:`, error);
      throw error;
    }
  }
}
