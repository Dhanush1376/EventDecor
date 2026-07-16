import WhatsAppRecipient from '../../../models/WhatsAppRecipient';
import { IWhatsAppAutomation } from '../../../models/WhatsAppAutomation';
import { ResolvedRecipient } from './types';
import logger from '../../../config/logger';

export class RecipientResolver {
  static async resolve(automation: IWhatsAppAutomation): Promise<ResolvedRecipient[]> {
    const resolved: ResolvedRecipient[] = [];
    const seenPhones = new Set<string>();

    for (const roleConfig of automation.recipientRoles) {
      if (!roleConfig.enabled) continue;

      const recipient = await WhatsAppRecipient.findById(roleConfig.recipientId);
      if (!recipient || !recipient.isActive) continue;

      // Handle quiet hours
      if (recipient.quietHours?.enabled && recipient.quietHours.start && recipient.quietHours.end) {
        // Need timezone logic, default to UTC or Indian Standard Time based on server config
        // Simplified approach: check UTC hours against quiet hours assuming they are stored in UTC or a known TZ.
        const now = new Date();
        const currentHour = now.getUTCHours();
        const currentMinute = now.getUTCMinutes();
        const currentTimeInt = currentHour * 100 + currentMinute;

        const parseTime = (timeStr: string) => parseInt(timeStr.replace(':', ''), 10);

        const startTime = parseTime(recipient.quietHours.start);
        const endTime = parseTime(recipient.quietHours.end);

        let inQuietHours;
        if (startTime < endTime) {
          inQuietHours = currentTimeInt >= startTime && currentTimeInt <= endTime;
        } else {
          // Crosses midnight
          inQuietHours = currentTimeInt >= startTime || currentTimeInt <= endTime;
        }

        if (inQuietHours) {
          logger.info(
            `[RecipientResolver] Skipping ${recipient.name} due to quiet hours (${recipient.quietHours.start}-${recipient.quietHours.end})`,
          );
          continue;
        }
      }

      if (!seenPhones.has(recipient.phone)) {
        seenPhones.add(recipient.phone);
        resolved.push({
          phone: recipient.phone,
          name: recipient.name,
          role: recipient.role,
          recipientId: recipient._id.toString(),
        });
      }
    }

    logger.debug(
      `[RecipientResolver] Resolved ${resolved.length} recipients for ${automation.automationKey}`,
    );
    return resolved;
  }
}
