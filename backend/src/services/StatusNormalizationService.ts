import {
  PURCHASE_STATUS,
  RENTAL_STATUS,
  EVENT_STATUS,
  CUSTOM_ORDER_STATUS,
  TRANSACTION_TYPES,
} from '../constants/statusConstants';
import logger from '../config/logger';

export class StatusNormalizationService {
  /**
   * Normalizes legacy Purchase Order statuses to Canonical UPPER_SNAKE_CASE
   */
  static normalizePurchaseStatus(rawStatus: string): string {
    if (!rawStatus) return PURCHASE_STATUS.UNKNOWN;
    const s = String(rawStatus).toLowerCase().trim();

    const map: Record<string, string> = {
      'pending cod': PURCHASE_STATUS.PENDING,
      pending_payment: PURCHASE_STATUS.PENDING,
      'payment pending': PURCHASE_STATUS.PENDING,
      pending: PURCHASE_STATUS.PENDING,
      'pending approval': PURCHASE_STATUS.PENDING_APPROVAL,
      confirmed: PURCHASE_STATUS.CONFIRMED,
      processing: PURCHASE_STATUS.PROCESSING,
      packed: PURCHASE_STATUS.PROCESSING,
      'ready to ship': PURCHASE_STATUS.PROCESSING,
      shipped: PURCHASE_STATUS.PROCESSING,
      dispatched: PURCHASE_STATUS.PROCESSING,
      in_transit: PURCHASE_STATUS.PROCESSING,
      'out for delivery': PURCHASE_STATUS.PROCESSING,
      delivered: PURCHASE_STATUS.DELIVERED,
      completed: PURCHASE_STATUS.DELIVERED,
      cancelled: PURCHASE_STATUS.CANCELLED,
      returned: PURCHASE_STATUS.RETURNED,
      return_requested: PURCHASE_STATUS.RETURN_REQUESTED,
      'return requested': PURCHASE_STATUS.RETURN_REQUESTED,
      return_approved: PURCHASE_STATUS.RETURN_APPROVED,
      refunded: PURCHASE_STATUS.REFUNDED,
    };

    if (map[s]) return map[s];
    if (Object.values(PURCHASE_STATUS).includes(rawStatus as any)) return rawStatus; // Already canonical

    logger.warn(`Unknown Purchase Order status encountered: ${rawStatus}`);
    return PURCHASE_STATUS.UNKNOWN;
  }

  /**
   * Normalizes legacy Rental Order statuses
   */
  static normalizeRentalStatus(rawStatus: string): string {
    if (!rawStatus) return RENTAL_STATUS.UNKNOWN;
    const s = String(rawStatus).toLowerCase().trim();

    const map: Record<string, string> = {
      pending: RENTAL_STATUS.PENDING_PAYMENT,
      pending_payment: RENTAL_STATUS.PENDING_PAYMENT,
      pending_approval: RENTAL_STATUS.PENDING_APPROVAL,
      confirmed: RENTAL_STATUS.CONFIRMED,
      preparing: RENTAL_STATUS.PREPARING,
      packed: RENTAL_STATUS.PACKED,
      shipped: RENTAL_STATUS.DISPATCHED,
      dispatched: RENTAL_STATUS.DISPATCHED,
      delivered: RENTAL_STATUS.DELIVERED,
      active_rental: RENTAL_STATUS.RENTAL_ACTIVE,
      return_due: RENTAL_STATUS.RETURN_DUE,
      return_requested: RENTAL_STATUS.RETURN_INITIATED,
      return_initiated: RENTAL_STATUS.RETURN_INITIATED,
      return_in_transit: RENTAL_STATUS.RETURN_IN_TRANSIT,
      returned: RENTAL_STATUS.RETURN_RECEIVED,
      return_received: RENTAL_STATUS.RETURN_RECEIVED,
      inspection_pending: RENTAL_STATUS.INSPECTION_PENDING,
      inspected: RENTAL_STATUS.INSPECTED,
      deposit_refund_pending: RENTAL_STATUS.DEPOSIT_REFUND_PENDING,
      completed: RENTAL_STATUS.COMPLETED,
      cancelled: RENTAL_STATUS.CANCELLED,
      overdue: RENTAL_STATUS.OVERDUE,
      damaged: RENTAL_STATUS.DAMAGED,
    };

    if (map[s]) return map[s];
    if (Object.values(RENTAL_STATUS).includes(rawStatus as any)) return rawStatus;

    logger.warn(`Unknown Rental Order status encountered: ${rawStatus}`);
    return RENTAL_STATUS.UNKNOWN;
  }

  /**
   * Normalizes legacy Event Booking statuses
   */
  static normalizeEventStatus(rawStatus: string): string {
    if (!rawStatus) return EVENT_STATUS.UNKNOWN;
    const s = String(rawStatus).toLowerCase().trim();

    const map: Record<string, string> = {
      inquiry: EVENT_STATUS.INQUIRY,
      quote_sent: EVENT_STATUS.QUOTE_SENT,
      pending: EVENT_STATUS.PAYMENT_PENDING,
      payment_pending: EVENT_STATUS.PAYMENT_PENDING,
      advance_paid: EVENT_STATUS.ADVANCE_PAID,
      confirmed: EVENT_STATUS.CONFIRMED,
      planning: EVENT_STATUS.PLANNING,
      team_assigned: EVENT_STATUS.TEAM_ASSIGNED,
      preparation: EVENT_STATUS.PREPARATION,
      dispatched_to_venue: EVENT_STATUS.DISPATCHED_TO_VENUE,
      setup_in_progress: EVENT_STATUS.SETUP_IN_PROGRESS,
      setup_completed: EVENT_STATUS.SETUP_COMPLETED,
      event_live: EVENT_STATUS.EVENT_IN_PROGRESS,
      event_in_progress: EVENT_STATUS.EVENT_IN_PROGRESS,
      event_completed: EVENT_STATUS.EVENT_COMPLETED,
      teardown: EVENT_STATUS.TEARDOWN,
      returning_to_warehouse: EVENT_STATUS.RETURNING_TO_WAREHOUSE,
      final_settlement: EVENT_STATUS.FINAL_SETTLEMENT,
      completed: EVENT_STATUS.COMPLETED,
      cancelled: EVENT_STATUS.CANCELLED,
    };

    if (map[s]) return map[s];
    if (Object.values(EVENT_STATUS).includes(rawStatus as any)) return rawStatus;

    logger.warn(`Unknown Event Booking status encountered: ${rawStatus}`);
    return EVENT_STATUS.UNKNOWN;
  }

  /**
   * Normalizes legacy Custom Order statuses
   */
  static normalizeCustomOrderStatus(rawStatus: string): string {
    if (!rawStatus) return CUSTOM_ORDER_STATUS.UNKNOWN;
    const s = String(rawStatus).toLowerCase().trim();

    const map: Record<string, string> = {
      draft: CUSTOM_ORDER_STATUS.REQUEST_SUBMITTED,
      new: CUSTOM_ORDER_STATUS.REQUEST_SUBMITTED,
      pending: CUSTOM_ORDER_STATUS.PAYMENT_PENDING,
      'under review': CUSTOM_ORDER_STATUS.UNDER_REVIEW,
      under_review: CUSTOM_ORDER_STATUS.UNDER_REVIEW,
      'quote provided': CUSTOM_ORDER_STATUS.QUOTE_SENT,
      quote_sent: CUSTOM_ORDER_STATUS.QUOTE_SENT,
      approved: CUSTOM_ORDER_STATUS.CUSTOMER_APPROVAL_PENDING,
      'payment received': CUSTOM_ORDER_STATUS.PAYMENT_CONFIRMED,
      payment_confirmed: CUSTOM_ORDER_STATUS.PAYMENT_CONFIRMED,
      'in progress': CUSTOM_ORDER_STATUS.IN_PRODUCTION,
      in_production: CUSTOM_ORDER_STATUS.IN_PRODUCTION,
      shipped: CUSTOM_ORDER_STATUS.DISPATCHED,
      dispatched: CUSTOM_ORDER_STATUS.DISPATCHED,
      delivered: CUSTOM_ORDER_STATUS.DELIVERED,
      completed: CUSTOM_ORDER_STATUS.COMPLETED,
      cancelled: CUSTOM_ORDER_STATUS.CANCELLED,
    };

    if (map[s]) return map[s];
    if (Object.values(CUSTOM_ORDER_STATUS).includes(rawStatus as any)) return rawStatus;

    logger.warn(`Unknown Custom Order status encountered: ${rawStatus}`);
    return CUSTOM_ORDER_STATUS.UNKNOWN;
  }

  /**
   * Helper to normalize based on known transaction type
   */
  static normalizeStatus(rawStatus: string, transactionType: string): string {
    switch (transactionType) {
      case TRANSACTION_TYPES.PURCHASE:
        return this.normalizePurchaseStatus(rawStatus);
      case TRANSACTION_TYPES.RENTAL:
        return this.normalizeRentalStatus(rawStatus);
      case TRANSACTION_TYPES.EVENT_BOOKING:
        return this.normalizeEventStatus(rawStatus);
      case TRANSACTION_TYPES.CUSTOM_ORDER:
        return this.normalizeCustomOrderStatus(rawStatus);
      default:
        logger.warn(`Unknown transaction type: ${transactionType} for status: ${rawStatus}`);
        return 'UNKNOWN';
    }
  }
}
