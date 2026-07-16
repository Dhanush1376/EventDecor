import { IMessagingProvider } from './providers/IMessagingProvider';
import { WhatsAppProviderFactory } from './providers/WhatsAppProviderFactory';
import WhatsAppRoutingRule from '../../../models/WhatsAppRoutingRule';
import logger from '../../../config/logger';

export class SmartRouter {
  /**
   * Determine the optimal provider chain for a given message category.
   * If a routing rule exists, it uses the preferredProvider and fallbackProviders.
   * Otherwise, it defaults to the global provider chain.
   */
  static async getRoute(category: string = 'utility'): Promise<IMessagingProvider> {
    const { ProviderCircuitBreaker } = require('./providers/ProviderCircuitBreaker');
    try {
      const rule = await WhatsAppRoutingRule.findOne({ category, enabled: true })
        .sort({ priority: -1 })
        .lean();

      const globalChain = WhatsAppProviderFactory.getProviderChain();

      let routedChain: IMessagingProvider[] = [];

      if (!rule) {
        routedChain = globalChain;
      } else {
        // Helper to find and add provider if healthy
        const addProvider = (name: string) => {
          const provider = globalChain.find((p) => p.name === name);
          if (provider && !routedChain.includes(provider)) {
            routedChain.push(provider);
          }
        };

        // 1. Add preferred provider
        addProvider(rule.preferredProvider);

        // 2. Add fallbacks
        if (rule.fallbackProviders && rule.fallbackProviders.length > 0) {
          for (const fb of rule.fallbackProviders) {
            addProvider(fb);
          }
        }

        // 3. Ensure we have at least something by appending global chain
        for (const p of globalChain) {
          if (!routedChain.includes(p)) {
            routedChain.push(p);
          }
        }
      }

      for (const provider of routedChain) {
        if (ProviderCircuitBreaker.isAvailable(provider.name)) {
          return provider;
        }
      }

      logger.error(
        `[SmartRouter] All providers are OPEN for category ${category}. Falling back to default.`,
      );
      return globalChain[0];
    } catch (err) {
      logger.error(`[SmartRouter] Error getting route for category ${category}`, err);
      // Fallback to global chain
      const globalChain = WhatsAppProviderFactory.getProviderChain();
      for (const provider of globalChain) {
        if (ProviderCircuitBreaker.isAvailable(provider.name)) {
          return provider;
        }
      }
      return globalChain[0];
    }
  }
}
