import { WhatsAppTemplateEngine } from './WhatsAppTemplateEngine';
import { CampaignAudienceEngine } from './CampaignAudienceEngine';
import WhatsAppCostConfig from '../../../models/WhatsAppCostConfig';

export class CampaignValidator {
  /**
   * Performs pre-flight checks on a campaign before allowing it to start.
   */
  static async validate(
    campaign: any,
  ): Promise<{
    valid: boolean;
    estimatedRecipients: number;
    estimatedCost: number;
    errors: string[];
  }> {
    const errors: string[] = [];

    // 1. Template Validation
    const template = await WhatsAppTemplateEngine.getTemplate(campaign.templateId.toString());
    if (!template) {
      errors.push('Template not found or deleted.');
    } else if (template.status !== 'approved') {
      errors.push(
        `Template is not approved (Status: ${template.status}). Campaigns require active templates.`,
      );
    }

    // 2. Audience Estimation
    let estimatedRecipients = 0;
    try {
      estimatedRecipients = await CampaignAudienceEngine.estimateRecipients(
        campaign.targetAudience,
      );
      if (estimatedRecipients === 0) {
        errors.push('Target audience matches 0 recipients.');
      }
    } catch (err: any) {
      errors.push(`Audience estimation failed: ${err.message}`);
    }

    // 3. Cost Estimation
    let estimatedCost = 0;
    try {
      const config = await WhatsAppCostConfig.findOne();
      if (config && template) {
        const categoryCost =
          config.categories.find((c: any) => c.category === template.templateCategory)
            ?.rateMultiplier || 1.0;
        estimatedCost = estimatedRecipients * (config.baseMessageCost * categoryCost);
        // Note: For a real platform, check if store wallet balance >= estimatedCost
      }
    } catch (err: any) {
      errors.push(`Cost estimation failed: ${err.message}`);
    }

    // 4. Scheduling Conflict (Optional logic)
    if (campaign.scheduledAt && campaign.scheduledAt < new Date()) {
      errors.push('Scheduled time is in the past.');
    }

    return {
      valid: errors.length === 0,
      estimatedRecipients,
      estimatedCost,
      errors,
    };
  }
}
