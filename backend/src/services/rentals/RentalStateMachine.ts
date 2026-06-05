import ApiError from '../../utils/ApiError';
import * as Sentry from '@sentry/node';

export type RentalState =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'active_rental'
  | 'late_return'
  | 'return_requested'
  | 'inspecting'
  | 'returned'
  | 'completed'
  | 'cancelled';

export class RentalStateMachine {
  private static readonly validTransitions: Record<RentalState, RentalState[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['packed', 'active_rental', 'cancelled'],
    packed: ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered', 'cancelled'],
    delivered: ['active_rental'],
    active_rental: ['return_requested', 'returned', 'late_return'],
    late_return: ['return_requested', 'returned'],
    return_requested: ['inspecting', 'returned'],
    inspecting: ['returned'],
    returned: ['completed'],
    completed: [],
    cancelled: [],
  };

  /**
   * Validates and performs a state transition for the given rental order's status.
   * Throws an ApiError if the transition is invalid.
   */
  static transition(
    rentalOrder: any,
    nextState: RentalState,
    note?: string,
    performedBy: string = 'system',
  ): void {
    const currentState = (rentalOrder.status || 'pending') as RentalState;

    if (currentState === nextState) {
      return; // No-op for idempotent calls
    }

    const allowedNextStates = this.validTransitions[currentState] || [];

    if (!allowedNextStates.includes(nextState)) {
      Sentry.captureMessage('Invalid Rental State Transition Attempted', {
        level: 'warning',
        tags: { entity: 'rental', transition: `${currentState}->${nextState}` },
        extra: { rentalOrderId: rentalOrder._id, currentState, nextState },
      });
      throw new ApiError(
        400,
        `Invalid rental state transition from '${currentState}' to '${nextState}'. Allowed states: ${allowedNextStates.join(', ') || 'None'}`,
      );
    }

    Sentry.addBreadcrumb({
      category: 'state_machine',
      message: `Rental Order ${rentalOrder._id} transitioned from ${currentState} to ${nextState}`,
      level: 'info',
    });

    rentalOrder.status = nextState;

    if (note) {
      rentalOrder.statusHistory.push({
        status: nextState,
        note: note,
        performedBy,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Checks if a transition is allowed without modifying the order.
   */
  static canTransition(currentState: RentalState, nextState: RentalState): boolean {
    if (currentState === nextState) return true;
    const allowedNextStates = this.validTransitions[currentState] || [];
    return allowedNextStates.includes(nextState);
  }
}
