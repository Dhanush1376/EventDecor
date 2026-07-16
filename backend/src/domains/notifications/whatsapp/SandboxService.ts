import { ProviderResponse } from './providers/IMessagingProvider';
import { randomUUID as uuidv4 } from 'crypto';

export class SandboxService {
  /**
   * Simulates sending a message without hitting any real APIs.
   * Returns a dummy ProviderResponse.
   */
  static async simulateSend(
    providerName: string,
    phone: string,
    renderedMessage: string,
    isMedia: boolean,
  ): Promise<ProviderResponse> {
    return new Promise((resolve) => {
      // Add artificial delay to simulate network call (50-200ms)
      const delay = Math.floor(Math.random() * 150) + 50;

      setTimeout(() => {
        resolve({
          success: true,
          messageId: `sandbox-${uuidv4()}`,
          raw: {
            simulated: true,
            provider: providerName,
            recipient: phone,
            type: isMedia ? 'media' : 'text/template',
            payloadLength: renderedMessage.length,
            timestamp: new Date().toISOString(),
          },
        });
      }, delay);
    });
  }

  /**
   * Check if global sandbox mode is enabled via environment.
   */
  static isSandboxModeEnabled(): boolean {
    return process.env.WA_SANDBOX_MODE === 'true';
  }
}
