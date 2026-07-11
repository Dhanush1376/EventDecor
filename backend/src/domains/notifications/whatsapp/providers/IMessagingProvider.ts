export interface ProviderResponse {
  success: boolean;
  messageId?: string;
  raw?: any;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  latencyMs?: number;
  lastChecked: Date;
  error?: string;
}

export interface IMessagingProvider {
  name: string;
  sendTextMessage(phone: string, message: string): Promise<ProviderResponse>;
  sendTemplateMessage(
    phone: string,
    templateName: string,
    language: string,
    components: any[],
  ): Promise<ProviderResponse>;
  sendMediaMessage(phone: string, mediaUrl: string, caption?: string): Promise<ProviderResponse>;
  checkHealth(): Promise<HealthStatus>;
}
