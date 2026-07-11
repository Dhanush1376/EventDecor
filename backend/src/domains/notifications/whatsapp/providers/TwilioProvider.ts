import { IMessagingProvider, HealthStatus } from './IMessagingProvider';

export class TwilioProvider implements IMessagingProvider {
  name = 'twilio';
  async sendTextMessage() {
    return { success: true };
  }
  async sendTemplateMessage() {
    return { success: true };
  }
  async sendMediaMessage() {
    return { success: true };
  }
  async checkHealth(): Promise<HealthStatus> {
    return { status: 'healthy', lastChecked: new Date() };
  }
}
