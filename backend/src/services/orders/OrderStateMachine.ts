import ApiError from '../../utils/ApiError';
import * as Sentry from '@sentry/node';

export type OrderState =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'Refunded'
  | 'Settled';

export class OrderStateMachine {
  private static readonly validTransitions: Record<OrderState, OrderState[]> = {
    Pending: ['Confirmed', 'Cancelled'],
    Confirmed: ['Processing', 'Delivered', 'Cancelled'],
    Processing: ['Delivered', 'Cancelled'],
    Delivered: ['Returned', 'Settled'],
    Cancelled: [],
    Returned: ['Refunded'],
    Refunded: [],
    Settled: [],
  };

  /**
   * Normalizes any legacy or case-variant order status to canonical OrderState.
   */
  static normalizeState(status: string): OrderState {
    const s = (status || '').trim();
    if (s === 'placed' || s === 'Payment Pending' || s === 'pending') return 'Pending';
    if (s === 'confirmed') return 'Confirmed';
    if (
      s === 'processing' ||
      s === 'packed' ||
      s === 'Packed' ||
      s === 'Ready to Ship' ||
      s === 'Shipped' ||
      s === 'shipped' ||
      s === 'Out for Delivery'
    )
      return 'Processing';
    if (s === 'delivered') return 'Delivered';
    if (s === 'cancelled') return 'Cancelled';
    if (s === 'returned') return 'Returned';
    if (s === 'refunded') return 'Refunded';
    if (s === 'settled') return 'Settled';
    return (s.charAt(0).toUpperCase() + s.slice(1)) as OrderState;
  }

  /**
   * Validates a state transition for the given order's status.
   * Throws an ApiError if the transition is invalid.
   */
  static validateTransition(
    orderId: string,
    currentState: string,
    nextState: string,
    isPrivileged: boolean = false,
  ): void {
    const fromState = this.normalizeState(currentState);
    const toState = this.normalizeState(nextState);

    if (fromState === toState) {
      return; // No-op for idempotent calls
    }

    const allCanonicalStates: OrderState[] = [
      'Pending',
      'Confirmed',
      'Processing',
      'Delivered',
      'Cancelled',
      'Returned',
      'Refunded',
      'Settled',
    ];

    // Privileged staff / admins can manage order lifecycle flexibly
    if (isPrivileged && allCanonicalStates.includes(toState)) {
      return;
    }

    const allowedNextStates = this.validTransitions[fromState] || [];

    if (!allowedNextStates.includes(toState)) {
      Sentry.captureMessage('Invalid Order State Transition Attempted', {
        level: 'warning',
        tags: { entity: 'order', transition: `${fromState}->${toState}` },
        extra: { orderId, currentState: fromState, nextState: toState, isPrivileged },
      });
      throw new ApiError(400, `Invalid state transition from '${fromState}' to '${toState}'`);
    }
  }

  static canTransition(
    currentState: string,
    nextState: string,
    isPrivileged: boolean = false,
  ): boolean {
    const fromState = this.normalizeState(currentState);
    const toState = this.normalizeState(nextState);

    if (fromState === toState) return true;
    if (isPrivileged) return true;
    const allowedNextStates = this.validTransitions[fromState] || [];
    return allowedNextStates.includes(toState);
  }
}
