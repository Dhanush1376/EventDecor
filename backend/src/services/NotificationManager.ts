import User from '../models/User';
import { sendDirectEmail, createAdminNotification } from './notificationService';
import logger from '../config/logger';

export interface NotificationPayload {
  userId?: string;
  email?: string;
  phone?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  type: 'marketing' | 'order' | 'account' | 'engagement' | 'system' | 'security';
  action: string;
  deduplicationKey: string;
}

export class NotificationManager {
  /**
   * Unified notification dispatcher with strict idempotency check.
   */
  static async sendToUser(channels: ('email' | 'sms' | 'in_app')[], payload: NotificationPayload) {
    // 1. Strict Idempotency Check
    const isDuplicate = await this.checkIdempotency(payload.deduplicationKey);
    if (isDuplicate) {
      logger.info(
        `[NOTIFICATION] Skipped duplicate notification (Key: ${payload.deduplicationKey})`,
      );
      return;
    }

    // 2. Fetch User Preferences if userId provided
    let user = null;
    if (payload.userId) {
      user = await User.findById(payload.userId);
    }

    const targetEmail = payload.email || user?.email;
    const targetPhone = payload.phone || user?.phone;

    // 3. Dispatch to Channels
    if (channels.includes('email') && targetEmail) {
      sendDirectEmail({
        email: targetEmail,
        subject: payload.subject,
        customHtml: payload.bodyHtml,
        type: payload.type,
        action: payload.action,
        userId: payload.userId,
      });
    }

    if (channels.includes('sms') && targetPhone) {
      // Future: SMS Gateway Integration
      logger.info(`[SMS] Sending SMS to ${targetPhone}: ${payload.subject}`);
    }

    if (channels.includes('in_app') && payload.userId) {
      // Future: In-App User Notifications collection
      logger.info(`[IN-APP] Sending In-App notification to ${payload.userId}: ${payload.subject}`);
    }

    // 4. Mark Idempotency Key
    await this.markIdempotency(payload.deduplicationKey);
  }

  static async sendToAdmin(
    channels: ('email' | 'dashboard')[],
    adminEmails: string[],
    payload: NotificationPayload,
  ) {
    const isDuplicate = await this.checkIdempotency(payload.deduplicationKey);
    if (isDuplicate) return;

    if (channels.includes('email')) {
      for (const email of adminEmails) {
        sendDirectEmail({
          email: email,
          subject: `[ADMIN] ${payload.subject}`,
          customHtml: payload.bodyHtml,
          type: 'system',
          action: payload.action,
        });
      }
    }

    if (channels.includes('dashboard')) {
      await createAdminNotification({
        title: payload.subject,
        message: payload.bodyText || payload.subject,
        type: payload.type as any,
      });
    }

    await this.markIdempotency(payload.deduplicationKey);
  }

  private static async checkIdempotency(key: string): Promise<boolean> {
    const { redisClient } = require('../config/redis');
    if (!redisClient || redisClient.status !== 'ready') return false; // Fail open if Redis is down
    const exists = await redisClient.get(`notif_idem:${key}`);
    return !!exists;
  }

  private static async markIdempotency(key: string): Promise<void> {
    const { redisClient } = require('../config/redis');
    if (!redisClient || redisClient.status !== 'ready') return;
    await redisClient.set(`notif_idem:${key}`, '1', 'EX', 86400 * 7); // 7-day deduplication window
  }
}
