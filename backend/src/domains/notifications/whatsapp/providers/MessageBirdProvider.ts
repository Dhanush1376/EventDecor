import { IMessagingProvider, ProviderResponse, HealthStatus } from './IMessagingProvider';
import logger from '../../../../config/logger';
import axios from 'axios';

export class MessageBirdProvider implements IMessagingProvider {
  name = 'messagebird';

  private get headers() {
    return {
      Authorization: `AccessKey ${process.env.MESSAGEBIRD_API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async sendTextMessage(phone: string, message: string): Promise<ProviderResponse> {
    logger.info(`[MessageBirdProvider] Sending text to ${phone}`);
    try {
      const response = await axios.post(
        'https://conversations.messagebird.com/v1/send',
        {
          type: 'text',
          to: phone.replace(/[^0-9]/g, ''),
          from: process.env.MESSAGEBIRD_CHANNEL_ID,
          content: {
            text: message,
          },
        },
        { headers: this.headers, timeout: 5000 },
      );

      return {
        success: true,
        messageId: response.data.id,
        raw: response.data,
      };
    } catch (err: any) {
      logger.error(`[MessageBirdProvider] Text message failed`, err.response?.data || err.message);
      return { success: false, raw: err.response?.data };
    }
  }

  async sendTemplateMessage(
    phone: string,
    templateName: string,
    language: string,
    components: any[],
  ): Promise<ProviderResponse> {
    logger.info(`[MessageBirdProvider] Sending template ${templateName} to ${phone}`);
    try {
      const response = await axios.post(
        'https://conversations.messagebird.com/v1/send',
        {
          type: 'hsm',
          to: phone.replace(/[^0-9]/g, ''),
          from: process.env.MESSAGEBIRD_CHANNEL_ID,
          content: {
            hsm: {
              namespace: process.env.MESSAGEBIRD_TEMPLATE_NAMESPACE,
              templateName: templateName,
              language: {
                policy: 'deterministic',
                code: language,
              },
              components: components,
            },
          },
        },
        { headers: this.headers, timeout: 5000 },
      );

      return {
        success: true,
        messageId: response.data.id,
        raw: response.data,
      };
    } catch (err: any) {
      logger.error(`[MessageBirdProvider] Template failed`, err.response?.data || err.message);
      return { success: false, raw: err.response?.data };
    }
  }

  async sendMediaMessage(
    phone: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<ProviderResponse> {
    logger.info(`[MessageBirdProvider] Sending media to ${phone}`);
    try {
      const response = await axios.post(
        'https://conversations.messagebird.com/v1/send',
        {
          type: 'image', // Need to determine document vs image in a real impl
          to: phone.replace(/[^0-9]/g, ''),
          from: process.env.MESSAGEBIRD_CHANNEL_ID,
          content: {
            image: {
              url: mediaUrl,
              caption: caption,
            },
          },
        },
        { headers: this.headers, timeout: 8000 },
      );

      return {
        success: true,
        messageId: response.data.id,
        raw: response.data,
      };
    } catch (err: any) {
      logger.error(`[MessageBirdProvider] Media failed`, err.response?.data || err.message);
      return { success: false, raw: err.response?.data };
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    if (!process.env.MESSAGEBIRD_API_KEY) {
      return { status: 'down', lastChecked: new Date(), error: 'Missing Credentials' };
    }
    return { status: 'healthy', lastChecked: new Date() };
  }
}
