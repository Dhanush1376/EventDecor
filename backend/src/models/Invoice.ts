import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  transactionId: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  domain: 'purchase' | 'rental' | 'event' | 'custom';
  lineItems: IInvoiceLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  totalAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'REFUNDED';
  issuedAt?: Date;
  dueDate?: Date;
  paidAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineItemSchema = new Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 },
});

const InvoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    domain: { type: String, enum: ['purchase', 'rental', 'event', 'custom'], required: true },
    lineItems: [InvoiceLineItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED'],
      default: 'DRAFT',
      index: true,
    },
    issuedAt: { type: Date },
    dueDate: { type: Date },
    paidAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  },
);

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export default Invoice;
