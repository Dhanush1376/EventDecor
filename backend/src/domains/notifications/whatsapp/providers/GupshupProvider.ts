import { IMessagingProvider, ProviderResponse, HealthStatus } from './IMessagingProvider';
import logger from '../../../../config/logger';
import axios from 'axios';

export class GupshupProvider implements IMessagingProvider {
  name = 'gupshup';

  private get headers() {
    return {
      apikey: process.env.GUPSHUP_API_KEY || '',
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private get sourceNumber() {
    return process.env.GUPSHUP_SOURCE_NUMBER || '';
  }

  async sendTextMessage(phone: string, message: string): Promise<ProviderResponse> {
    logger.info(`[GupshupProvider] Sending text to ${phone}`);
    try {
      const data = new URLSearchParams();
      data.append('channel', 'whatsapp');
      data.append('source', this.sourceNumber);
      data.append('destination', phone.replace(/[^0-9]/g, ''));
      data.append('message', JSON.stringify({ type: 'text', text: message }));
      data.append('src.name', process.env.GUPSHUP_APP_NAME || '');

      const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', data.toString(), {
        headers: this.headers,
        timeout: 5000,
      });

      return {
        success: true,
        messageId: response.data.messageId,
        raw: response.data,
      };
    } catch (err: any) {
      logger.error(`[GupshupProvider] Text message failed`, err.response?.data || err.message);
      return { success: false, raw: err.response?.data };
    }
  }

  async sendTemplateMessage(
    phone: string,
    templateName: string,
    language: string,
    components: any[],
  ): Promise<ProviderResponse> {
    logger.info(`[GupshupProvider] Sending template ${templateName} to ${phone}`);
    try {
      // Gupshup uses a flat array for template parameters
      const templateParams: string[] = [];
      components.forEach((comp) => {
        if (comp.parameters) {
          comp.parameters.forEach((p: any) => {
            templateParams.push(p.text);
          });
        }
      });

      const messageObj = {
        type: 'template',
        template: {
          id: templateName,
          data: templateParams,
        },
      };

      const data = new URLSearchParams();
      data.append('channel', 'whatsapp');
      data.append('source', this.sourceNumber);
      data.append('destination', phone.replace(/[^0-9]/g, ''));
      data.append('message', JSON.stringify(messageObj));
      data.append('src.name', process.env.GUPSHUP_APP_NAME || '');

      const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', data.toString(), {
        headers: this.headers,
        timeout: 5000,
      });

      return {
        success: true,
        messageId: response.data.messageId,
        raw: response.data,
      };
    } catch (err: any) {
      logger.error(`[GupshupProvider] Template failed`, err.response?.data || err.message);
      return { success: false, raw: err.response?.data };
    }
  }

  async sendMediaMessage(
    phone: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<ProviderResponse> {
    logger.info(`[GupshupProvider] Sending media to ${phone}`);
    try {
      const data = new URLSearchParams();
      data.append('channel', 'whatsapp');
      data.append('source', this.sourceNumber);
      data.append('destination', phone.replace(/[^0-9]/g, ''));
      data.append(
        'message',
        JSON.stringify({
          type: 'file',
          url: mediaUrl,
          caption: caption || '',
        }),
      );
      data.append('src.name', process.env.GUPSHUP_APP_NAME || '');

      const response = await axios.post('https://api.gupshup.io/sm/api/v1/msg', data.toString(), {
        headers: this.headers,
        timeout: 8000,
      });

      return {
        success: true,
        messageId: response.data.messageId,
        raw: response.data,
      };
    } catch (err: any) {
      logger.error(`[GupshupProvider] Media failed`, err.response?.data || err.message);
      return { success: false, raw: err.response?.data };
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    if (!process.env.GUPSHUP_API_KEY) {
      return { status: 'down', lastChecked: new Date(), error: 'Missing Credentials' };
    }
    return { status: 'healthy', lastChecked: new Date() };
  }
}
