import { ICourierAdapter, CourierQuote, TrackingInfo } from './CourierAdapter';
import { shippingConfig } from '../../../config/shippingConfig';
import { CourierHttpClient } from './CourierHttpClient';
import logger from '../../../config/logger';
import ApiError from '../../../utils/ApiError';

/**
 * Shiprocket courier adapter.
 *
 * The live Shiprocket serviceability/shipment API is not yet integrated. Rather
 * than fabricate quotes, AWB numbers, and tracking events (which would surface
 * fake shipping prices and fake tracking to customers), every method fails
 * explicitly until the real API is wired. Callers already degrade gracefully:
 *  - ETAEngine catches the error and falls back to zone-based SLA data.
 *  - CourierEngine/ShippingService should use the ManualCourierAdapter
 *    (in-house delivery) for the flat-rate model this business runs today.
 *
 * To go live with Shiprocket, implement the real API calls below (auth is
 * already wired) and remove the NOT_IMPLEMENTED guards.
 */
export class ShiprocketAdapter implements ICourierAdapter {
  private httpClient: CourierHttpClient;
  private token: string | null = null;

  constructor() {
    this.httpClient = new CourierHttpClient(shippingConfig.shiprocket.apiUrl);
  }

  private get isConfigured(): boolean {
    return shippingConfig.shiprocket.isConfigured;
  }

  private notImplemented(operation: string): never {
    throw new ApiError(
      501,
      `Shiprocket ${operation} is not configured. Use manual/in-house dispatch, ` +
        `or complete the Shiprocket API integration before enabling this courier.`,
    );
  }

  private async authenticate() {
    if (this.token) return;
    if (!this.isConfigured) {
      logger.warn('Shiprocket credentials not found in environment');
      this.notImplemented('authentication');
    }
    try {
      const res = await this.httpClient.request<{ token: string }>({
        url: '/auth/login',
        method: 'POST',
        providerName: 'Shiprocket',
        data: {
          email: shippingConfig.shiprocket.email,
          password: shippingConfig.shiprocket.password,
        },
      });
      this.token = res.token;
    } catch (error) {
      logger.error('Shiprocket authentication failed', error);
      throw new ApiError(502, 'Courier Gateway Error');
    }
  }

  async getQuotes(
    _originPincode: string,
    _destPincode: string,
    _weightKg: number,
    _dimensions: any,
  ): Promise<CourierQuote[]> {
    // Real serviceability call goes here once integrated.
    return this.notImplemented('rate quoting');
  }

  async createShipment(
    _shipmentData: any,
  ): Promise<{ trackingNumber: string; labelUrl?: string; additionalData?: any }> {
    return this.notImplemented('shipment creation');
  }

  async cancelShipment(_trackingNumber: string): Promise<boolean> {
    return this.notImplemented('shipment cancellation');
  }

  async trackShipment(_trackingNumber: string): Promise<TrackingInfo> {
    return this.notImplemented('shipment tracking');
  }
}
