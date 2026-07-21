import { ICourierAdapter, CourierQuote, TrackingInfo } from '../CourierAdapter';
import ApiError from '../../../../utils/ApiError';
import { shippingConfig } from '../../../../config/shippingConfig';
import { CourierHttpClient } from '../CourierHttpClient';

export class XpressbeesAdapter implements ICourierAdapter {
  private httpClient: CourierHttpClient;
  private providerName = 'Xpressbees';

  constructor() {
    this.httpClient = new CourierHttpClient(shippingConfig.xpressbees.apiUrl);
  }

  private notImplemented(operation: string): never {
    throw new ApiError(
      501,
      `${this.providerName} ${operation} is not configured. Missing API keys in environment.`,
    );
  }

  private checkConfig(operation: string) {
    if (!shippingConfig.xpressbees.isConfigured) {
      this.notImplemented(operation);
    }
  }

  async getQuotes(
    _originPincode: string,
    _destPincode: string,
    _weightKg: number,
    _dimensions: any,
  ): Promise<CourierQuote[]> {
    this.checkConfig('rate quoting');
    return [];
  }

  async createShipment(
    _shipmentData: any,
  ): Promise<{ trackingNumber: string; labelUrl?: string; additionalData?: any }> {
    this.checkConfig('shipment creation');
    return { trackingNumber: '' };
  }

  async cancelShipment(_trackingNumber: string): Promise<boolean> {
    this.checkConfig('shipment cancellation');
    return false;
  }

  async trackShipment(_trackingNumber: string): Promise<TrackingInfo> {
    this.checkConfig('shipment tracking');
    return { trackingNumber: '', status: '', updatedAt: new Date(), events: [] };
  }
}
