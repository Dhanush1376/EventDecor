import mongoose, { Schema, Model } from 'mongoose';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { IShipmentEvent } from '../types/shipmentEvent';

const ShipmentEventSchema = new Schema(
  {
    shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
    status: { type: String, required: true, index: true },
    location: {
      city: { type: String },
      hubName: { type: String },
    },
    timestamp: { type: Date, default: Date.now, index: true },
    source: {
      type: String,
      enum: ['courier_webhook', 'manual_scan', 'admin_override'],
      required: true,
    },
    rawPayload: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  },
);

ShipmentEventSchema.index({ shipmentId: 1, timestamp: -1 });

// Event sourcing models MUST be append-only, NO soft deletes allowed.
ShipmentEventSchema.plugin(ForensicAuditPlugin);

const ShipmentEvent = mongoose.model<IShipmentEvent, Model<IShipmentEvent>>(
  'ShipmentEvent',
  ShipmentEventSchema,
);

export default ShipmentEvent;
