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
    reason: string,
    pickupAddress?: any,
    idempotencyKey?: string,
    refundMethod?: 'original' | 'wallet' | 'store_credit',
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

      // Calculate real price difference accurately considering discounts
      const totalDeductions = (order.discount || 0) + (order.walletDeduction || 0);
      let effectiveUnitPrice = originalItem.price;

      if (totalDeductions > 0 && order.subtotal > 0) {
        const ratio = effectiveUnitPrice / order.subtotal;
        effectiveUnitPrice = Math.max(0, effectiveUnitPrice - totalDeductions * ratio);
      }

      const originalTotal = effectiveUnitPrice * quantity;
      const replacementTotal = replacementProduct.price * quantity;
      const priceDifference = Math.abs(originalTotal - replacementTotal);

      let differenceAction: 'collect_payment' | 'refund_difference' | 'direct_exchange' =
        'direct_exchange';
      if (replacementTotal > originalTotal) differenceAction = 'collect_payment';
      else if (replacementTotal < originalTotal) differenceAction = 'refund_difference';

      // Ensure 'original' refund method isn't used if order was COD
      if (
        differenceAction === 'refund_difference' &&
        refundMethod === 'original' &&
        order.paymentMethod === 'cod'
      ) {
        throw new ApiError(
          400,
          'Cannot refund to original payment method for COD orders. Please select wallet.',
        );
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
              reason: reason || `Exchange for ${replacementProduct.title}`,
            },
          ],
          refundMethod: differenceAction === 'refund_difference' ? refundMethod : undefined,
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

      // (Calculation moved up)

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
        paymentStatus:
          differenceAction === 'collect_payment' ? 'payment_required' : 'not_applicable',
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
      const reservation = await InventoryService.reserveInventory(
        replacementProduct._id.toString(),
        quantity,
        userId,
        60 * 24 * 7, // Reserve for 7 days
        session,
      );

      // Persist reservation ID for lifecycle management (confirm on delivery, cancel on rejection)
      exchangeRequest.replacementItem.reservationId = reservation._id;
      await exchangeRequest.save({ session });

      let razorpayOrderId;
      let amountToPay = 0;

      if (differenceAction === 'collect_payment') {
        const { RazorpayGateway } = require('../../utils/payment/RazorpayGateway');
        amountToPay = Math.round(priceDifference * 100); // Amount in paise

        // Wait until transaction commits before creating razorpay order?
        // Razorpay API calls shouldn't be strictly bound to MongoDB session unless necessary.
        const rzpOrder = await RazorpayGateway.createOrder({
          amount: amountToPay,
          currency: 'INR',
          receipt: exchangeId,
          notes: {
            exchangeId,
            userId,
          },
        });

        razorpayOrderId = rzpOrder.id;
        exchangeRequest.additionalPaymentId = razorpayOrderId; // Save it to the exchange
        // Important: Wait for verification before advancing
        exchangeRequest.inspectionStatus = 'pending';
        // Note: frontend will need to pass this razorpayOrderId to the Razorpay widget
        await exchangeRequest.save({ session });
      }

      await session.commitTransaction();
      return { returnRequest, exchangeRequest, razorpayOrderId, amountToPay: priceDifference };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
