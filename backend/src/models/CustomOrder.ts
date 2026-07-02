import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';

import { ICustomOrder } from '../types/customOrder';

// ─── Sub-Schemas ───

const QuotationItemSchema = new Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
});

const QuotationSchema = new Schema({
  items: { type: [QuotationItemSchema], default: [] },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  depositRequired: { type: Boolean, default: false },
  depositPercentage: { type: Number, default: 0 },
  notes: { type: String },
  status: {
    type: String,
    enum: ['draft', 'sent', 'approved', 'rejected'],
    default: 'draft',
  },
  expiresAt: { type: Date },
  revisionNumber: { type: Number, default: 1 },
  approvedAt: { type: Date },
  approvedBy: { type: String },
});

const MessageSchema = new Schema({
  sender: { type: String, enum: ['admin', 'customer', 'system'], required: true },
  senderName: { type: String, required: true },
  text: { type: String, required: true },
  attachments: { type: [String], default: [] },
  messageType: {
    type: String,
    enum: ['human', 'system', 'quotation', 'status_change', 'file_upload'],
    default: 'human',
  },
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

const CustomProductSchema = new Schema({
  title: { type: String },
  previewImage: { type: String },
  finalPrice: { type: Number },
  badge: { type: String, default: 'CUSTOMIZED' },
  designerInfo: {
    name: { type: String },
    assignedAt: { type: Date },
  },
  conversationSummary: { type: String },
  summaryGeneratedAt: { type: Date },
});

const ProductionSchema = new Schema({
  designerAssigned: { type: Schema.Types.ObjectId, ref: 'User' },
  designerName: { type: String },
  productionTeam: [
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      role: { type: String },
    },
  ],
  eventSchedule: {
    setupDate: { type: Date },
    eventDate: { type: Date },
    teardownDate: { type: Date },
    setupTime: { type: String },
    venue: { type: String },
    venueContact: { type: String },
  },
  materialsList: [
    {
      item: { type: String },
      quantity: { type: Number },
      unit: { type: String },
      unitCost: { type: Number },
      totalCost: { type: Number },
      status: {
        type: String,
        enum: ['pending', 'ordered', 'received', 'used'],
        default: 'pending',
      },
    },
  ],
  costBreakdown: {
    materialCost: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    overheadCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    quotedPrice: { type: Number, default: 0 },
    profitMargin: { type: Number, default: 0 },
  },
  qaChecklist: [
    {
      item: { type: String },
      checked: { type: Boolean, default: false },
      checkedBy: { type: String },
      checkedAt: { type: Date },
      notes: { type: String },
    },
  ],
  internalChecklist: [
    {
      task: { type: String },
      completed: { type: Boolean, default: false },
      completedBy: { type: String },
      completedAt: { type: Date },
      dueDate: { type: Date },
    },
  ],
});

const PaymentScheduleSchema = new Schema({
  type: { type: String, enum: ['full', 'advance', 'milestone'], default: 'full' },
  advancePercentage: { type: Number, default: 100 },
  milestones: [
    {
      label: { type: String },
      percentage: { type: Number },
      amount: { type: Number },
      status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
      dueDate: { type: Date },
      paidAt: { type: Date },
      paymentId: { type: String },
      invoiceNumber: { type: String },
    },
  ],
  totalPaid: { type: Number, default: 0 },
  remainingBalance: { type: Number, default: 0 },
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
        'Checkout Ready',
        'Payment Received',
        'In Progress',
        'In Production',
        'Quality Check',
        'Ready',
        'Dispatched',
        'Delivered',
        'Completed',
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

    // Enterprise Extensions
    customProduct: { type: CustomProductSchema },
    production: { type: ProductionSchema },
    paymentSchedule: { type: PaymentScheduleSchema },

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

    // Conversion to Standard Order
    convertedToOrder: { type: Boolean, default: false, index: true },
    convertedOrderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    orderSummary: { type: String },
    orderNotes: { type: String },

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
