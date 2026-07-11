import { IMessagingProvider, HealthStatus } from './IMessagingProvider';

export class GupshupProvider implements IMessagingProvider {
  name = 'gupshup';
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
