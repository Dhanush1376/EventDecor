import {
  PURCHASE_STATUS,
  RENTAL_STATUS,
  EVENT_STATUS,
  CUSTOM_ORDER_STATUS,
  TRANSACTION_TYPES,
} from '../constants/statusConstants';
import logger from '../config/logger';

export class DisplayStatusMapper {
  static getPurchaseDisplayStatus(
    canonicalStatus: string,
    context: 'customer' | 'admin' | 'warehouse',
  ): string {
    const map: any = {
      [PURCHASE_STATUS.PENDING_PAYMENT]: {
        customer: 'Awaiting Payment',
        admin: 'Pending Payment',
        warehouse: 'N/A',
      },
      [PURCHASE_STATUS.PENDING_APPROVAL]: {
        customer: 'Reviewing Order',
        admin: 'Pending Approval',
        warehouse: 'N/A',
      },
      [PURCHASE_STATUS.CONFIRMED]: {
        customer: 'Order Confirmed',
        admin: 'Confirmed',
        warehouse: 'Ready to Pick',
      },
      [PURCHASE_STATUS.PROCESSING]: {
        customer: 'Processing',
        admin: 'Processing',
        warehouse: 'Picking in Progress',
      },
      [PURCHASE_STATUS.PACKED]: {
        customer: 'Packed & Ready',
        admin: 'Packed',
        warehouse: 'Packed / Awaiting Dispatch',
      },
      [PURCHASE_STATUS.DISPATCHED]: {
        customer: 'Dispatched',
        admin: 'Dispatched',
        warehouse: 'Handed to Courier',
      },
      [PURCHASE_STATUS.IN_TRANSIT]: {
        customer: 'In Transit',
        admin: 'In Transit',
        warehouse: 'Shipped',
      },
      [PURCHASE_STATUS.OUT_FOR_DELIVERY]: {
        customer: 'Out for Delivery',
        admin: 'Out for Delivery',
        warehouse: 'Shipped',
      },
      [PURCHASE_STATUS.DELIVERED]: {
        customer: 'Delivered',
        admin: 'Delivered',
        warehouse: 'Delivered',
      },
      [PURCHASE_STATUS.COMPLETED]: {
        customer: 'Completed',
        admin: 'Completed',
        warehouse: 'Completed',
      },
      [PURCHASE_STATUS.CANCELLED]: {
        customer: 'Cancelled',
        admin: 'Cancelled',
        warehouse: 'Cancelled',
      },
      [PURCHASE_STATUS.RETURN_REQUESTED]: {
        customer: 'Return Requested',
        admin: 'Return Requested',
        warehouse: 'Expect Return',
      },
      [PURCHASE_STATUS.RETURN_APPROVED]: {
        customer: 'Return Approved',
        admin: 'Return Approved',
        warehouse: 'Expect Return',
      },
      [PURCHASE_STATUS.RETURNED]: {
        customer: 'Returned',
        admin: 'Returned',
        warehouse: 'Returned to Stock',
      },
      [PURCHASE_STATUS.REFUNDED]: {
        customer: 'Refunded',
        admin: 'Refunded',
        warehouse: 'Returned to Stock',
      },
      [PURCHASE_STATUS.UNKNOWN]: {
        customer: 'Status Updating',
        admin: 'Review Required',
        warehouse: 'Review Required',
      },
    };
    return map[canonicalStatus]?.[context] || map[PURCHASE_STATUS.UNKNOWN][context];
  }

  static getRentalDisplayStatus(
    canonicalStatus: string,
    context: 'customer' | 'admin' | 'warehouse',
  ): string {
    const map: any = {
      [RENTAL_STATUS.PENDING_PAYMENT]: {
        customer: 'Awaiting Payment',
        admin: 'Pending Payment',
        warehouse: 'N/A',
      },
      [RENTAL_STATUS.PENDING_APPROVAL]: {
        customer: 'Reviewing Booking',
        admin: 'Pending Approval',
        warehouse: 'N/A',
      },
      [RENTAL_STATUS.CONFIRMED]: {
        customer: 'Booking Confirmed',
        admin: 'Confirmed',
        warehouse: 'Scheduled for Prep',
      },
      [RENTAL_STATUS.PREPARING]: {
        customer: 'Preparing your items',
        admin: 'Preparing',
        warehouse: 'Prep in Progress',
      },
      [RENTAL_STATUS.PACKED]: {
        customer: 'Ready for Dispatch',
        admin: 'Packed',
        warehouse: 'Packed / Awaiting Dispatch',
      },
      [RENTAL_STATUS.DISPATCHED]: {
        customer: 'Dispatched',
        admin: 'Dispatched',
        warehouse: 'Handed to Courier',
      },
      [RENTAL_STATUS.DELIVERED]: {
        customer: 'Delivered',
        admin: 'Delivered',
        warehouse: 'With Customer',
      },
      [RENTAL_STATUS.RENTAL_ACTIVE]: {
        customer: 'Rental Active',
        admin: 'Active',
        warehouse: 'With Customer',
      },
      [RENTAL_STATUS.RETURN_DUE]: {
        customer: 'Return Due Soon',
        admin: 'Return Due',
        warehouse: 'Expect Return',
      },
      [RENTAL_STATUS.RETURN_INITIATED]: {
        customer: 'Return Initiated',
        admin: 'Return Initiated',
        warehouse: 'Expect Return',
      },
      [RENTAL_STATUS.RETURN_IN_TRANSIT]: {
        customer: 'Return in Transit',
        admin: 'Return in Transit',
        warehouse: 'Return in Transit',
      },
      [RENTAL_STATUS.RETURN_RECEIVED]: {
        customer: 'Return Received',
        admin: 'Return Received',
        warehouse: 'Received / To Inspect',
      },
      [RENTAL_STATUS.INSPECTION_PENDING]: {
        customer: 'Inspecting Returned Items',
        admin: 'Inspection Pending',
        warehouse: 'Inspection Pending',
      },
      [RENTAL_STATUS.INSPECTED]: {
        customer: 'Items Inspected',
        admin: 'Inspected',
        warehouse: 'Restocked',
      },
      [RENTAL_STATUS.DEPOSIT_REFUND_PENDING]: {
        customer: 'Processing Deposit Refund',
        admin: 'Refund Pending',
        warehouse: 'Restocked',
      },
      [RENTAL_STATUS.COMPLETED]: {
        customer: 'Completed',
        admin: 'Completed',
        warehouse: 'Completed',
      },
      [RENTAL_STATUS.OVERDUE]: { customer: 'Overdue', admin: 'Overdue', warehouse: 'Overdue' },
      [RENTAL_STATUS.DAMAGED]: {
        customer: 'Damage Reported',
        admin: 'Damage Reported',
        warehouse: 'Quarantine',
      },
      [RENTAL_STATUS.CANCELLED]: {
        customer: 'Cancelled',
        admin: 'Cancelled',
        warehouse: 'Cancelled',
      },
      [RENTAL_STATUS.UNKNOWN]: {
        customer: 'Status Updating',
        admin: 'Review Required',
        warehouse: 'Review Required',
      },
    };
    return map[canonicalStatus]?.[context] || map[RENTAL_STATUS.UNKNOWN][context];
  }

  static getEventDisplayStatus(
    canonicalStatus: string,
    context: 'customer' | 'admin' | 'warehouse',
  ): string {
    const map: any = {
      [EVENT_STATUS.INQUIRY]: { customer: 'Inquiry Submitted', admin: 'Inquiry', warehouse: 'N/A' },
      [EVENT_STATUS.QUOTE_SENT]: { customer: 'Quote Ready', admin: 'Quote Sent', warehouse: 'N/A' },
      [EVENT_STATUS.PAYMENT_PENDING]: {
        customer: 'Awaiting Payment',
        admin: 'Payment Pending',
        warehouse: 'N/A',
      },
      [EVENT_STATUS.ADVANCE_PAID]: {
        customer: 'Advance Paid',
        admin: 'Advance Paid',
        warehouse: 'N/A',
      },
      [EVENT_STATUS.CONFIRMED]: {
        customer: 'Event Confirmed',
        admin: 'Confirmed',
        warehouse: 'Schedule Prep',
      },
      [EVENT_STATUS.PLANNING]: {
        customer: 'Planning in Progress',
        admin: 'Planning',
        warehouse: 'N/A',
      },
      [EVENT_STATUS.TEAM_ASSIGNED]: {
        customer: 'Team Assigned',
        admin: 'Team Assigned',
        warehouse: 'N/A',
      },
      [EVENT_STATUS.PREPARATION]: {
        customer: 'Preparing Decor',
        admin: 'Preparation',
        warehouse: 'Prep in Progress',
      },
      [EVENT_STATUS.DISPATCHED_TO_VENUE]: {
        customer: 'En Route to Venue',
        admin: 'Dispatched to Venue',
        warehouse: 'Dispatched',
      },
      [EVENT_STATUS.SETUP_IN_PROGRESS]: {
        customer: 'Setup in Progress',
        admin: 'Setup in Progress',
        warehouse: 'At Venue',
      },
      [EVENT_STATUS.SETUP_COMPLETED]: {
        customer: 'Setup Completed',
        admin: 'Setup Completed',
        warehouse: 'At Venue',
      },
      [EVENT_STATUS.EVENT_IN_PROGRESS]: {
        customer: 'Event Live',
        admin: 'Event Live',
        warehouse: 'At Venue',
      },
      [EVENT_STATUS.EVENT_COMPLETED]: {
        customer: 'Event Completed',
        admin: 'Event Completed',
        warehouse: 'At Venue',
      },
      [EVENT_STATUS.TEARDOWN]: {
        customer: 'Teardown in Progress',
        admin: 'Teardown',
        warehouse: 'Teardown',
      },
      [EVENT_STATUS.RETURNING_TO_WAREHOUSE]: {
        customer: 'Returning Items',
        admin: 'Returning to WH',
        warehouse: 'Expect Return',
      },
      [EVENT_STATUS.FINAL_SETTLEMENT]: {
        customer: 'Final Settlement Pending',
        admin: 'Final Settlement',
        warehouse: 'Restocked',
      },
      [EVENT_STATUS.COMPLETED]: {
        customer: 'Completed',
        admin: 'Completed',
        warehouse: 'Completed',
      },
      [EVENT_STATUS.CANCELLED]: {
        customer: 'Cancelled',
        admin: 'Cancelled',
        warehouse: 'Cancelled',
      },
      [EVENT_STATUS.UNKNOWN]: {
        customer: 'Status Updating',
        admin: 'Review Required',
        warehouse: 'Review Required',
      },
    };
    return map[canonicalStatus]?.[context] || map[EVENT_STATUS.UNKNOWN][context];
  }

  static getCustomOrderDisplayStatus(
    canonicalStatus: string,
    context: 'customer' | 'admin' | 'warehouse',
  ): string {
    const map: any = {
      [CUSTOM_ORDER_STATUS.REQUEST_SUBMITTED]: {
        customer: 'Request Submitted',
        admin: 'New Request',
        warehouse: 'N/A',
      },
      [CUSTOM_ORDER_STATUS.UNDER_REVIEW]: {
        customer: 'Under Review',
        admin: 'Under Review',
        warehouse: 'N/A',
      },
      [CUSTOM_ORDER_STATUS.QUOTE_SENT]: {
        customer: 'Quote Ready',
        admin: 'Quote Sent',
        warehouse: 'N/A',
      },
      [CUSTOM_ORDER_STATUS.CUSTOMER_APPROVAL_PENDING]: {
        customer: 'Awaiting Your Approval',
        admin: 'Waiting on Customer',
        warehouse: 'N/A',
      },
      [CUSTOM_ORDER_STATUS.PAYMENT_PENDING]: {
        customer: 'Awaiting Payment',
        admin: 'Payment Pending',
        warehouse: 'N/A',
      },
      [CUSTOM_ORDER_STATUS.PAYMENT_CONFIRMED]: {
        customer: 'Payment Confirmed',
        admin: 'Payment Confirmed',
        warehouse: 'N/A',
      },
      [CUSTOM_ORDER_STATUS.DESIGN_IN_PROGRESS]: {
        customer: 'Design in Progress',
        admin: 'Designing',
        warehouse: 'N/A',
      },
      [CUSTOM_ORDER_STATUS.CUSTOMER_DESIGN_APPROVAL]: {
        customer: 'Design Ready for Approval',
        admin: 'Waiting on Customer',
        warehouse: 'N/A',
      },
      [CUSTOM_ORDER_STATUS.IN_PRODUCTION]: {
        customer: 'In Production',
        admin: 'In Production',
        warehouse: 'Production',
      },
      [CUSTOM_ORDER_STATUS.QUALITY_CHECK]: {
        customer: 'Quality Check',
        admin: 'QC Pending',
        warehouse: 'QC Pending',
      },
      [CUSTOM_ORDER_STATUS.PACKED]: {
        customer: 'Packed & Ready',
        admin: 'Packed',
        warehouse: 'Packed',
      },
      [CUSTOM_ORDER_STATUS.DISPATCHED]: {
        customer: 'Dispatched',
        admin: 'Dispatched',
        warehouse: 'Dispatched',
      },
      [CUSTOM_ORDER_STATUS.DELIVERED]: {
        customer: 'Delivered',
        admin: 'Delivered',
        warehouse: 'Delivered',
      },
      [CUSTOM_ORDER_STATUS.COMPLETED]: {
        customer: 'Completed',
        admin: 'Completed',
        warehouse: 'Completed',
      },
      [CUSTOM_ORDER_STATUS.CANCELLED]: {
        customer: 'Cancelled',
        admin: 'Cancelled',
        warehouse: 'Cancelled',
      },
      [CUSTOM_ORDER_STATUS.REWORK_REQUIRED]: {
        customer: 'Rework Required',
        admin: 'Rework Required',
        warehouse: 'Rework Required',
      },
      [CUSTOM_ORDER_STATUS.UNKNOWN]: {
        customer: 'Status Updating',
        admin: 'Review Required',
        warehouse: 'Review Required',
      },
    };
    return map[canonicalStatus]?.[context] || map[CUSTOM_ORDER_STATUS.UNKNOWN][context];
  }

  static getDisplayStatus(
    canonicalStatus: string,
    transactionType: string,
    context: 'customer' | 'admin' | 'warehouse',
  ): string {
    switch (transactionType) {
      case TRANSACTION_TYPES.PURCHASE:
        return this.getPurchaseDisplayStatus(canonicalStatus, context);
      case TRANSACTION_TYPES.RENTAL:
        return this.getRentalDisplayStatus(canonicalStatus, context);
      case TRANSACTION_TYPES.EVENT_BOOKING:
        return this.getEventDisplayStatus(canonicalStatus, context);
      case TRANSACTION_TYPES.CUSTOM_ORDER:
        return this.getCustomOrderDisplayStatus(canonicalStatus, context);
      default:
        logger.warn(`Unknown transaction type: ${transactionType} for display status mapping`);
        return 'Status Updating';
    }
  }
}
