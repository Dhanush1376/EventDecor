import { ITransaction } from '../types/transaction';
import { FulfilmentService } from '../services/FulfilmentService';
import { ITrackingEvent } from '../models/Fulfilment';
import logger from '../config/logger';

export class TransactionToFulfilmentMapper {
  /**
   * Translates a canonical transaction status into an immutable tracking event.
   */
  public static async syncTrackingEvent(transaction: ITransaction) {
    try {
      const { canonicalStatus, domain } = transaction;

      let trackingStatus: ITrackingEvent['status'] | null = null;
      let message = '';

      switch (canonicalStatus) {
        // Shared states
        case 'CONFIRMED':
        case 'PAYMENT_RECEIVED':
        case 'ADVANCE_PAID':
          trackingStatus = 'PROCESSING';
          message = 'Order is confirmed and being prepared.';
          break;
        case 'PACKED':
        case 'PREPARING':
          trackingStatus = 'PROCESSING';
          message = 'Order has been packed and is ready for dispatch.';
          break;
        case 'DISPATCHED':
        case 'IN_TRANSIT':
          trackingStatus = 'PROCESSING';
          message = 'Order has been shipped/dispatched.';
          break;
        case 'OUT_FOR_DELIVERY':
          trackingStatus = 'PROCESSING';
          message = 'Order is out for delivery.';
          break;
        case 'DELIVERED':
          trackingStatus = 'DELIVERED';
          message = 'Order has been delivered.';
          break;
        case 'RETURN_INITIATED':
        case 'RETURN_REQUESTED':
        case 'RETURN_APPROVED':
        case 'RETURN_IN_TRANSIT':
        case 'RETURN_RECEIVED':
        case 'RETURNED':
          trackingStatus = 'RETURNED';
          message = `Return status updated to: ${canonicalStatus}`;
          break;
        case 'CANCELLED':
        case 'REFUNDED':
          trackingStatus = 'CANCELLED';
          message = `Order has been ${canonicalStatus.toLowerCase()}.`;
          break;
      }

      if (trackingStatus) {
        // Wait! We need the Fulfilment number. We should find the fulfilment by transactionId
        const Fulfilment = require('../models/Fulfilment').default;
        const fulfilment = await Fulfilment.findOne({ transactionId: transaction._id });

        if (fulfilment) {
          // Avoid appending if the last event is the same status and message
          const lastEvent = fulfilment.events[fulfilment.events.length - 1];
          if (!lastEvent || lastEvent.status !== trackingStatus || lastEvent.message !== message) {
            await FulfilmentService.addTrackingEvent(
              fulfilment.fulfilmentNumber,
              trackingStatus,
              message,
              undefined,
              { canonicalStatus, domain },
            );
          }
        }
      }
    } catch (error) {
      logger.error(`Error mapping transaction to fulfilment event: ${transaction._id}`, error);
    }
  }
}
