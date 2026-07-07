import { ICourierAdapter, CourierQuote, TrackingInfo } from './CourierAdapter';

export class ManualCourierAdapter implements ICourierAdapter {
  async getQuotes(
    _originPincode: string,
    _destPincode: string,
    _weightKg: number,
    _dimensions: any,
  ): Promise<CourierQuote[]> {
    return [
      {
        courierName: 'In-House Delivery',
        serviceType: 'Local',
        estimatedCharge: 0,
        estimatedDeliveryDays: 1,
        trackingProvided: false,
      },
    ];
  }

  async createShipment(
    _shipmentData: any,
  ): Promise<{ trackingNumber: string; labelUrl?: string; additionalData?: any }> {
    // Generate a local tracking ID
    const trackingNumber = `LOCAL-${Date.now().toString().slice(-6)}`;
    return {
      trackingNumber,
    };
  }

  async cancelShipment(_trackingNumber: string): Promise<boolean> {
    return true;
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    // Manual tracking relies entirely on our own operational scans (e.g. delivery driver scanning QR)
    return {
      trackingNumber,
      status: 'Dispatched via Local Driver',
      updatedAt: new Date(),
      events: [{ status: 'Dispatched', timestamp: new Date() }],
    };
  }
}
