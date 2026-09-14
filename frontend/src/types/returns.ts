/**
 * Canonical Returns and Exchanges Domain Types
 */

export type ReturnType = 'return' | 'exchange';

export type ReturnStatus =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'return_courier_assigned'
  | 'return_picked_up'
  | 'return_in_transit'
  | 'return_received'
  | 'inspection_started'
  | 'inspection_completed'
  | 'qc_passed'
  | 'qc_approved'
  | 'refund_initiated'
  | 'refund_completed'
  | 'refund_settled'
  | 'completed'
  | 'cancelled';

export interface ReturnItem {
  productId: string;
  orderItemId: string;
  name?: string;
  quantity: number;
  reason: string;
  images?: string[];
  refundAmount?: number;
  exchangeVariant?: {
    productId?: string;
    variantName?: string;
    sku?: string;
    priceDiff?: number;
  };
}

export interface InspectionData {
  originalProduct: boolean;
  accessoriesPresent: boolean;
  packagingIntact: boolean;
  workingCondition: boolean;
  inspectionScore: number;
  remarks: string;
  inspectedAt?: string;
  inspectorName?: string;
}

export interface RefundSettlement {
  amount: number;
  paymentMethod: 'upi' | 'bank_transfer' | 'original_source' | 'wallet';
  upiId?: string;
  transactionId?: string;
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
  };
  notes?: string;
  settledAt?: string;
}

export interface ReturnRequest {
  _id: string;
  id?: string;
  returnId?: string;
  orderId: string | { _id: string; orderNumber: string };
  customer: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
  };
  returnType: ReturnType;
  status: ReturnStatus;
  items: ReturnItem[];
  reason: string;
  detailedReason?: string;
  inspection?: Record<string | number, InspectionData>;
  refund?: RefundSettlement;
  adminNotes?: string[];
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRequest extends ReturnRequest {
  replacementStatus?: 'pending' | 'reserved' | 'shipped' | 'delivered';
  replacementTrackingNumber?: string;
}
