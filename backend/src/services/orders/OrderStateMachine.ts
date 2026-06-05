import ApiError from '../../utils/ApiError';
import * as Sentry from '@sentry/node';

export type OrderState =
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

export class OrderStateMachine {
  private static readonly validTransitions: Record<OrderState, OrderState[]> = {
    Pending: ['Confirmed', 'Cancelled'],
    Confirmed: ['Packed', 'Cancelled'],
    Packed: ['Ready to Ship', 'Shipped', 'Cancelled'],
    'Ready to Ship': ['Shipped', 'Cancelled'],
    Shipped: ['Out for Delivery', 'Delivered', 'Cancelled', 'Returned'],
    'Out for Delivery': ['Delivered', 'Cancelled', 'Returned'],
    Delivered: ['Returned'],
    Cancelled: [],
    Returned: ['Refunded'],
    Refunded: [],
    Settled: [],
  };

  /**
   * Validates a state transition for the given order's status.
   * Throws an ApiError if the transition is invalid.
   */
  static validateTransition(
    orderId: string,
    currentState: OrderState,
    nextState: OrderState,
  ): void {
    if (currentState === nextState) {
      return; // No-op for idempotent calls
    }

    const allowedNextStates = this.validTransitions[currentState] || [];

    if (!allowedNextStates.includes(nextState)) {
      Sentry.captureMessage('Invalid Order State Transition Attempted', {
        level: 'warning',
        tags: { entity: 'order', transition: `${currentState}->${nextState}` },
        extra: { orderId, currentState, nextState },
      });
      throw new ApiError(400, `Invalid state transition from '${currentState}' to '${nextState}'`);
    }
  }

  static canTransition(currentState: OrderState, nextState: OrderState): boolean {
    if (currentState === nextState) return true;
    const allowedNextStates = this.validTransitions[currentState] || [];
    return allowedNextStates.includes(nextState);
  }
}
