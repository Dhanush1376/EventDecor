import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderDocument extends Document {
  orderId: mongoose.Types.ObjectId;
  orderType: 'Order' | 'RentalOrder' | 'CustomOrder';
  documentType: 'invoice' | 'shipping_label' | 'return_label' | 'rental_agreement' | 'packing_slip';
  fileUrl: string;
  s3Key: string;
  isBackedUp: boolean; // True if replicated to disaster recovery region/storage
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const OrderDocumentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, required: true, index: true },
    orderType: { type: String, enum: ['Order', 'RentalOrder', 'CustomOrder'], required: true },
    documentType: {
      type: String,
      enum: ['invoice', 'shipping_label', 'return_label', 'rental_agreement', 'packing_slip'],
      required: true,
    },
    fileUrl: { type: String, required: true },
    s3Key: { type: String, required: true },
    isBackedUp: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// Ensure one unique document of a specific type per entity, but allow multiple packing slips if they are linked to packages.
// Since we don't have packageId in the schema yet, let's remove the unique index or add metadata.packageId to it if needed.
// For now, dropping the unique index so we can have multiple packing slips per order if there are multiple packages.
// OrderDocumentSchema.index({ orderId: 1, documentType: 1 }, { unique: true });

export default mongoose.models.OrderDocument ||
  mongoose.model<IOrderDocument>('OrderDocument', OrderDocumentSchema);
