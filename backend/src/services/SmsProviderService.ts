import fs from 'fs';
import path from 'path';
import logger from '../config/logger';

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsProvider {
  sendOtp(phone: string, otp: string): Promise<SmsResult>;
}

export class Msg91Provider implements SmsProvider {
  async sendOtp(phone: string, otp: string): Promise<SmsResult> {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;

    if (!authKey || !templateId) {
      logger.error('[SMS_PROVIDER] MSG91 credentials missing in production environment');
      return { success: false, error: 'SMS Gateway Configuration Error' };
    }

    try {
      const response = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: authKey,
        },
        body: JSON.stringify({
          template_id: templateId,
          mobile: phone,
          otp,
        }),
      });

      if (!response.ok) {
        throw new Error(`MSG91 API responded with status: ${response.status}`);
      }

      const data = (await response.json()) as any;

      if (data.type === 'success') {
        return { success: true, messageId: data.message };
      } else {
        return { success: false, error: data.message || 'Unknown MSG91 Error' };
      }
    } catch (error: any) {
      logger.error(`[SMS_PROVIDER] Failed to send SMS via MSG91: ${error.message}`);
      return { success: false, error: 'SMS Gateway Communication Error' };
    }
  }
}

export class MockSmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string): Promise<SmsResult> {
    try {
      const logPath = path.resolve(process.cwd(), '.dev-otp-log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] To: ${phone} | OTP: ${otp}\n`;

      fs.appendFileSync(logPath, logEntry, 'utf8');

      return { success: true, messageId: `mock-${Date.now()}` };
    } catch (_error) {
      // Intentionally not logging raw OTP values to app logger
      return { success: false, error: 'Mock SMS Provider Error' };
    }
  }
}

export function getSmsProvider(): SmsProvider {
  if (process.env.NODE_ENV === 'development' && !process.env.MSG91_AUTH_KEY) {
    return new MockSmsProvider();
  }
  return new Msg91Provider();
}
