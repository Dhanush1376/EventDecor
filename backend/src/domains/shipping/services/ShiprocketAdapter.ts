import { ICourierAdapter, CourierQuote, TrackingInfo } from './CourierAdapter';
import axios from 'axios';
import logger from '../../../config/logger';
import ApiError from '../../../utils/ApiError';

export class ShiprocketAdapter implements ICourierAdapter {
  private baseUrl = 'https://apiv2.shiprocket.in/v1/external';
  private token: string | null = null;

  private async authenticate() {
    if (this.token) return;
    try {
      const email = process.env.SHIPROCKET_EMAIL;
      const password = process.env.SHIPROCKET_PASSWORD;

      if (!email || !password) {
        logger.warn('Shiprocket credentials not found in environment');
        return;
      }

      const res = await axios.post(`${this.baseUrl}/auth/login`, { email, password });
      this.token = res.data.token;
    } catch (error) {
      logger.error('Shiprocket authentication failed', error);
      throw new ApiError(502, 'Courier Gateway Error');
    }
  }

  async getQuotes(
    originPincode: string,
    destPincode: string,
    weightKg: number,
    dimensions: any,
  ): Promise<CourierQuote[]> {
    await this.authenticate();
    // Simplified mock implementation since actual Shiprocket API requires fully formed order payload to get accurate courier serviceability
    return [
      {
        courierName: 'Delhivery Surface',
        serviceType: 'Surface',
        estimatedCharge: weightKg * 45,
        estimatedDeliveryDays: 5,
        trackingProvided: true,
      },
      {
        courierName: 'Xpressbees Air',
        serviceType: 'Express',
        estimatedCharge: weightKg * 110,
        estimatedDeliveryDays: 2,
        trackingProvided: true,
      },
    ];
  }

  async createShipment(
    shipmentData: any,
  ): Promise<{ trackingNumber: string; labelUrl?: string; additionalData?: any }> {
    await this.authenticate();
    // Mock implementation
    const awb = `SR-${Date.now().toString().slice(-8)}`;
    return {
      trackingNumber: awb,
      labelUrl: `https://labels.shiprocket.in/${awb}.pdf`,
    };
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    await this.authenticate();
    // Mock implementation
    return true;
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    await this.authenticate();
    // Mock implementation
    return {
      trackingNumber,
      status: 'In Transit',
      location: 'Hub, Bangalore',
      updatedAt: new Date(),
      events: [
        {
          status: 'Picked Up',
          timestamp: new Date(Date.now() - 86400000),
          location: 'Warehouse, Ongole',
        },
        { status: 'In Transit', timestamp: new Date(), location: 'Hub, Bangalore' },
      ],
    };
  }
}
