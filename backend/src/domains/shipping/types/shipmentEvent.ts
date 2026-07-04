import mongoose from 'mongoose';

export interface IShipmentEvent extends mongoose.Document {
  shipmentId: mongoose.Types.ObjectId;
  status: string;
  location?: {
    city?: string;
    hubName?: string;
  };
  timestamp: Date;
  source: 'courier_webhook' | 'manual_scan' | 'admin_override';
  rawPayload?: any;
  createdAt: Date;
  updatedAt: Date;
}
