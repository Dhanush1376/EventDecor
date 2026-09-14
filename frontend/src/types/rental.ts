/**
 * Canonical Rental Domain Types
 */

import type { Product } from './product';
import type { UserAddress } from './auth';

export interface RentalDateRange {
  startDate: string;
  endDate: string;
  durationDays: number;
}

export interface RentalItem {
  productId: string | Product;
  name: string;
  pricePerDay: number;
  securityDeposit: number;
  quantity: number;
  durationDays: number;
  rentalStartDate: string;
  rentalEndDate: string;
  itemTotal: number;
  depositTotal: number;
}

export interface RentalCostBreakdown {
  rentalSubtotal: number;
  depositTotal: number;
  shippingFee: number;
  platformFee: number;
  discount: number;
  totalPayable: number;
  refundableDeposit: number;
}

export interface RentalOrder {
  _id: string;
  id?: string;
  orderNumber: string;
  items: RentalItem[];
  dateRange: RentalDateRange;
  costBreakdown: RentalCostBreakdown;
  shippingAddress: UserAddress;
  rentalStatus: 'active' | 'overdue' | 'returned' | 'inspection' | 'closed';
  createdAt: string;
  updatedAt: string;
}
