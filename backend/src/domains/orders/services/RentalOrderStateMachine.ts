import mongoose from 'mongoose';
import RentalOrder from '../../../models/RentalOrder';

export class RentalOrderStateMachine {
  static async transition(
    orderId: string,
    toState: string,
    note?: string,
    session?: mongoose.ClientSession,
  ) {
    const order = await RentalOrder.findById(orderId).session(session || null);
    if (!order) throw new Error('Rental order not found');

    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'pending_approval', 'cancelled', 'payment_failed'],
      pending_approval: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready_for_pickup', 'dispatched'],
      ready_for_pickup: ['picked_up'],
      dispatched: ['delivered'],
      picked_up: ['returned_pending_inspection'],
      delivered: ['returned_pending_inspection'],
      returned_pending_inspection: ['completed', 'damage_reported'],
      damage_reported: ['completed'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[order.status]?.includes(toState)) {
      throw new Error(`Invalid rental state transition from ${order.status} to ${toState}`);
    }

    (order.status as any) = toState;
    order.statusHistory.push({
      status: toState,
      note: note || `State transitioned to ${toState}`,
      timestamp: new Date(),
    });

    await order.save({ session });
    return order;
  }
}
