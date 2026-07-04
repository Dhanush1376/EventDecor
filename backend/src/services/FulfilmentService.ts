import { Types } from 'mongoose';
import { Fulfilment, ITrackingEvent } from '../models/Fulfilment';
import { Transaction } from '../models/Transaction';
import { SequenceGeneratorService } from './SequenceGeneratorService';
import logger from '../config/logger';

export class FulfilmentService {
  /**
   * Initializes a fulfilment record for a transaction.
   * Typically called when an order is paid or confirmed.
   */
  public static async initializeFulfilment(transactionId: string | Types.ObjectId) {
    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      const existing = await Fulfilment.findOne({ transactionId: transaction._id });
      if (existing) {
        return existing;
      }

      const fulfilmentNumber = await SequenceGeneratorService.generateFulfilmentNumber();

      const fulfilment = new Fulfilment({
        fulfilmentNumber,
        transactionId: transaction._id,
        customer: transaction.customer,
        domain: transaction.domain,
        status: 'PENDING',
        events: [
          {
            status: 'PENDING',
            message: 'Order received and is pending processing.',
            timestamp: new Date(),
          },
        ],
      });

      return await fulfilment.save();
    } catch (error) {
      logger.error(`Error initializing fulfilment for transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Adds an immutable tracking event to a fulfilment record.
   */
  public static async addTrackingEvent(
    fulfilmentNumber: string,
    status: ITrackingEvent['status'],
    message: string,
    location?: string,
    metadata?: Record<string, any>,
  ) {
    const fulfilment = await Fulfilment.findOne({ fulfilmentNumber });
    if (!fulfilment) {
      throw new Error(`Fulfilment ${fulfilmentNumber} not found`);
    }

    const savedFulfilment = await (fulfilment as any).addEvent(status, message, location, metadata);

    try {
      const { emitUserEvent } = require('../socket');
      emitUserEvent(fulfilment.customer.toString(), 'tracking_updated', {
        fulfilmentNumber,
        status,
        message,
        location,
      });

      const { NotificationService } = require('./notificationService');
      await NotificationService.createNotification({
        userId: fulfilment.customer,
        title: `Tracking Update: ${status}`,
        message,
        type: 'tracking_update',
      });
    } catch (e) {
      logger.warn('Failed to emit tracking update notification', e);
    }

    return savedFulfilment;
  }
}
