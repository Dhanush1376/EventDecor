import mongoose from 'mongoose';
import OrderEvent from '../models/OrderEvent';
import crypto from 'crypto';
import logger from '../../../config/logger';

export class OrderEventService {
  /**
   * Creates an immutable OrderEvent record.
   * Calculates a cryptographic signature over the previous event to ensure chain integrity.
   */
  static async recordEvent(
    orderId: string | mongoose.Types.ObjectId,
    orderType: 'purchase' | 'rental' | 'custom',
    eventType: string,
    performedBy: { userId?: mongoose.Types.ObjectId; name: string; role: string },
    source: 'system' | 'admin' | 'warehouse' | 'courier' | 'customer',
    metadata: any = {},
    session?: mongoose.ClientSession,
  ) {
    try {
      const eventId = `EVT-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;

      // Find previous event to build the chain
      const previousEvent = await OrderEvent.findOne({ orderId })
        .sort({ timestamp: -1 })
        .session(session || null);

      const previousEventId = previousEvent ? previousEvent._id : null;
      const previousSignature = previousEvent ? previousEvent.signature : 'genesis';

      // Build the signature payload
      const payload = `${eventId}:${orderId}:${eventType}:${previousSignature}`;
      const signature = crypto.createHash('sha256').update(payload).digest('hex');

      const orderEvent = new OrderEvent({
        eventId,
        orderId,
        orderType,
        eventType,
        performedBy,
        source,
        metadata,
        previousEventId,
        signature,
        isValid: true,
      });

      if (session) {
        await orderEvent.save({ session });
      } else {
        await orderEvent.save();
      }

      return orderEvent;
    } catch (error) {
      logger.error('Failed to record OrderEvent:', error);
      throw error;
    }
  }

  /**
   * Verifies the cryptographic chain of events for an order to ensure no tampering occurred.
   */
  static async verifyEventChain(orderId: string | mongoose.Types.ObjectId): Promise<boolean> {
    const events = await OrderEvent.find({ orderId }).sort({ timestamp: 1 });

    if (!events.length) return true;

    let expectedPreviousSignature = 'genesis';

    for (const event of events) {
      const payload = `${event.eventId}:${event.orderId}:${event.eventType}:${expectedPreviousSignature}`;
      const calculatedSignature = crypto.createHash('sha256').update(payload).digest('hex');

      if (calculatedSignature !== event.signature) {
        logger.error(`Chain broken at event ${event.eventId} for order ${orderId}`);
        return false;
      }
      expectedPreviousSignature = event.signature;
    }

    return true;
  }
}
