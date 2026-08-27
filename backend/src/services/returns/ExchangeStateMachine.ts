import mongoose from 'mongoose';
import ExchangeRequest from '../../models/ExchangeRequest';
import Order from '../../models/Order';
import ApiError from '../../utils/ApiError';
import { ReturnStateMachine } from './ReturnStateMachine';

const VALID_EXCHANGE_TRANSITIONS: Record<string, string[]> = {
  pending_stock: ['reserved', 'cancelled'],
  reserved: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['completed'],
};

export class ExchangeStateMachine {
  /**
   * Transition the exchange replacement status to the next state.
   */
  static async transitionReplacement(
    exchangeId: string | mongoose.Types.ObjectId,
    nextStatus: string,
    adminId?: string,
    _metadata?: any,
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const exchange = await ExchangeRequest.findById(exchangeId).session(session);
      if (!exchange) {
        throw new ApiError(404, 'Exchange request not found');
      }

      const currentStatus = exchange.replacementStatus;

      // Allow 'completed' to be a valid state conceptually even if not in DB schema yet?
      // Wait, replacementStatus doesn't have 'completed' in schema, it has 'delivered'.
      // The exchange is considered completed when replacementStatus is 'delivered'.

      if (currentStatus === nextStatus) {
        await session.abortTransaction();
        return exchange;
      }

      const allowed = VALID_EXCHANGE_TRANSITIONS[currentStatus];
      if (!allowed || !allowed.includes(nextStatus)) {
        throw new ApiError(
          400,
          `Invalid exchange transition from ${currentStatus} to ${nextStatus}`,
        );
      }

      exchange.replacementStatus = nextStatus as any;

      exchange.timeline.push({
        action: `Replacement marked as ${nextStatus}`,
        timestamp: new Date(),
        performedBy: adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      });

      await exchange.save({ session });

      // If we reach delivered, the exchange workflow is complete.
      // We must mark the underlying ReturnRequest as completed as well if it isn't already,
      // or at least signal that the exchange portion is done.
      // In this architecture, ReturnRequest status 'completed' implies the whole return workflow is done.
      if (nextStatus === 'delivered') {
        const underlyingReturn = await mongoose
          .model('ReturnRequest')
          .findById(exchange.returnRequestId)
          .session(session);
        if (underlyingReturn && underlyingReturn.status !== 'completed') {
          // This will trigger ReturnStateMachine side effects, notably setting Order.hasActiveExchange = false
          await ReturnStateMachine.transition(
            underlyingReturn._id.toString(),
            'completed',
            adminId || 'system',
            undefined,
            session,
          );
        }
      }

      await session.commitTransaction();
      return exchange;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Helper to create a zero-dollar fulfillment order for the replacement item.
   * This bridges the ExchangeRequest with the actual logistics/shipping pipeline.
   */
  static async createReplacementOrder(
    exchangeId: string | mongoose.Types.ObjectId,
    adminId: string,
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const exchange = await ExchangeRequest.findById(exchangeId)
        .populate('returnRequestId')
        .session(session);
      if (!exchange) throw new ApiError(404, 'Exchange not found');

      if (exchange.exchangeOrderId) {
        throw new ApiError(400, 'Replacement order already exists');
      }

      const returnReq = exchange.returnRequestId as any; // populated
      const originalOrder = await Order.findById(returnReq.orderId).session(session);
      if (!originalOrder) throw new ApiError(404, 'Original order not found');

      const replacementItem = exchange.replacementItem;

      // Create a zero-value order for the replacement
      const replacementOrder = new Order({
        user: originalOrder.user,
        items: [
          {
            productId: replacementItem.productId,
            title: `[Replacement] ${replacementItem.title}`,
            price: 0, // Zero cost to customer for the replacement shipment itself
            quantity: replacementItem.quantity,
            variant: replacementItem.variant,
            imageSrc: replacementItem.imageSrc,
          },
        ],
        shippingAddress: originalOrder.shippingAddress,
        paymentMethod: 'Exchange Replacement',
        paymentStatus: 'paid', // Already handled via exchange difference
        orderStatus: 'Confirmed', // Ready for fulfillment
        subtotal: 0,
        shippingFee: 0,
        discount: 0,
        total: 0,
        notes: `Replacement order for Exchange ${exchange.exchangeId}`,
      });

      await replacementOrder.save({ session });

      exchange.exchangeOrderId = replacementOrder._id;
      exchange.timeline.push({
        action: 'Replacement Order Created',
        timestamp: new Date(),
        performedBy: new mongoose.Types.ObjectId(adminId),
      });

      await exchange.save({ session });

      await session.commitTransaction();
      return replacementOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
