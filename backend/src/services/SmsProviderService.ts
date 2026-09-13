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

/**
 * Normalizes any Indian phone representation (e.g. +919876543210, 09876543210, 919876543210)
 * down to the raw 10-digit Indian mobile number expected by domestic SMS gateways.
 */
export function normalizeIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Masks phone number for security audits & application logs (e.g., +91 ******6648)
 * Never exposes raw customer phone numbers in logging streams.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `+91 ******${digits.slice(-4)}`;
  }
  return '******';
}

export class Fast2SmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string): Promise<SmsResult> {
    const apiKey = process.env.FAST2SMS_API_KEY?.trim();

    if (!apiKey || apiKey === 'your_fast2sms_api_key_here') {
      logger.error('[SMS_PROVIDER] FAST2SMS_API_KEY missing or unconfigured in environment');
      return { success: false, error: 'SMS Gateway Configuration Error' };
    }

    const normalizedPhone = normalizeIndianPhone(phone);
    if (normalizedPhone.length !== 10 || !/^[6-9]\d{9}$/.test(normalizedPhone)) {
      logger.error('[SMS_PROVIDER] Invalid Indian mobile number format for Fast2SMS dispatch');
      return { success: false, error: 'Invalid recipient phone number' };
    }

    try {
      const message = `Your OTP for Siri Arts & Crafts is ${otp}. Valid for 5 minutes. Please do not share this code.`;
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: apiKey,
        },
        body: JSON.stringify({
          route: 'q',
          message,
          numbers: normalizedPhone,
        }),
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        const errMsg = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || `HTTP ${response.status}`;
        logger.error(`[SMS_PROVIDER] Fast2SMS HTTP error ${response.status}: ${errMsg}`);
        return { success: false, error: errMsg };
      }

      if (data?.return === true) {
        const messageId =
          data?.request_id ||
          (Array.isArray(data?.message) ? data.message[0] : `fast2sms-${Date.now()}`);
        logger.info(
          `[SMS_PROVIDER] OTP successfully dispatched via Fast2SMS to ${maskPhone(phone)}`,
        );
        return { success: true, messageId: String(messageId) };
      } else {
        const errMsg = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || 'Unknown Fast2SMS Error';
        logger.error(`[SMS_PROVIDER] Fast2SMS dispatch failed: ${errMsg}`);
        return { success: false, error: errMsg };
      }
    } catch (error: any) {
      logger.error(`[SMS_PROVIDER] Failed to send SMS via Fast2SMS: ${error.message}`);
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
  const configuredProvider = (process.env.SMS_PROVIDER || '').trim().toLowerCase();

  if (configuredProvider === 'fast2sms') {
    if (
      process.env.NODE_ENV === 'development' &&
      (!process.env.FAST2SMS_API_KEY || process.env.FAST2SMS_API_KEY.trim() === '')
    ) {
      return new MockSmsProvider();
    }
    return new Fast2SmsProvider();
  }

  if (configuredProvider === 'mock') {
    return new MockSmsProvider();
  }

  if (configuredProvider !== '') {
    logger.error(
      `[SMS_PROVIDER] Unsupported SMS provider configured: "${configuredProvider}". Supported providers: fast2sms, mock`,
    );
    throw new Error(
      `Unsupported SMS provider: "${configuredProvider}". Supported providers: fast2sms, mock`,
    );
  }

  // Auto-detection based on configured credentials
  if (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim() !== '') {
    return new Fast2SmsProvider();
  }

  if (process.env.NODE_ENV === 'development') {
    return new MockSmsProvider();
  }

  return new Fast2SmsProvider();
}
