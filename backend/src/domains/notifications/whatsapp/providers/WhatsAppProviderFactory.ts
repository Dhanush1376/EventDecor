import { IMessagingProvider } from './IMessagingProvider';
import { MetaCloudProvider } from './MetaCloudProvider';
import { TwilioProvider } from './TwilioProvider';
import { GupshupProvider } from './GupshupProvider';

export class WhatsAppProviderFactory {
  static getProvider(): IMessagingProvider {
    const provider = process.env.WHATSAPP_PROVIDER || 'meta_cloud';
    switch (provider) {
      case 'twilio':
        return new TwilioProvider();
      case 'gupshup':
        return new GupshupProvider();
      case 'meta_cloud':
      default:
        return new MetaCloudProvider();
    }
  }
}
