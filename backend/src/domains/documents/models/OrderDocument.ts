import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderDocument extends Document {
  orderId: mongoose.Types.ObjectId;
  orderType: 'Order' | 'RentalOrder' | 'CustomOrder';
  documentType: 'invoice' | 'shipping_label' | 'return_label' | 'rental_agreement';
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
      enum: ['invoice', 'shipping_label', 'return_label', 'rental_agreement'],
      required: true,
    },
    fileUrl: { type: String, required: true },
    s3Key: { type: String, required: true },
    isBackedUp: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

OrderDocumentSchema.index({ orderId: 1, documentType: 1 }, { unique: true });

export default mongoose.models.OrderDocument ||
  mongoose.model<IOrderDocument>('OrderDocument', OrderDocumentSchema);
