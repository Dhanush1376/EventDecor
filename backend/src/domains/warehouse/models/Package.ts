import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { IPackage } from '../types/package';

const PackageSchema = new Schema(
  {
    packageId: { type: String, required: true, unique: true, index: true },
    barcode: { type: String, index: true }, // Encodes the packageId for printing
    version: { type: Number, default: 0 }, // For optimistic concurrency control
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    packageNumber: { type: Number, default: 1 },
    totalPackages: { type: Number, default: 1 },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        sku: { type: String, required: true },
        quantity: { type: Number, required: true },
        variantId: { type: String },
        verified: { type: Boolean, default: false },
      },
    ],
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    packageType: {
      type: String,
      enum: ['standard', 'fragile', 'oversized', 'custom'],
      default: 'standard',
    },
    doublePackaging: { type: Boolean, default: false },
    qrCode: { type: String },
    qrSignature: { type: String },
    shippingLabel: {
      url: { type: String },
      generatedAt: { type: Date },
    },
    photos: {
      items: [{ type: String }],
      sealed: [{ type: String }],
      label: [{ type: String }],
    },
    status: {
      type: String,
      enum: [
        'created',
        'items_verified',
        'packed',
        'sealed',
        'labeled',
        'ready_for_pickup',
        'shipped',
        'dispatched', // Shipped implies courier has it, dispatched implies it left the warehouse via courier
      ],
      default: 'created',
      index: true,
    },
    packedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
    },
    sealedAt: { type: Date },
    labeledAt: { type: Date },
    shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment', index: true },
  },
  {
    timestamps: true,
  },
);

PackageSchema.plugin(SoftDeletePlugin);
PackageSchema.plugin(ForensicAuditPlugin);

const Package = mongoose.model<IPackage, SoftDeleteModel<IPackage>>('Package', PackageSchema);

export default Package;
