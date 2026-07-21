import { ICourierAdapter } from './CourierAdapter';
import { ShiprocketAdapter } from './ShiprocketAdapter';
import { ManualCourierAdapter } from './ManualCourierAdapter';
// Import adapters
import { DelhiveryAdapter } from './adapters/DelhiveryAdapter';
import { BlueDartAdapter } from './adapters/BlueDartAdapter';
import { DTDCAdapter } from './adapters/DTDCAdapter';
import { XpressbeesAdapter } from './adapters/XpressbeesAdapter';

export class CourierAdapterFactory {
  static getAdapter(providerName: string): ICourierAdapter {
    const normalized = providerName.toLowerCase().replace(/\s+/g, '');

    switch (normalized) {
      case 'shiprocket':
        return new ShiprocketAdapter();
      case 'delhivery':
        return new DelhiveryAdapter();
      case 'bluedart':
        return new BlueDartAdapter();
      case 'dtdc':
        return new DTDCAdapter();
      case 'xpressbees':
        return new XpressbeesAdapter();
      case 'localcourier':
      case 'standardcourier':
      case 'manual':
      default:
        return new ManualCourierAdapter();
    }
  }
}
