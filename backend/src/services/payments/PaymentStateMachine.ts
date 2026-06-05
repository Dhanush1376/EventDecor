import ApiError from '../../utils/ApiError';
import * as Sentry from '@sentry/node';

export type PaymentState =
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'captured'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'chargeback'
  | 'disputed'
  | 'dispute_open'
  | 'dispute_won'
  | 'dispute_lost'
  | 'Pending COD'
  | 'COD Collected';

export class PaymentStateMachine {
  private static readonly validTransitions: Record<PaymentState, PaymentState[]> = {
    pending: ['processing', 'failed', 'Pending COD'],
    processing: ['authorized', 'captured', 'paid', 'failed', 'pending'],
    authorized: ['captured', 'paid', 'failed'],
    captured: ['paid', 'refunded', 'disputed', 'dispute_open'],
    paid: ['refunded', 'partially_refunded', 'disputed', 'dispute_open'],
    failed: ['pending'], // In case of retry
    refunded: [],
    partially_refunded: ['refunded'],
    disputed: ['chargeback', 'paid', 'refunded', 'dispute_open', 'dispute_won', 'dispute_lost'],
    dispute_open: ['dispute_won', 'dispute_lost', 'refunded'],
    dispute_won: [],
    dispute_lost: ['chargeback', 'refunded'],
    chargeback: [],
    'Pending COD': ['COD Collected', 'failed'],
    'COD Collected': ['paid'],
  };

  /**
   * Validates and performs a state transition for the given order's payment status.
   * Throws an ApiError if the transition is invalid.
   */
  static transition(order: any, nextState: PaymentState, note?: string): void {
    const currentState = (order.paymentStatus || 'pending') as PaymentState;

    if (currentState === nextState) {
      return; // No-op for idempotent calls
    }

    const allowedNextStates = this.validTransitions[currentState] || [];

    if (!allowedNextStates.includes(nextState)) {
      Sentry.captureMessage('Invalid Payment State Transition Attempted', {
        level: 'warning',
        tags: { entity: 'payment', transition: `${currentState}->${nextState}` },
        extra: { orderId: order._id, currentState, nextState },
      });
      throw new ApiError(
        400,
        `Invalid payment state transition from '${currentState}' to '${nextState}'`,
      );
    }

    Sentry.addBreadcrumb({
      category: 'state_machine',
      message: `Order ${order._id} payment status transitioned from ${currentState} to ${nextState}`,
      level: 'info',
    });

    order.paymentStatus = nextState;

    if (note) {
      order.statusHistory.push({
        status: order.orderStatus, // Keep existing orderStatus for history tracking
        note: `[Payment Status: ${nextState}] ${note}`,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Checks if a transition is allowed without modifying the order.
   */
  static canTransition(currentState: PaymentState, nextState: PaymentState): boolean {
    if (currentState === nextState) return true;
    const allowedNextStates = this.validTransitions[currentState] || [];
    return allowedNextStates.includes(nextState);
  }
}
