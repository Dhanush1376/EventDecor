import Order from '../../models/Order';
import ApiError from '../../utils/ApiError';
import { RazorpayGateway } from '../../utils/RazorpayGateway';
import logger from '../../config/logger';

export class OrderRetryService {
  /**
   * Re-creates a Razorpay order for an existing failed order.
   * Ensures the existing reservations (if any) are kept, but generates a new razorpayOrderId.
   */
  static async retryFailedPayment(orderId: string, userId: string) {
    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.paymentStatus !== 'failed') {
      throw new ApiError(400, `Cannot retry payment for order in '${order.paymentStatus}' state`);
    }

    if (order.orderStatus === 'Cancelled') {
      throw new ApiError(
        400,
        'Cannot retry payment for a cancelled order. Please place a new order.',
      );
    }

    try {
      // Generate new Razorpay order
      const rzpOrder = await RazorpayGateway.createOrder({
        amount: Math.round(order.total * 100), // Amount in paise
        currency: 'INR',
        receipt: `retry_${order._id.toString()}_${Date.now()}`,
        notes: {
          orderId: order._id.toString(),
          userId: userId,
          isRetry: 'true',
        },
      });

      // Update the order with new Razorpay Order ID and reset payment state
      order.razorpayOrderId = rzpOrder.id;
      order.paymentStatus = 'pending';
      order.statusHistory.push({
        status: order.orderStatus as any,
        note: `Payment retry initiated. New Razorpay Order ID: ${rzpOrder.id}`,
        timestamp: new Date(),
      });

      await order.save();
      logger.info(
        `[ORDER RETRY] Successfully generated new payment session for order ${order._id}`,
      );

      return {
        success: true,
        orderId: order._id,
        razorpayOrderId: rzpOrder.id,
        amount: order.total,
        currency: 'INR',
      };
    } catch (err: any) {
      logger.error(
        `[ORDER RETRY] Failed to create Razorpay order for retry on order ${orderId}:`,
        err,
      );
      throw new ApiError(500, 'Failed to initialize payment retry. Please try again.');
    }
  }
}
