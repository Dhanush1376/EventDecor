import { NotificationContext, NotificationChannel } from './types';
import { EmailAdapter } from './adapters/EmailAdapter';
import { SmsAdapter } from './adapters/SmsAdapter';
import { WhatsAppAdapter } from './adapters/WhatsAppAdapter';
import { InAppAdapter } from './adapters/InAppAdapter';
import { TemplateRenderer } from './TemplateRenderer';
import NotificationLog from '../../models/NotificationLog';
import logger from '../../config/logger';

export class NotificationDispatcher {
  private static emailAdapter = new EmailAdapter();

  public static async dispatch(
    context: NotificationContext,
    recipient: any,
    channel: NotificationChannel,
    enrichedData: any,
    priority: string,
  ): Promise<void> {
    const log = new NotificationLog({
      userId: enrichedData.user?._id,
      recipientEmail: recipient.email || recipient.phone || 'unknown',
      type: context.metadata?.category || 'system',
      channel: channel.toLowerCase(),
      action: context.eventId,
      status: 'processing',
      trackingToken: Math.random().toString(36).substring(2, 15),
      priority,
      retryCount: context.retryCount,
    });
    await log.save();

    try {
      let result: any = { success: false, reason: 'unsupported_channel' };

      // Render templates
      const templateName = `${context.eventId.toLowerCase()}_${channel.toLowerCase()}`;
      const rendered = await TemplateRenderer.render(templateName, enrichedData);
      const payload = {
        ...enrichedData,
        subject: rendered.subject,
        html: rendered.html,
        message: rendered.html,
      };

      switch (channel) {
        case NotificationChannel.EMAIL:
          result = await this.emailAdapter.send(recipient, payload, priority);
          break;
        case NotificationChannel.SMS:
          result = await SmsAdapter.send(recipient, payload, priority);
          break;
        case NotificationChannel.WHATSAPP:
          result = await WhatsAppAdapter.send(recipient, payload, priority);
          break;
        case NotificationChannel.IN_APP:
          result = await InAppAdapter.send(recipient, payload, priority);
          break;
        default:
          logger.warn(`[DISPATCHER] Channel ${channel} not mapped.`);
      }

      if (result.success) {
        log.status = 'sent';
      } else {
        log.status = 'failed';
        log.errorDetails = result.reason || 'Adapter failed';
      }
      await log.save();
    } catch (error: any) {
      log.status = 'failed';
      log.errorDetails = error.message;
      await log.save();
      logger.error(`[DISPATCHER] Dispatch to ${channel} failed:`, error);
      throw error; // Rethrow for upstream dead-letter handling
    }
  }
}
