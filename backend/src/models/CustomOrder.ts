import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';

// ─── Sub-Document Interfaces ───

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

export interface ICustomFile {
  url: string;
  thumbnail?: string;
  originalName: string;
  mimeType: string;
  size: number;
  fileType: 'image' | 'document' | 'voice' | 'video' | 'archive' | 'other';
  uploadedAt: Date;
}

export interface IAnnotation {
  imageUrl: string;
  data: string; // JSON-serialised canvas annotation data
  createdAt: Date;
}

export interface ICostEstimation {
  basePrice: number;
  customizationCharges: number;
  additionalFeatures: number;
  designCost: number;
  materialCost: number;
  productionCost: number;
  deliveryCost: number;
  total: number;
}

export interface IStatusHistoryEntry {
  from: string;
  to: string;
  changedBy: string;
  changedAt: Date;
  note?: string;
}

export interface IInternalNote {
  author: string;
  authorName: string;
  text: string;
  createdAt: Date;
}

export interface IVersionSnapshot {
  version: number;
  snapshotType: 'quotation' | 'requirements' | 'files' | 'status' | 'full';
  data: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

export interface IProductSnapshot {
  productId: string;
  title: string;
  imageSrc: string;
  category: string;
  price: number;
  description?: string;
  variants?: { name: string; value: string; price?: number }[];
  material?: string;
  dimensions?: string;
}

export interface ICustomizationField {
  fieldName: string;
  fieldType: 'text' | 'textarea' | 'dropdown' | 'multiselect' | 'color' | 'number';
  value: string | string[] | number;
}

// ─── Main Document Interface ───

export interface ICustomOrder extends ISoftDeleted {
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  occasion?: string;
  productType?: string;

  // V2 Dynamic Fields
  customOrderType?: 'product' | 'event' | 'general';
  configVersion?: number;
  configSnapshot?: any;
  dynamicData?: Record<string, any>;

  // Event Display Setup
  eventDetails?: Record<string, any>;
  venueInformation?: Record<string, any>;
  displayRequirements?: Record<string, any>;

  // General Custom Order
  generalRequirements?: Record<string, any>;
  projectRequirements?: Record<string, any>;
  customSpecifications?: Record<string, any>;
  inspirationImages: string[];
  customRequirements?: string;
  budget?: number;
  quantity?: number;
  eventDate?: Date;
  city?: string;
  bookingType: string;

  // Product-linked customization
  productId?: mongoose.Types.ObjectId;
  productSnapshot?: IProductSnapshot;
  customizationData: ICustomizationField[];

  // File management
  files: ICustomFile[];
  referenceImages: string[];
  voiceNotes: string[];
  videoReferences: string[];
  annotations: IAnnotation[];

  // Cost estimation
  costEstimation: ICostEstimation;

  // Status & workflow
  status:
    | 'Pending'
    | 'Reviewing'
    | 'Quote Sent'
    | 'Approved'
    | 'In Progress'
    | 'In Production'
    | 'Completed'
    | 'Ready'
    | 'Delivered'
    | 'Cancelled';
  priority: 'low' | 'medium' | 'high';
  statusHistory: IStatusHistoryEntry[];

  // Quotation & messages
  quotation: IQuotation;
  messages: IMessage[];

  // Staff & notes
  assignedStaff: { userId: mongoose.Types.ObjectId; role: string; assignedAt: Date }[];
  adminNotes?: string;
  internalNotes: IInternalNote[];

  // Version history
  versions: IVersionSnapshot[];

  // Draft support
  isDraft: boolean;

  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-Schemas ───

const QuotationItemSchema = new Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
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
    default: 'draft',
  },
});

const MessageSchema = new Schema({
  sender: { type: String, enum: ['admin', 'customer'], required: true },
  senderName: { type: String, required: true },
  text: { type: String, required: true },
  attachments: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const CustomFileSchema = new Schema({
  url: { type: String, required: true },
  thumbnail: { type: String },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  fileType: {
    type: String,
    enum: ['image', 'document', 'voice', 'video', 'archive', 'other'],
    default: 'other',
  },
  uploadedAt: { type: Date, default: Date.now },
});

const AnnotationSchema = new Schema({
  imageUrl: { type: String, required: true },
  data: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const CostEstimationSchema = new Schema({
  basePrice: { type: Number, default: 0 },
  customizationCharges: { type: Number, default: 0 },
  additionalFeatures: { type: Number, default: 0 },
  designCost: { type: Number, default: 0 },
  materialCost: { type: Number, default: 0 },
  productionCost: { type: Number, default: 0 },
  deliveryCost: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

const StatusHistorySchema = new Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  changedBy: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  note: { type: String },
});

const InternalNoteSchema = new Schema({
  author: { type: String, required: true },
  authorName: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const VersionSnapshotSchema = new Schema({
  version: { type: Number, required: true },
  snapshotType: {
    type: String,
    enum: ['quotation', 'requirements', 'files', 'status'],
    required: true,
  },
  data: { type: Schema.Types.Mixed, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ProductSnapshotSchema = new Schema({
  productId: { type: String, required: true },
  title: { type: String, required: true },
  imageSrc: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  variants: [
    {
      name: { type: String },
      value: { type: String },
      price: { type: Number },
    },
  ],
  material: { type: String },
  dimensions: { type: String },
});

const CustomizationFieldSchema = new Schema({
  fieldName: { type: String, required: true },
  fieldType: {
    type: String,
    enum: ['text', 'textarea', 'dropdown', 'multiselect', 'color', 'number'],
    required: true,
  },
  value: { type: Schema.Types.Mixed, required: true },
});

// ─── Main Schema ───

const CustomOrderSchema: Schema = new Schema(
  {
    orderId: { type: String, unique: true, sparse: true, index: true },
    customerEmail: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    occasion: { type: String, required: false },
    productType: { type: String, required: false },

    // V2 Dynamic Fields
    customOrderType: { type: String, enum: ['product', 'event', 'general'], index: true },
    configVersion: { type: Number },
    configSnapshot: { type: Schema.Types.Mixed },
    dynamicData: { type: Schema.Types.Mixed, default: {} },

    // Event Display Setup
    eventDetails: { type: Schema.Types.Mixed, default: {} },
    venueInformation: { type: Schema.Types.Mixed, default: {} },
    displayRequirements: { type: Schema.Types.Mixed, default: {} },

    // General Custom Order
    generalRequirements: { type: Schema.Types.Mixed, default: {} },
    projectRequirements: { type: Schema.Types.Mixed, default: {} },
    customSpecifications: { type: Schema.Types.Mixed, default: {} },

    inspirationImages: { type: [String], default: [] },
    customRequirements: { type: String },
    budget: { type: Number },
    quantity: { type: Number, default: 1 },
    eventDate: { type: Date },
    city: { type: String },
    bookingType: { type: String, default: 'Video Meet' },

    // Product-linked customization
    productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    productSnapshot: { type: ProductSnapshotSchema },
    customizationData: { type: [CustomizationFieldSchema], default: [] },

    // File management
    files: { type: [CustomFileSchema], default: [] },
    referenceImages: { type: [String], default: [] },
    voiceNotes: { type: [String], default: [] },
    videoReferences: { type: [String], default: [] },
    annotations: { type: [AnnotationSchema], default: [] },

    // Cost estimation
    costEstimation: { type: CostEstimationSchema, default: () => ({}) },

    // Status & workflow
    status: {
      type: String,
      enum: [
        'Pending',
        'Reviewing',
        'Quote Sent',
        'Approved',
        'In Progress',
        'In Production',
        'Completed',
        'Ready',
        'Delivered',
        'Cancelled',
      ],
      default: 'Pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
    },
    statusHistory: { type: [StatusHistorySchema], default: [] },

    // Quotation & messages
    quotation: { type: QuotationSchema, default: () => ({}) },
    messages: { type: [MessageSchema], default: [] },

    // Staff & notes
    assignedStaff: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, default: 'designer' },
        assignedAt: { type: Date, default: Date.now },
      },
    ],
    adminNotes: { type: String },
    internalNotes: { type: [InternalNoteSchema], default: [] },

    // Version history
    versions: { type: [VersionSnapshotSchema], default: [] },

    // Draft support
    isDraft: { type: Boolean, default: false, index: true },

    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// High-Performance Production Compound Indexes for Paginated Bespoke Pipelines
CustomOrderSchema.index({ customerEmail: 1, createdAt: -1 });
CustomOrderSchema.index({ archived: 1, status: 1, createdAt: -1 });
CustomOrderSchema.index({ archived: 1, priority: 1, createdAt: -1 });
CustomOrderSchema.index({ eventDate: 1 });
CustomOrderSchema.index({ isDraft: 1, customerEmail: 1, createdAt: -1 });
CustomOrderSchema.index({ productId: 1, createdAt: -1 });

// Auto-generate orderId before save using atomic counter
import Counter from './Counter';

CustomOrderSchema.pre<ICustomOrder>('save', async function () {
  if (!this.orderId && !this.isDraft) {
    const year = new Date().getFullYear();
    let counter;
    let retries = 3;
    while (retries > 0) {
      try {
        counter = await Counter.findByIdAndUpdate(
          { _id: `customOrder_${year}` },
          { $inc: { seq: 1 } },
          { returnDocument: 'after', upsert: true },
        );
        break; // Success
      } catch (err: any) {
        if (err.code === 11000) {
          retries--;
          if (retries === 0) throw err;
          // Wait a bit before retrying
          await new Promise((res) => setTimeout(res, Math.random() * 50));
        } else {
          throw err;
        }
      }
    }
    if (counter) {
      this.orderId = `CO-${year}-${String(counter.seq).padStart(6, '0')}`;
    }
  }
});

CustomOrderSchema.plugin(SoftDeletePlugin);
CustomOrderSchema.plugin(ForensicAuditPlugin);

export default mongoose.model<ICustomOrder, SoftDeleteModel<ICustomOrder>>(
  'CustomOrder',
  CustomOrderSchema,
);
