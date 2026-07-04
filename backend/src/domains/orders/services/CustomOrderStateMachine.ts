import mongoose from 'mongoose';
// Note: Assuming CustomOrder is a model or part of the schema
import CustomOrder from '../../../models/CustomOrder';

export class CustomOrderStateMachine {
  static async transition(
    orderId: string,
    toState: string,
    note?: string,
    session?: mongoose.ClientSession,
  ) {
    const order = await CustomOrder.findById(orderId).session(session || null);
    if (!order) throw new Error('Custom order not found');

    const validTransitions: Record<string, string[]> = {
      'Pending Review': ['Quoted', 'Rejected'],
      Quoted: ['Payment Received', 'Rejected'],
      'Payment Received': ['In Production'],
      'In Production': ['Ready For Dispatch'],
      'Ready For Dispatch': ['Dispatched'],
      Dispatched: ['Delivered'],
      Delivered: [],
      Rejected: [],
    };

    if (!validTransitions[order.status]?.includes(toState)) {
      throw new Error(`Invalid custom order state transition from ${order.status} to ${toState}`);
    }

    (order.status as any) = toState;

    // Check if statusHistory exists on CustomOrder. If not, this is safely ignored or initialized.
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      action: `State transitioned to ${toState}`,
      note: note || '',
      date: new Date(),
    } as any);

    await order.save({ session });
    return order;
  }
}
