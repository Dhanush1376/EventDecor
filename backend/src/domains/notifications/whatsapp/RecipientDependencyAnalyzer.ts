import WhatsAppAutomation from '../../../models/WhatsAppAutomation';
import logger from '../../../config/logger';

export class RecipientDependencyAnalyzer {
  /**
   * Returns a list of automations that are currently routing messages to this recipient.
   */
  static async getDependentAutomations(recipientId: string): Promise<any[]> {
    try {
      return await WhatsAppAutomation.find({ 'recipientRoles.recipientId': recipientId }).lean();
    } catch (error) {
      logger.error(
        `[RecipientDependencyAnalyzer] Error finding dependencies for recipient ${recipientId}`,
        error,
      );
      return [];
    }
  }

  /**
   * Checks if it is safe to delete a recipient.
   */
  static async canDelete(recipientId: string): Promise<{ safe: boolean; reason?: string }> {
    const dependencies = await this.getDependentAutomations(recipientId);
    if (dependencies.length > 0) {
      return {
        safe: false,
        reason: `Recipient is currently bound to ${dependencies.length} automation(s). Please remove them from the automations first.`,
      };
    }
    return { safe: true };
  }
}
