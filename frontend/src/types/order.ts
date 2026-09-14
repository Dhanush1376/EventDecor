/**
 * Canonical Order Domain Types
 */

import type { UserAddress } from './auth';
import type { Product } from './product';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded'
  | 'partially_refunded';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface OrderItem {
  _id?: string;
  productId: string | Product;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  image?: string;
  customizationDetails?: Record<string, unknown>;
  returnEligibleUntil?: string;
  isReturned?: boolean;
}

export interface OrderPricingSummary {
  subtotal: number;
  shippingFee: number;
  platformFee: number;
  discount: number;
  tax?: number;
  walletDebited?: number;
  couponCode?: string;
  couponDiscount?: number;
  total: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus | string;
  title: string;
  description?: string;
  timestamp: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface Order {
  _id: string;
  id?: string;
  orderNumber: string;
  customer: {
    _id: string;
    name: string;
    email?: string;
    phone: string;
  };
  items: OrderItem[];
  shippingAddress: UserAddress;
  billingAddress?: UserAddress;
  pricing: OrderPricingSummary;
  paymentMethod: 'razorpay' | 'cod' | 'wallet' | 'offline';
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  statusHistory: OrderTimelineEvent[];
  trackingNumber?: string;
  courierName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
