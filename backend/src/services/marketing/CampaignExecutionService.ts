import crypto from 'crypto';
import mongoose from 'mongoose';
import EmailCampaign, { IEmailCampaign } from '../../models/EmailCampaign';
import NotificationLog from '../../models/NotificationLog';
import AudienceResolverService from './AudienceResolverService';
import EmailBlockRenderer from './EmailBlockRenderer';
import { EmailProviderAbstraction } from './EmailProviderAbstraction';
import logger from '../../config/logger';

export class CampaignExecutionService {
  /**
   * Validates campaign content and safety before scheduling or launching
   */
  static async validateCampaign(
    campaign: IEmailCampaign,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!campaign.title || !campaign.title.trim()) {
      errors.push('Campaign internal name is required.');
    }
    if (!campaign.subject || !campaign.subject.trim()) {
      errors.push('Email subject line is required.');
    }

    const hasBlocks = campaign.designBlocks && campaign.designBlocks.length > 0;
    const hasHtml = campaign.customHtml && campaign.customHtml.trim().length > 0;
    if (!hasBlocks && !hasHtml) {
      errors.push('Email content is empty. Please add visual blocks or custom HTML.');
    }

    const audience = await AudienceResolverService.countAudience(campaign.audienceCriteria || {});
    if (audience.eligibleRecipients <= 0) {
      errors.push(
        'Target audience has 0 eligible recipients. Please adjust audience filter rules.',
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if recipient exceeds marketing frequency guard (e.g. max 2 marketing emails in 24h)
   */
  private static async checkFrequencyGuard(email: string, maxPerDay: number = 2): Promise<boolean> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await NotificationLog.countDocuments({
      recipientEmail: email.toLowerCase(),
      type: 'marketing',
      status: { $in: ['sent', 'delivered'] },
      createdAt: { $gte: oneDayAgo },
    });
    return recentCount >= maxPerDay;
  }

  /**
   * Executes campaign broadcast via batched background processing
   */
  static async executeCampaignDispatch(campaignId: string): Promise<void> {
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      logger.error(`[CampaignExecutionService] Campaign ${campaignId} not found`);
      return;
    }

    if (campaign.status === 'sending' || campaign.status === 'sent') {
      logger.warn(`[CampaignExecutionService] Campaign ${campaignId} is already sending or sent`);
      return;
    }

    campaign.status = 'sending';
    campaign.sentAt = new Date();
    await campaign.save();

    logger.info(
      `[CampaignExecutionService] Launching campaign dispatch: "${campaign.title}" (${campaign._id})`,
    );

    try {
      // Resolve audience recipients
      const recipients = await AudienceResolverService.resolveRecipients(
        campaign.audienceCriteria || {},
      );
      campaign.stats.recipientCount = recipients.length;
      await campaign.save();

      const batchSize = 25;
      const maxPerDay = campaign.frequencyGuard?.enabled
        ? campaign.frequencyGuard.maxPerDay || 2
        : 999;

      let sentCount = 0;
      let deliveredCount = 0;
      let bounceCount = 0;

      for (let i = 0; i < recipients.length; i += batchSize) {
        // Re-check if admin paused or cancelled campaign mid-flight
        const currentCheck = await EmailCampaign.findById(campaignId).select('status');
        if (currentCheck?.status === 'paused' || currentCheck?.status === 'cancelled') {
          logger.info(
            `[CampaignExecutionService] Campaign ${campaignId} was paused/cancelled during dispatch`,
          );
          return;
        }

        const batch = recipients.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (recipient) => {
            try {
              // 1. Idempotency Check: Prevent duplicate sends to same recipient for this campaign
              const existingLog = await NotificationLog.findOne({
                campaignId: campaign._id,
                recipientEmail: recipient.email.toLowerCase(),
                status: { $in: ['sent', 'delivered'] },
              });
              if (existingLog) {
                logger.info(
                  `[CampaignExecutionService] Recipient ${recipient.email} already received campaign ${campaign._id}, skipping.`,
                );
                return;
              }

              // 2. Frequency Guard check
              if (campaign.frequencyGuard?.enabled) {
                const isThrottled = await this.checkFrequencyGuard(recipient.email, maxPerDay);
                if (isThrottled) {
                  logger.info(
                    `[CampaignExecutionService] Skipping ${recipient.email} due to frequency guard limit.`,
                  );
                  return;
                }
              }

              // 3. Generate unique tracking token
              const trackingToken = crypto.randomBytes(24).toString('hex');

              // 4. Render personalized email
              const renderedHtml = await EmailBlockRenderer.renderFullEmail(
                campaign.designBlocks || [],
                {
                  customer: {
                    name: recipient.name,
                    firstName: recipient.firstName,
                    email: recipient.email,
                    totalSpent: recipient.totalSpent,
                    totalOrders: recipient.ordersCount,
                    loyaltyTier: recipient.loyaltyTier,
                  },
                  campaign: {
                    id: campaign._id.toString(),
                    title: campaign.title,
                  },
                  trackingToken,
                },
                campaign.customHtml,
              );

              // 5. Create initial NotificationLog record
              const log = new NotificationLog({
                userId: recipient.userId
                  ? new mongoose.Types.ObjectId(recipient.userId)
                  : undefined,
                recipientEmail: recipient.email.toLowerCase(),
                campaignId: campaign._id,
                type: 'marketing',
                channel: 'email',
                action: 'campaign_broadcast',
                status: 'processing',
                trackingToken,
                sender: campaign.senderEmail || 'noreply@siriartsandcrafts.com',
                sendTime: new Date(),
              });
              await log.save();

              // 6. Deliver via EmailProviderAbstraction
              const result = await EmailProviderAbstraction.send({
                to: recipient.email,
                subject: campaign.subject,
                html: renderedHtml,
                from: campaign.senderEmail,
                fromName: campaign.senderName,
              });

              sentCount++;

              if (result.success) {
                deliveredCount++;
                log.status = 'delivered';
                await log.save();
              } else {
                bounceCount++;
                log.status = 'failed';
                log.errorDetails = result.error;
                await log.save();
              }
            } catch (err: any) {
              logger.error(
                `[CampaignExecutionService] Error sending to ${recipient.email}: ${err.message}`,
              );
              bounceCount++;
            }
          }),
        );

        // Progressively persist stats to database
        await EmailCampaign.findByIdAndUpdate(campaignId, {
          $set: {
            'stats.sentCount': sentCount,
            'stats.deliveredCount': deliveredCount,
            'stats.bounceCount': bounceCount,
          },
        });
      }

      // Mark completed
      campaign.status = 'sent';
      campaign.completedAt = new Date();
      campaign.stats.sentCount = sentCount;
      campaign.stats.deliveredCount = deliveredCount;
      campaign.stats.bounceCount = bounceCount;
      await campaign.save();

      logger.info(
        `[CampaignExecutionService] Campaign "${campaign.title}" finished. Sent: ${sentCount}, Delivered: ${deliveredCount}, Bounced: ${bounceCount}`,
      );
    } catch (err: any) {
      logger.error(
        `[CampaignExecutionService] Fatal failure in campaign dispatch ${campaignId}: ${err.message}`,
      );
      campaign.status = 'failed';
      await campaign.save();
    }
  }

  /**
   * Schedules campaign for future dispatch
   */
  static async scheduleCampaign(campaignId: string, scheduledAt: Date): Promise<IEmailCampaign> {
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const validation = await this.validateCampaign(campaign);
    if (!validation.valid) {
      throw new Error(validation.errors.join(' '));
    }

    campaign.scheduledAt = scheduledAt;
    campaign.status = 'scheduled';
    await campaign.save();
    return campaign;
  }

  /**
   * Pauses an active or scheduled campaign
   */
  static async pauseCampaign(campaignId: string): Promise<IEmailCampaign> {
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    campaign.status = 'paused';
    campaign.pausedAt = new Date();
    await campaign.save();
    return campaign;
  }

  /**
   * Resumes a paused campaign
   */
  static async resumeCampaign(campaignId: string): Promise<IEmailCampaign> {
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    if (campaign.scheduledAt && new Date(campaign.scheduledAt) > new Date()) {
      campaign.status = 'scheduled';
    } else {
      campaign.status = 'draft';
    }
    campaign.pausedAt = undefined;
    await campaign.save();
    return campaign;
  }

  /**
   * Duplicates campaign with new identity and clean reset analytics
   */
  static async duplicateCampaign(campaignId: string, adminId?: string): Promise<IEmailCampaign> {
    const source = await EmailCampaign.findById(campaignId).lean();
    if (!source) throw new Error('Source campaign not found');

    const duplicate = new EmailCampaign({
      title: `${source.title} (Copy)`,
      subject: source.subject,
      previewText: source.previewText,
      senderName: source.senderName,
      senderEmail: source.senderEmail,
      replyTo: source.replyTo,
      campaignType: source.campaignType,
      category: source.category,
      templateId: source.templateId,
      customHtml: source.customHtml,
      designBlocks: source.designBlocks,
      audienceCriteria: source.audienceCriteria,
      targetAudience: source.targetAudience,
      frequencyGuard: source.frequencyGuard,
      status: 'draft',
      createdBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      stats: {
        recipientCount: 0,
        sentCount: 0,
        deliveredCount: 0,
        openCount: 0,
        uniqueOpenCount: 0,
        clickCount: 0,
        uniqueClickCount: 0,
        bounceCount: 0,
        unsubscribeCount: 0,
        ordersCount: 0,
        revenueGenerated: 0,
      },
    });

    await duplicate.save();
    return duplicate;
  }
}

export default CampaignExecutionService;
