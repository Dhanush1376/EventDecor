import mongoose, { Schema, Document } from 'mongoose';

export interface IQuotationItem {
  description: string;
  amount: number;
}

export interface IQuotation {
  items: IQuotationItem[];
  tax: number;
  shipping: number;
  total: number;
  notes?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
}

export interface IMessage {
  sender: 'admin' | 'customer';
  senderName: string;
  text: string;
  attachments?: string[];
  createdAt: Date;
}

export interface ICustomOrder extends Document {
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  occasion: string;
  productType: string;
  inspirationImages: string[];
  customRequirements?: string;
  budget?: number;
  quantity?: number;
  eventDate?: Date;
  city?: string;
  bookingType: string;
  status: 'Pending' | 'Reviewing' | 'Quote Sent' | 'Approved' | 'In Progress' | 'Ready' | 'Delivered' | 'Cancelled';
  priority: 'low' | 'medium' | 'high';
  quotation: IQuotation;
  messages: IMessage[];
  adminNotes?: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationItemSchema = new Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true }
});

const QuotationSchema = new Schema({
  items: { type: [QuotationItemSchema], default: [] },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  notes: { type: String },
  status: {
    type: String,
    enum: ['draft', 'sent', 'approved', 'rejected'],
    default: 'draft'
  }
});

const MessageSchema = new Schema({
  sender: { type: String, enum: ['admin', 'customer'], required: true },
  senderName: { type: String, required: true },
  text: { type: String, required: true },
  attachments: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

const CustomOrderSchema: Schema = new Schema(
  {
    customerEmail: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    occasion: { type: String, required: true },
    productType: { type: String, required: true },
    inspirationImages: { type: [String], default: [] },
    customRequirements: { type: String },
    budget: { type: Number },
    quantity: { type: Number, default: 1 },
    eventDate: { type: Date },
    city: { type: String },
    bookingType: { type: String, default: 'Video Meet' },
    status: {
      type: String,
      enum: ['Pending', 'Reviewing', 'Quote Sent', 'Approved', 'In Progress', 'Ready', 'Delivered', 'Cancelled'],
      default: 'Pending',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true
    },
    quotation: { type: QuotationSchema, default: () => ({}) },
    messages: { type: [MessageSchema], default: [] },
    adminNotes: { type: String },
    archived: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

// High-Performance Production Compound Indexes for Paginated Bespoke Pipelines
CustomOrderSchema.index({ customerEmail: 1, createdAt: -1 });
CustomOrderSchema.index({ archived: 1, status: 1, createdAt: -1 });
CustomOrderSchema.index({ archived: 1, priority: 1, createdAt: -1 });

export default mongoose.model<ICustomOrder>('CustomOrder', CustomOrderSchema);
