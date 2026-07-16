import { IMessagingProvider } from './IMessagingProvider';
import { MetaCloudProvider } from './MetaCloudProvider';
import { TwilioProvider } from './TwilioProvider';
import { GupshupProvider } from './GupshupProvider';
import { MessageBirdProvider } from './MessageBirdProvider';
import { ProviderCircuitBreaker } from './ProviderCircuitBreaker';
import WhatsAppProviderConfig from '../../../../models/WhatsAppProviderConfig';
import logger from '../../../../config/logger';

export class WhatsAppProviderFactory {
  // Instance cache for providers
  private static providers: Record<string, IMessagingProvider> = {
    meta_cloud: new MetaCloudProvider(),
    twilio: new TwilioProvider(),
    gupshup: new GupshupProvider(),
    messagebird: new MessageBirdProvider(),
  };

  /**
   * Returns the first available provider based on DB priority and circuit breaker status.
   */
  static async getAvailableProvider(): Promise<IMessagingProvider> {
    const configs = await WhatsAppProviderConfig.find({ isEnabled: true }).sort({ priority: 1 });

    // If DB has no configs, fallback to env
    if (configs.length === 0) {
      const defaultProviderName = process.env.WHATSAPP_PROVIDER || 'meta_cloud';
      const isHealthy = await ProviderCircuitBreaker.isAvailable(defaultProviderName);
      if (isHealthy) {
        return this.providers[defaultProviderName] || this.providers['meta_cloud'];
      }
      throw new Error(
        `[WhatsAppProviderFactory] Default provider ${defaultProviderName} is unavailable (Circuit OPEN).`,
      );
    }

    for (const config of configs) {
      const isHealthy = await ProviderCircuitBreaker.isAvailable(config.providerName);
      if (isHealthy) {
        return this.providers[config.providerName];
      }
    }

    logger.error('[WhatsAppProviderFactory] ALL PROVIDERS EXHAUSTED OR UNAVAILABLE');
    throw new Error('All WhatsApp providers are unavailable (Circuits OPEN)');
  }

  static getProviderByName(name: string): IMessagingProvider {
    return this.providers[name] || this.providers['meta_cloud'];
  }

  static getProviderChain(): IMessagingProvider[] {
    return Object.values(this.providers);
  }
}
