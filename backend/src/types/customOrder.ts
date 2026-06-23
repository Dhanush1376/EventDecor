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
