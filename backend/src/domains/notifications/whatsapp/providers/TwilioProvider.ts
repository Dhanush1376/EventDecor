import { IMessagingProvider, ProviderResponse, HealthStatus } from './IMessagingProvider';
import logger from '../../../../config/logger';
import axios from 'axios';

export class TwilioProvider implements IMessagingProvider {
  name = 'twilio';

  private get authHeader() {
    const sid = process.env.TWILIO_ACCOUNT_SID || '';
    const token = process.env.TWILIO_AUTH_TOKEN || '';
    return `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`;
  }

  private get fromNumber() {
    return `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || ''}`;
  }

  private formatPhone(phone: string) {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return `whatsapp:+${cleaned}`;
  }

  async sendTextMessage(phone: string, message: string): Promise<ProviderResponse> {
    logger.info(`[TwilioProvider] Sending text to ${phone}`);
    try {
      const data = new URLSearchParams();
      data.append('To', this.formatPhone(phone));
      data.append('From', this.fromNumber);
      data.append('Body', message);

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        data.toString(),
        {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 5000,
        },
      );

      return {
        success: true,
        messageId: response.data.sid,
        raw: response.data,
      };
    } catch (err: any) {
      logger.error(`[TwilioProvider] Text message failed`, err.response?.data || err.message);
      return { success: false, raw: err.response?.data };
    }
  }

  async sendTemplateMessage(
    phone: string,
    templateName: string,
    language: string,
    components: any[],
  ): Promise<ProviderResponse> {
    logger.info(`[TwilioProvider] Sending template ${templateName} to ${phone}`);
    // Twilio requires you to pre-register templates and use the exact body string
    // Or you use Content API. This uses the basic Content SID approach.
    try {
      const data = new URLSearchParams();
      data.append('To', this.formatPhone(phone));
      data.append('From', this.fromNumber);
      // Assuming ContentVariables is passed for approved templates using Twilio Content API
      data.append('ContentSid', templateName); // templateName needs to be the Hx... SID

      const contentVars: Record<string, string> = {};
      components.forEach((comp, idx) => {
        if (comp.parameters) {
          comp.parameters.forEach((p: any, pIdx: number) => {
            contentVars[`${idx + 1}`] = p.text;
          });
        }
      });
      data.append('ContentVariables', JSON.stringify(contentVars));

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        data.toString(),
        {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 5000,
        },
      );

      return {
        success: true,
        messageId: response.data.sid,
        raw: response.data,
      };
    } catch (err: any) {
      logger.error(`[TwilioProvider] Template failed`, err.response?.data || err.message);
      return { success: false, raw: err.response?.data };
    }
  }

  async sendMediaMessage(
    phone: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<ProviderResponse> {
    logger.info(`[TwilioProvider] Sending media to ${phone}`);
    try {
      const data = new URLSearchParams();
      data.append('To', this.formatPhone(phone));
      data.append('From', this.fromNumber);
      data.append('MediaUrl', mediaUrl);
      if (caption) {
        data.append('Body', caption);
      }

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        data.toString(),
        {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 8000,
        },
      );

      return {
        success: true,
        messageId: response.data.sid,
        raw: response.data,
      };
    } catch (err: any) {
      logger.error(`[TwilioProvider] Media failed`, err.response?.data || err.message);
      return { success: false, raw: err.response?.data };
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return { status: 'down', lastChecked: new Date(), error: 'Missing Credentials' };
    }
    return { status: 'healthy', lastChecked: new Date() };
  }
}
