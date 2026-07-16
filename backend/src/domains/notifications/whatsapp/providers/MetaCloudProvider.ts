import { IMessagingProvider, ProviderResponse, HealthStatus } from './IMessagingProvider';
import logger from '../../../../config/logger';
import axios from 'axios';

export class MetaCloudProvider implements IMessagingProvider {
  name = 'meta_cloud';

  private get baseUrl() {
    const phoneId = process.env.WA_PHONE_ID;
    const apiVersion = process.env.WA_API_VERSION || 'v21.0';
    return `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${process.env.WA_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  async sendTextMessage(phone: string, message: string): Promise<ProviderResponse> {
    logger.info(`[MetaCloudProvider] Sending session text to ${phone}`);
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { preview_url: false, body: message },
        },
        { headers: this.headers, timeout: 5000 },
      );

      const rateLimitInfo = response.headers['x-business-use-case-usage']
        ? JSON.parse(response.headers['x-business-use-case-usage'])
        : undefined;

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id || `wam-${Date.now()}`,
        raw: { ...response.data, rateLimitInfo },
      };
    } catch (err: any) {
      logger.error(`[MetaCloudProvider] Text message failed`, err.response?.data || err.message);
      throw new Error(err.response?.data?.error?.message || err.message, { cause: err });
    }
  }

  async sendTemplateMessage(
    phone: string,
    templateName: string,
    language: string,
    components: any[],
  ): Promise<ProviderResponse> {
    logger.info(`[MetaCloudProvider] Sending utility template ${templateName} to ${phone}`);
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone.replace(/[^0-9]/g, ''),
          type: 'template',
          template: {
            name: templateName,
            language: { code: language },
            components: components,
          },
        },
        { headers: this.headers, timeout: 5000 },
      );

      const rateLimitInfo = response.headers['x-business-use-case-usage']
        ? JSON.parse(response.headers['x-business-use-case-usage'])
        : undefined;

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id || `wam-${Date.now()}`,
        raw: { ...response.data, rateLimitInfo },
      };
    } catch (err: any) {
      logger.error(
        `[MetaCloudProvider] Template message failed`,
        err.response?.data || err.message,
      );
      throw new Error(err.response?.data?.error?.message || err.message, { cause: err });
    }
  }

  async sendMediaMessage(
    phone: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<ProviderResponse> {
    logger.info(`[MetaCloudProvider] Sending media ${mediaUrl} to ${phone}`);
    // Simplified media payload for Meta
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone.replace(/[^0-9]/g, ''),
          type: 'document',
          document: { link: mediaUrl, caption: caption },
        },
        { headers: this.headers, timeout: 8000 },
      );

      const rateLimitInfo = response.headers['x-business-use-case-usage']
        ? JSON.parse(response.headers['x-business-use-case-usage'])
        : undefined;

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id || `wam-${Date.now()}`,
        raw: { ...response.data, rateLimitInfo },
      };
    } catch (err: any) {
      logger.error(`[MetaCloudProvider] Media message failed`, err.response?.data || err.message);
      throw new Error(err.response?.data?.error?.message || err.message, { cause: err });
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    if (!process.env.WA_PHONE_ID || !process.env.WA_TOKEN) {
      return { status: 'down', lastChecked: new Date(), error: 'Missing Credentials' };
    }
    try {
      const apiVersion = process.env.WA_API_VERSION || 'v21.0';
      const phoneId = process.env.WA_PHONE_ID;
      await axios.get(`https://graph.facebook.com/${apiVersion}/${phoneId}`, {
        headers: this.headers,
        timeout: 5000,
      });
      return { status: 'healthy', lastChecked: new Date() };
    } catch (error: any) {
      logger.error(`[MetaCloudProvider] Health check failed`, error.message);
      return { status: 'down', lastChecked: new Date(), error: error.message };
    }
  }
}
