import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { ISoftDeleted, SoftDeleteModel } from '../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';

export interface IReturnRequestItem {
  productId: mongoose.Types.ObjectId;
  title: string;
  imageSrc?: string;
  variant?: string;
  orderedQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  reason: string;
  description?: string;
  evidenceImages: string[];
  evidenceVideos: string[];
  inspectionResult?: {
    originalProduct: boolean;
    accessoriesPresent: boolean;
    packagingIntact: boolean;
    workingCondition: boolean;
    photos: string[];
    remarks?: string;
    inspectionScore: number;
    inspectedBy?: mongoose.Types.ObjectId;
    inspectedAt?: Date;
    inventoryDecision?: 'restock_available' | 'mark_damaged' | 'mark_lost';
  };
  warehouseStatus:
    | 'pending'
    | 'received'
    | 'packaging_damaged'
    | 'wrong_product'
    | 'missing_accessories'
    | 'quality_passed'
    | 'rejected'
    | 'restocked'
    | 'damaged_inventory'
    | 'repair_required';
  refundAmount?: number;
}

export interface IReturnRequest extends ISoftDeleted {
  returnId: string;
  orderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  items: IReturnRequestItem[];

  returnType: 'return' | 'exchange';
  status:
    | 'submitted'
    | 'approved'
    | 'return_courier_assigned'
    | 'return_picked_up'
    | 'return_in_transit'
    | 'return_received'
    | 'inspection_started'
    | 'inspection_completed'
    | 'refund_initiated'
    | 'refund_completed'
    | 'completed'
    | 'rejected'
    | 'cancelled';

  returnShipmentId?: mongoose.Types.ObjectId;

  refundBreakdown?: {
    productTotal: number;
    taxRefund: number;
    shippingRefund: number;
    discountDeduction: number;
    couponDeduction: number;
    walletUsedDeduction: number;
    storeCreditDeduction: number;
    restockingFee: number;
    partialRefundAmount: number;
    grandTotal: number;
  };

  refundMethod?: 'original' | 'wallet' | 'store_credit';
  upiId?: string;
  refundRecordId?: mongoose.Types.ObjectId;

  pickup?: {
    address: any;
    scheduledDate?: Date;
    scheduledSlot?: string;
    partner?: string;
    driverName?: string;
    driverPhone?: string;
    vehicleNumber?: string;
    trackingId?: string;
    eta?: Date;
    status: 'pending' | 'assigned' | 'accepted' | 'in_transit' | 'picked_up' | 'failed';
    completedAt?: Date;
  };

  fraudScore?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedStaff?: mongoose.Types.ObjectId;

  sla?: {
    currentStage: string;
    stageEnteredAt: Date;
    isOverdue: boolean;
    escalated: boolean;
    escalatedAt?: Date;
  };

  conversation: {
    sender: 'customer' | 'admin' | 'system';
    senderId?: mongoose.Types.ObjectId;
    senderName?: string;
    message: string;
    attachments: string[];
    isInternal: boolean;
    createdAt: Date;
  }[];

  timeline: {
    action: string;
    description: string;
    performedBy?: mongoose.Types.ObjectId;
    performedByName?: string;
    performedByRole?: string;
    metadata?: any;
    timestamp: Date;
  }[];

  auditLog: {
    timestamp: Date;
    user?: mongoose.Types.ObjectId;
    userType: 'customer' | 'admin' | 'warehouse' | 'courier' | 'system';
    action: string;
    reason?: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    deviceInfo?: string;
  }[];

  approvalLevel?: 'auto' | 'manager' | 'senior_admin';
  approvedBy?: mongoose.Types.ObjectId;
  approvalNotes?: string;
  idempotencyKey?: string;

  createdAt: Date;
  updatedAt: Date;
}

const ReturnRequestItemSchema = new Schema<IReturnRequestItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  title: { type: String, required: true },
  imageSrc: { type: String },
  variant: { type: String },
  orderedQuantity: { type: Number, required: true },
  returnQuantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  reason: { type: String, required: true },
  description: { type: String },
  evidenceImages: [{ type: String }],
  evidenceVideos: [{ type: String }],
  inspectionResult: {
    originalProduct: { type: Boolean },
    accessoriesPresent: { type: Boolean },
    packagingIntact: { type: Boolean },
    workingCondition: { type: Boolean },
    photos: [{ type: String }],
    remarks: { type: String },
    inspectionScore: { type: Number, min: 0, max: 100 },
    inspectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    inspectedAt: { type: Date },
    inventoryDecision: { type: String, enum: ['restock_available', 'mark_damaged', 'mark_lost'] },
  },
  warehouseStatus: {
    type: String,
    enum: [
      'pending',
      'received',
      'packaging_damaged',
      'wrong_product',
      'missing_accessories',
      'quality_passed',
      'rejected',
      'restocked',
      'damaged_inventory',
      'repair_required',
    ],
  },
  refundAmount: { type: Number },
});

const ReturnRequestSchema = new Schema<IReturnRequest>(
  {
    returnId: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    items: [ReturnRequestItemSchema],

    returnType: { type: String, enum: ['return', 'exchange'], required: true },
    status: {
      type: String,
      enum: [
        'submitted',
        'approved',
        'return_courier_assigned',
        'return_picked_up',
        'return_in_transit',
        'return_received',
        'inspection_started',
        'inspection_completed',
        'refund_initiated',
        'refund_completed',
        'completed',
        'rejected',
        'cancelled',
      ],
      default: 'submitted',
      index: true,
    },
    returnShipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment' },

    refundBreakdown: {
      productTotal: { type: Number, default: 0 },
      taxRefund: { type: Number, default: 0 },
      shippingRefund: { type: Number, default: 0 },
      discountDeduction: { type: Number, default: 0 },
      couponDeduction: { type: Number, default: 0 },
      walletUsedDeduction: { type: Number, default: 0 },
      storeCreditDeduction: { type: Number, default: 0 },
      restockingFee: { type: Number, default: 0 },
      partialRefundAmount: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
    },

    refundMethod: { type: String, enum: ['original', 'wallet', 'store_credit'] },
    upiId: { type: String },
    refundRecordId: { type: Schema.Types.ObjectId, ref: 'RefundRecord' },

    pickup: {
      address: { type: Schema.Types.Mixed },
      scheduledDate: { type: Date },
      scheduledSlot: { type: String },
      partner: { type: String },
      driverName: { type: String },
      driverPhone: { type: String },
      vehicleNumber: { type: String },
      trackingId: { type: String },
      eta: { type: Date },
      status: {
        type: String,
        enum: ['pending', 'assigned', 'accepted', 'in_transit', 'picked_up', 'failed'],
      },
      completedAt: { type: Date },
    },

    fraudScore: { type: Number, default: 0, index: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    assignedStaff: { type: Schema.Types.ObjectId, ref: 'User' },

    sla: {
      currentStage: { type: String },
      stageEnteredAt: { type: Date },
      isOverdue: { type: Boolean, default: false },
      escalated: { type: Boolean, default: false },
      escalatedAt: { type: Date },
    },

    conversation: [
      {
        sender: { type: String, enum: ['customer', 'admin', 'system'], required: true },
        senderId: { type: Schema.Types.ObjectId, ref: 'User' },
        senderName: { type: String },
        message: { type: String, required: true },
        attachments: [{ type: String }],
        isInternal: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    timeline: [
      {
        action: { type: String, required: true },
        description: { type: String },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        performedByName: { type: String },
        performedByRole: { type: String },
        metadata: { type: Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    auditLog: [
      {
        timestamp: { type: Date, default: Date.now },
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        userType: { type: String, enum: ['customer', 'admin', 'warehouse', 'courier', 'system'] },
        action: { type: String, required: true },
        reason: { type: String },
        oldValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed },
        ipAddress: { type: String },
        deviceInfo: { type: String },
      },
    ],

    approvalLevel: { type: String, enum: ['auto', 'manager', 'senior_admin'] },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvalNotes: { type: String },
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);

ReturnRequestSchema.index({ status: 1, priority: 1, createdAt: 1 });
ReturnRequestSchema.index(
  { orderId: 1, 'items.productId': 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $nin: ['cancelled', 'rejected', 'completed'] } },
  },
);

ReturnRequestSchema.plugin(SoftDeletePlugin);
ReturnRequestSchema.plugin(ForensicAuditPlugin);

const ReturnRequest = mongoose.model<IReturnRequest, SoftDeleteModel<IReturnRequest>>(
  'ReturnRequest',
  ReturnRequestSchema,
);

export default ReturnRequest;
