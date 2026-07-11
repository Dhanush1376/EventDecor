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

      // Handle quiet hours (skipped for 24x7 realtime policy if not explicitly enabled)
      if (recipient.quietHours?.enabled) {
        // Time logic would go here
        // For now, assume it's disabled globally as requested
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
