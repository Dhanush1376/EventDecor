import logger from '../../../config/logger';
import WhatsAppCampaign from '../../../models/WhatsAppCampaign';
import { whatsappDispatchQueue, whatsappCampaignBatchQueue } from '../../../jobs/whatsappQueues';
import { WhatsAppTemplateEngine } from './WhatsAppTemplateEngine';
import { SmartRouter } from './SmartRouter';
import WhatsAppMessageLog from '../../../models/WhatsAppMessageLog';
import { ProviderCircuitBreaker } from './providers/ProviderCircuitBreaker';
import { randomUUID as uuidv4 } from 'crypto';
import { CampaignAudienceEngine } from './CampaignAudienceEngine';
import { CampaignValidator } from './CampaignValidator';
import { WhatsAppVersionService } from './WhatsAppVersionService';

export class WhatsAppCampaignService {
  /**
   * Validates and starts a campaign by dispatching the first batch job.
   */
  static async startCampaign(campaignId: string, performedBy: any): Promise<void> {
    const campaign = await WhatsAppCampaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    if (
      campaign.status !== 'draft' &&
      campaign.status !== 'scheduled' &&
      campaign.status !== 'paused'
    ) {
      throw new Error(`Cannot start campaign in status: ${campaign.status}`);
    }

    campaign.status = 'validating';
    await campaign.save();

    const validation = await CampaignValidator.validate(campaign);
    if (!validation.valid) {
      campaign.status = 'failed';
      await campaign.save();
      throw new Error(`Campaign validation failed: ${validation.errors.join(', ')}`);
    }

    // Set initial metrics and status
    campaign.metrics.total = validation.estimatedRecipients;
    campaign.status = 'processing';
    await campaign.save();

    await WhatsAppVersionService.logChange({
      entityType: 'campaign',
      entityId: campaignId,
      action: 'publish',
      performedBy,
      changeDescription: `Started Campaign ${campaign.name}`,
    });

    logger.info(
      `[WhatsAppCampaignService] Starting campaign ${campaign.name} for ~${validation.estimatedRecipients} recipients.`,
    );

    // Enqueue the first batch
    await whatsappCampaignBatchQueue.add(
      'process-campaign-batch',
      { campaignId },
      { jobId: `batch_${campaignId}_init` },
    );
  }

  /**
   * Pauses an actively processing campaign.
   */
  static async pauseCampaign(campaignId: string, performedBy: any): Promise<void> {
    const campaign = await WhatsAppCampaign.findById(campaignId);
    if (campaign && campaign.status === 'processing') {
      campaign.status = 'paused';
      await campaign.save();

      await WhatsAppVersionService.logChange({
        entityType: 'campaign',
        entityId: campaignId,
        action: 'toggle',
        performedBy,
        changeDescription: 'Paused Campaign',
      });
    }
  }

  /**
   * BullMQ Worker Handler: Processes a cursor-paginated batch of recipients.
   */
  static async processCampaignBatch(job: any): Promise<void> {
    const { campaignId } = job.data;
    const campaign = await WhatsAppCampaign.findById(campaignId);

    if (!campaign) return;
    if (campaign.status !== 'processing') {
      logger.info(
        `[WhatsAppCampaignService] Batch skipped. Campaign ${campaignId} is ${campaign.status}.`,
      );
      return;
    }

    const batchSize = campaign.executionStrategy?.batchSize || 500;

    // Fetch batch using the saved cursor
    const { phones, nextCursor } = await CampaignAudienceEngine.fetchBatch(
      campaign.targetAudience,
      campaign.cursor,
      batchSize,
    );

    if (phones.length === 0) {
      // Finished
      campaign.status = 'completed';
      await campaign.save();
      logger.info(`[WhatsAppCampaignService] Campaign ${campaign.name} fully processed!`);
      return;
    }

    // Enqueue messages to the primary dispatch queue
    let queued = 0;
    for (const phone of phones) {
      await whatsappDispatchQueue.add(
        'dispatch-whatsapp-campaign',
        {
          campaignId: campaign._id.toString(),
          templateId: campaign.templateId.toString(),
          recipientPhone: phone,
          triggerTimestamp: Date.now(),
        },
        { priority: 3 }, // Lower priority than transactional
      );
      queued++;
    }

    // Update campaign state
    campaign.metrics.sent += queued;
    campaign.cursor = nextCursor;
    await campaign.save();

    logger.info(
      `[WhatsAppCampaignService] Campaign ${campaign.name} batch processed ${queued} recipients. New Cursor: ${nextCursor || 'END'}`,
    );

    // Schedule the next batch if there's more data
    if (nextCursor) {
      // Re-fetch campaign to ensure it wasn't paused during dispatch loop
      const checkPause = await WhatsAppCampaign.findById(campaignId).select('status');
      if (checkPause && checkPause.status === 'processing') {
        const delayMs = campaign.executionStrategy?.delayBetweenBatchesMs || 2000;
        await whatsappCampaignBatchQueue.add(
          'process-campaign-batch',
          { campaignId },
          { delay: delayMs, jobId: `batch_${campaignId}_${nextCursor}` },
        );
      }
    } else {
      campaign.status = 'completed';
      await campaign.save();
      logger.info(`[WhatsAppCampaignService] Campaign ${campaign.name} fully processed!`);
    }
  }

  /**
   * Handles the actual dispatch of a single message to a provider.
   */
  static async processCampaignMessage(job: any): Promise<void> {
    const { campaignId, templateId, recipientPhone, triggerTimestamp } = job.data;
    const _workerStart = Date.now();

    try {
      const campaign = await WhatsAppCampaign.findById(campaignId);
      if (!campaign) return;

      const template = await WhatsAppTemplateEngine.getTemplate(templateId);
      if (!template) return;

      const context = { storeSettings: {}, customerStats: {} };
      const renderedMessage = await WhatsAppTemplateEngine.render(template, context, [], []);

      const provider = await SmartRouter.getRoute('marketing');

      const _dispatchStart = Date.now();
      const _providerCallStart = Date.now();
      let response;

      try {
        const category = template.templateCategory as string;
        if (category === 'utility' || category === 'marketing') {
          response = await provider.sendTemplateMessage(
            recipientPhone,
            template.metaTemplateName,
            template.metaTemplateLanguage,
            [],
          );
        } else {
          response = await provider.sendTextMessage(recipientPhone, renderedMessage);
        }
      } catch (err: any) {
        response = { success: false, raw: { error: err.message || err }, messageId: 'failed' };
      }

      const _providerCallEnd = Date.now();

      if (response.success) {
        ProviderCircuitBreaker.recordSuccess(provider.name);
      } else {
        await ProviderCircuitBreaker.recordFailure(provider.name);
      }

      // Log to DB
      await WhatsAppMessageLog.create({
        messageId: uuidv4(),
        automationKey: `campaign_${campaignId}`,
        automationName: campaign.name,
        recipientPhone,
        templateId: template._id,
        templateName: template.name,
        renderedMessage,
        deliveryStatus: response.success ? 'sent' : 'failed',
        failureReason: response.success ? undefined : response.raw?.error,
        sentAt: response.success ? new Date() : undefined,
        apiProvider: provider.name,
        apiResponse: response.raw,
        apiMessageId: response.messageId,
        idempotencyKey: `wa:camp:${campaignId}:${recipientPhone}`,
        latencyMs: Date.now() - triggerTimestamp,
      });
    } catch (error) {
      logger.error(`[WhatsAppCampaignService] Error processing message ${job.id}`, error);
    }
  }
}
