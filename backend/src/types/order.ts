import mongoose from 'mongoose';
import { ISoftDeleted } from '../utils/SoftDeletePlugin';

export interface IOrderStatusHistory {
  status: string;
  timestamp?: Date;
  note?: string;
  performedBy?: string;
}

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  title: string;
  price: number;
  quantity: number;
  variant?: string;
  imageSrc: string;
  category?: string;
  isNonRefundable?: boolean;
  customizationNote?: string;
}

export interface IShippingAddress {
  name: string;
  phone: string;
  alternatePhone?: string;
  email: string;
  pincode: string;
  locality: string;
  address: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  type: 'home' | 'work' | 'other';
  deliveryInstructions?: string;
}

export interface IOrder extends ISoftDeleted {
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  paymentMethod: string;
  isCustomOrder?: boolean;
  customOrderId?: mongoose.Types.ObjectId;
  paymentStatus:
    | 'pending'
    | 'processing'
    | 'authorized'
    | 'captured'
    | 'paid'
    | 'failed'
    | 'Pending COD'
    | 'COD Collected'
    | 'refunded'
    | 'partially_refunded'
    | 'chargeback'
    | 'disputed'
    | 'dispute_open'
    | 'dispute_won'
    | 'dispute_lost';
  orderStatus:
    | 'Pending'
    | 'Confirmed'
    | 'Packed'
    | 'Ready to Ship'
    | 'Shipped'
    | 'Out for Delivery'
    | 'Delivered'
    | 'Cancelled'
    | 'Returned'
    | 'Refunded'
    | 'Settled';
  statusHistory: IOrderStatusHistory[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  codFee?: number;
  walletDeduction?: number;
  coinsEarned?: number;
  cashbackEarned?: number;
  total: number;
  couponCode?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  invoiceNumber?: string;
  trackingNumber?: string;
  courierPartner?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  packageType?: string;
  barcodeData?: string;
  qrCodeData?: string;
  notes?: string;
  needByDate?: string;
  idempotencyKey?: string;
  codCollected?: boolean;
  settlementStatus?: 'Pending' | 'Settled' | 'Not Applicable';
  settledAmount?: number;
  courierCharges?: number;
  earnings?: number;
  reservationIds?: mongoose.Types.ObjectId[];
  returnRequestIds?: mongoose.Types.ObjectId[];
  refundStatus?: 'none' | 'partial' | 'full';
  hasActiveReturn?: boolean;
  orderNumber?: string;
  orderUuid?: string;
  packageIds?: mongoose.Types.ObjectId[];
  shipmentIds?: mongoose.Types.ObjectId[];
  orderQrCode?: string;
  orderQrSignature?: string;
  estimatedDeliveryDate?: Date;
  dispatchDate?: Date;
  transitDays?: number;
  delayWarning?: boolean;
  productSnapshots?: any[];
  createdAt: Date;
  updatedAt: Date;
}
