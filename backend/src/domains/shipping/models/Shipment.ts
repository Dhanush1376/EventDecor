import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { IShipment } from '../types/shipment';

const ShipmentSchema = new Schema(
  {
    shipmentId: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    packageIds: [{ type: Schema.Types.ObjectId, ref: 'Package' }],
    courierPartner: { type: String, required: true },
    courierBookingId: { type: String, index: true },
    awbNumber: { type: String, index: true },
    trackingNumber: { type: String, index: true },
    trackingUrl: { type: String },
    qrCode: { type: String },
    qrSignature: { type: String },
    estimatedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    status: {
      type: String,
      enum: [
        'booked',
        'picked_up',
        'reached_local_hub',
        'reached_regional_hub',
        'in_transit',
        'reached_destination_hub',
        'out_for_delivery',
        'delivered',
        'rto',
      ],
      default: 'booked',
      index: true,
    },
    courierWebhookEvents: [
      {
        rawPayload: { type: Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    photos: {
      pickup: [{ type: String }],
      delivery: [{ type: String }],
    },
    deliveryProof: {
      signature: { type: String },
      photo: { type: String },
      otp: { type: String },
    },
  },
  {
    timestamps: true,
  },
);

ShipmentSchema.plugin(SoftDeletePlugin);
ShipmentSchema.plugin(ForensicAuditPlugin);

const Shipment = mongoose.model<IShipment, SoftDeleteModel<IShipment>>('Shipment', ShipmentSchema);

export default Shipment;
