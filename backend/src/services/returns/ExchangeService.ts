import mongoose from 'mongoose';
import ExchangeRequest from '../../models/ExchangeRequest';
import Order from '../../models/Order';
import Product from '../../models/Product';
import ApiError from '../../utils/ApiError';
import { ReturnStateMachine } from './ReturnStateMachine';
import { InventoryService } from '../InventoryService';

export class ExchangeService {
  /**
   * Create a new exchange request.
   * Delegates to ReturnStateMachine for the underlying return request.
   */
  static async createExchangeRequest(
    userId: string,
    orderId: string,
    originalProductId: string,
    replacementProductId: string,
    exchangeType: 'size' | 'color' | 'variant' | 'different_product',
    quantity: number,
    pickupAddress?: any,
    idempotencyKey?: string,
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findOne({ _id: orderId, user: userId }).session(session);
      if (!order) throw new ApiError(404, 'Order not found');

      const originalItem = order.items.find((i) => i.productId.toString() === originalProductId);
      if (!originalItem) throw new ApiError(400, 'Original product not found in order');

      const replacementProduct = await Product.findById(replacementProductId).session(session);
      if (!replacementProduct) throw new ApiError(404, 'Replacement product not found');

      // Check if replacement is in stock
      const availableStock = replacementProduct.stock - replacementProduct.reservedStock;
      if (availableStock < quantity) {
        throw new ApiError(400, 'Replacement product is out of stock');
      }

      // 1. Create underlying ReturnRequest using State Machine
      const returnRequest = await ReturnStateMachine.createRequest(
        {
          userId,
          orderId,
          returnType: 'exchange',
          items: [
            {
              productId: originalProductId,
              returnQuantity: quantity,
              reason: `Exchange for ${replacementProduct.title}`,
            },
          ],
          pickupAddress,
        },
        idempotencyKey ? `${idempotencyKey}_return` : undefined,
        session,
      );

      // Check for existing exchange request (if idempotent)
      if (idempotencyKey) {
        const existingExchange = await ExchangeRequest.findOne({
          returnRequestId: returnRequest._id,
        }).session(session);
        if (existingExchange) {
          await session.commitTransaction();
          return { returnRequest, exchangeRequest: existingExchange };
        }
      }

      // Calculate price difference
      const originalTotal = originalItem.price * quantity;
      const replacementTotal = replacementProduct.price * quantity;
      const priceDifference = Math.abs(originalTotal - replacementTotal);

      let differenceAction: 'collect_payment' | 'refund_difference' | 'direct_exchange' =
        'direct_exchange';
      if (replacementTotal > originalTotal) differenceAction = 'collect_payment';
      else if (replacementTotal < originalTotal) differenceAction = 'refund_difference';

      // Generate Exchange ID
      const Counter = mongoose.model('Counter');
      const exCounter = await Counter.findOneAndUpdate(
        { _id: 'exchangeId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session },
      );
      const exchangeId = `EXC-${exCounter.seq.toString().padStart(5, '0')}`;

      const exchangeRequest = new ExchangeRequest({
        exchangeId,
        returnRequestId: returnRequest._id,
        originalItem: {
          productId: originalItem.productId,
          title: originalItem.title,
          variant: originalItem.variant,
          quantity,
          unitPrice: originalItem.price,
          imageSrc: originalItem.imageSrc,
        },
        replacementItem: {
          productId: replacementProduct._id,
          title: replacementProduct.title,
          quantity,
          unitPrice: replacementProduct.price,
          imageSrc: replacementProduct.imageSrc,
        },
        exchangeType,
        priceDifference,
        differenceAction,
        replacementStatus: 'pending_stock',
        timeline: [
          {
            action: 'Exchange Initiated',
            timestamp: new Date(),
          },
        ],
      });

      await exchangeRequest.save({ session });

      // Reserve stock for replacement
      await InventoryService.reserveInventory(
        replacementProduct._id.toString(),
        quantity,
        userId,
        60 * 24 * 7, // Reserve for 7 days
        session,
      );

      await session.commitTransaction();
      return { returnRequest, exchangeRequest };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
