import mongoose from 'mongoose';
import { ISoftDeleted } from '../utils/SoftDeletePlugin';

export interface IQuotationItem {
  description: string;
  amount: number;
}

export interface IQuotation {
  items: IQuotationItem[];
  tax: number;
  shipping: number;
  subtotal: number;
  discount: number;
  total: number;
  depositRequired: boolean;
  depositPercentage: number;
  notes?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  expiresAt?: Date;
  revisionNumber: number;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface IMessage {
  sender: 'admin' | 'customer' | 'system';
  senderName: string;
  text: string;
  attachments?: string[];
  messageType: 'human' | 'system' | 'quotation' | 'status_change' | 'file_upload';
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

export interface ICustomProduct {
  title?: string;
  previewImage?: string;
  finalPrice?: number;
  badge: string;
  designerInfo?: {
    name: string;
    assignedAt: Date;
  };
  conversationSummary?: string;
  summaryGeneratedAt?: Date;
}

export interface IProduction {
  designerAssigned?: mongoose.Types.ObjectId;
  designerName?: string;
  productionTeam: { userId: mongoose.Types.ObjectId; name: string; role: string }[];
  eventSchedule?: {
    setupDate?: Date;
    eventDate?: Date;
    teardownDate?: Date;
    setupTime?: string;
    venue?: string;
    venueContact?: string;
  };
  materialsList: {
    item: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    status: 'pending' | 'ordered' | 'received' | 'used';
  }[];
  costBreakdown: {
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    totalCost: number;
    quotedPrice: number;
    profitMargin: number;
  };
  qaChecklist: {
    item: string;
    checked: boolean;
    checkedBy?: string;
    checkedAt?: Date;
    notes?: string;
  }[];
  internalChecklist: {
    task: string;
    completed: boolean;
    completedBy?: string;
    completedAt?: Date;
    dueDate?: Date;
  }[];
}

export interface IPaymentSchedule {
  type: 'full' | 'advance' | 'milestone';
  advancePercentage: number;
  milestones: {
    label: string;
    percentage: number;
    amount: number;
    status: 'pending' | 'paid' | 'overdue';
    dueDate?: Date;
    paidAt?: Date;
    paymentId?: string;
    invoiceNumber?: string;
  }[];
  totalPaid: number;
  remainingBalance: number;
}

export interface ICustomOrder extends ISoftDeleted {
  orderId: string;
  customer?: mongoose.Types.ObjectId;
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
    | 'Checkout Ready'
    | 'Payment Received'
    | 'In Progress'
    | 'In Production'
    | 'Quality Check'
    | 'Ready'
    | 'Dispatched'
    | 'Delivered'
    | 'Completed'
    | 'Cancelled';
  priority: 'low' | 'medium' | 'high';
  statusHistory: IStatusHistoryEntry[];

  // Quotation & messages
  quotation: IQuotation;
  messages: IMessage[];

  // Enterprise Extensions
  customProduct?: ICustomProduct;
  production?: IProduction;
  paymentSchedule?: IPaymentSchedule;

  // Staff & notes
  assignedStaff: { userId: mongoose.Types.ObjectId; role: string; assignedAt: Date }[];
  adminNotes?: string;
  internalNotes: IInternalNote[];

  // Version history
  versions: IVersionSnapshot[];

  // Conversion to Standard Order
  convertedToOrder?: boolean;
  convertedOrderId?: mongoose.Types.ObjectId;
  orderSummary?: string;
  orderNotes?: string;

  // Draft support
  isDraft: boolean;

  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
