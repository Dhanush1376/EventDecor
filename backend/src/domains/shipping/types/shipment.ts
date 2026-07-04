import mongoose from 'mongoose';

export interface IShipment extends mongoose.Document {
  shipmentId: string;
  orderId: mongoose.Types.ObjectId;
  packageIds: mongoose.Types.ObjectId[];
  courierPartner: string;
  courierBookingId?: string;
  awbNumber?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  qrCode?: string;
  qrSignature?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  status:
    | 'booked'
    | 'picked_up'
    | 'reached_local_hub'
    | 'reached_regional_hub'
    | 'in_transit'
    | 'reached_destination_hub'
    | 'out_for_delivery'
    | 'delivered'
    | 'rto';
  courierWebhookEvents: {
    rawPayload: any;
    timestamp: Date;
  }[];
  photos: {
    pickup: string[];
    delivery: string[];
  };
  deliveryProof?: {
    signature?: string;
    photo?: string;
    otp?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
