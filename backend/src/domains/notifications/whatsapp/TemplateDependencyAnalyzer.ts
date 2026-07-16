import WhatsAppAutomation from '../../../models/WhatsAppAutomation';
import logger from '../../../config/logger';

export class TemplateDependencyAnalyzer {
  /**
   * Returns a list of automations that are currently using this template.
   */
  static async getDependentAutomations(templateId: string): Promise<any[]> {
    try {
      return await WhatsAppAutomation.find({ activeTemplateId: templateId }).lean();
    } catch (error) {
      logger.error(
        `[TemplateDependencyAnalyzer] Error finding dependencies for template ${templateId}`,
        error,
      );
      return [];
    }
  }

  /**
   * Checks if it is safe to delete a template.
   */
  static async canDelete(templateId: string): Promise<{ safe: boolean; reason?: string }> {
    const dependencies = await this.getDependentAutomations(templateId);
    if (dependencies.length > 0) {
      return {
        safe: false,
        reason: `Template is currently in use by ${dependencies.length} automation(s). Please reassign them first.`,
      };
    }
    return { safe: true };
  }
}
