import User from '../../models/User';
import { NotificationChannel } from './types';
import logger from '../../config/logger';

export class PreferenceService {
  /**
   * Retrieves the effective channels for a given user and notification category.
   */
  public static async getEffectiveChannels(
    userId: string,
    category: string,
    requestedChannels: NotificationChannel[],
    priority: string = 'normal',
  ): Promise<NotificationChannel[]> {
    if (priority === 'critical') {
      // Critical alerts (e.g. security, password reset, payment failure) bypass preferences
      return requestedChannels;
    }

    try {
      const user = await User.findById(userId).select('notificationPreferences');
      if (!user || !user.notificationPreferences) {
        return requestedChannels; // Default to requested if no preferences found
      }

      const prefs = user.notificationPreferences;
      const effectiveChannels: NotificationChannel[] = [];

      // 1. Check category opt-in
      const categoryPrefs: Record<string, boolean> = (prefs.categories as any) || {};

      // If category is explicitly opted-out
      let categoryOptIn = true;
      if (category === 'marketing' || category === 'engagement')
        categoryOptIn = categoryPrefs.promotions;
      if (category === 'order' || category === 'payment')
        categoryOptIn = categoryPrefs.orderUpdates;
      if (category === 'booking') categoryOptIn = categoryPrefs.bookingUpdates;
      if (category === 'rental') categoryOptIn = categoryPrefs.rentalUpdates;

      if (!categoryOptIn) {
        return []; // User has opted out of this entire category
      }

      // 2. Check channel opt-in
      for (const channel of requestedChannels) {
        if (channel === NotificationChannel.EMAIL && prefs.email) effectiveChannels.push(channel);
        if (channel === NotificationChannel.SMS && (prefs as any).sms)
          effectiveChannels.push(channel);
        if (channel === NotificationChannel.WHATSAPP && (prefs as any).whatsapp)
          effectiveChannels.push(channel);
        if (channel === NotificationChannel.IN_APP && (prefs as any).inApp !== false)
          effectiveChannels.push(channel);
        if (channel === NotificationChannel.PUSH && (prefs as any).push !== false)
          effectiveChannels.push(channel);

        // Slack / Discord are for admins, bypass user preferences
        if (channel === NotificationChannel.SLACK || channel === NotificationChannel.DISCORD) {
          effectiveChannels.push(channel);
        }
      }

      return effectiveChannels;
    } catch (error) {
      logger.error(`[PREFERENCE SERVICE] Error fetching preferences for user ${userId}:`, error);
      return requestedChannels; // Fail open for notifications
    }
  }

  /**
   * Updates a user's notification preferences.
   */
  public static async updatePreferences(userId: string, newPreferences: any) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { notificationPreferences: newPreferences } },
      { new: true },
    );
    return user?.notificationPreferences;
  }
}
