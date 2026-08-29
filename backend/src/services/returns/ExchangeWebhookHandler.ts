import logger from '../../config/logger';
import ExchangeRequest from '../../models/ExchangeRequest';
import Order from '../../models/Order';
import PaymentWebhookEvent from '../../models/PaymentWebhookEvent';
import { ReturnNotificationService } from './ReturnNotificationService';

export class ExchangeWebhookHandler {
  static async handleWebhookEvent(
    event: string,
    body: any,
    signature: string,
    eventId: string,
    entityId: string,
  ) {
    if (event === 'payment.captured' || event === 'order.paid') {
      const exchangeRequest = await ExchangeRequest.findById(entityId);

      if (!exchangeRequest) {
        throw new Error(`ExchangeRequest not found for id ${entityId}`);
      }

      if (exchangeRequest.paymentStatus === 'payment_paid') {
        logger.info(`[EXCHANGE WEBHOOK] Exchange ${entityId} is already paid. Skipping.`);
        await PaymentWebhookEvent.updateOne(
          { razorpayEventId: eventId },
          { $set: { status: 'processed', updatedAt: new Date() } },
        );
        return { status: 200, message: 'Already processed' };
      }

      exchangeRequest.paymentStatus = 'payment_paid';
      exchangeRequest.timeline.push({
        action: 'Payment Verified (Webhook)',
        timestamp: new Date(),
      });

      await exchangeRequest.save();

      const ReturnRequest = require('../../models/ReturnRequest').default;
      const returnReq = await ReturnRequest.findById(exchangeRequest.returnRequestId).lean();
      if (returnReq) {
        await Order.findByIdAndUpdate(returnReq.orderId, { hasActiveExchange: true });
        // Email customer
        await ReturnNotificationService.notifyCustomerExchangeVerified(returnReq);
      }

      logger.info(`[EXCHANGE WEBHOOK] Successfully marked Exchange ${entityId} as paid.`);

      await PaymentWebhookEvent.updateOne(
        { razorpayEventId: eventId },
        { $set: { status: 'processed', updatedAt: new Date() } },
      );

      return { status: 200, message: 'Exchange payment verified via webhook' };
    }

    // Unhandled event
    await PaymentWebhookEvent.updateOne(
      { razorpayEventId: eventId },
      { $set: { status: 'processed', updatedAt: new Date() } },
    );
    return { status: 200, message: 'Event ignored for exchange request' };
  }
}
