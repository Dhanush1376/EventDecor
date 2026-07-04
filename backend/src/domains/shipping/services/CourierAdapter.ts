export interface CourierQuote {
  courierName: string;
  serviceType: string;
  estimatedCharge: number;
  estimatedDeliveryDays: number;
  trackingProvided: boolean;
}

export interface TrackingInfo {
  trackingNumber: string;
  status: string;
  location?: string;
  estimatedDeliveryDate?: Date;
  updatedAt: Date;
  events: Array<{
    status: string;
    timestamp: Date;
    location?: string;
    description?: string;
  }>;
}

export interface ICourierAdapter {
  /**
   * Fetches quotes/rates from the courier for a specific shipment
   */
  getQuotes(
    originPincode: string,
    destPincode: string,
    weightKg: number,
    dimensions: { length: number; width: number; height: number },
  ): Promise<CourierQuote[]>;

  /**
   * Books a shipment with the courier and returns the AWB/Tracking number and Label URL
   */
  createShipment(
    shipmentData: any,
  ): Promise<{ trackingNumber: string; labelUrl?: string; additionalData?: any }>;

  /**
   * Cancels a booked shipment
   */
  cancelShipment(trackingNumber: string): Promise<boolean>;

  /**
   * Fetches the latest tracking information for a shipment
   */
  trackShipment(trackingNumber: string): Promise<TrackingInfo>;
}
