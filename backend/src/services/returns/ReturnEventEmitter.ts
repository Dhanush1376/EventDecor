import { emitAdminNotification, emitUserEvent } from '../../socket';
import OutboxEvent from '../../models/OutboxEvent';
import { IReturnRequest } from '../../models/ReturnRequest';
import mongoose from 'mongoose';
import logger from '../../config/logger';

export class ReturnEventEmitter {
  static async emitStatusUpdate(
    returnRequest: IReturnRequest,
    previousStatus: string,
    newStatus: string,
    session?: mongoose.ClientSession,
  ) {
    const payload = {
      returnId: returnRequest.returnId,
      orderId: returnRequest.orderId.toString(),
      status: newStatus,
      previousStatus,
      updatedAt: new Date(),
    };

    // 1. Create OutboxEvent for Audit & Microservices (transactional)
    await OutboxEvent.create(
      [
        {
          aggregateId: returnRequest._id.toString(),
          aggregateType: 'ReturnRequest',
          eventType: 'ReturnStatusUpdated',
          payload,
        },
      ],
      { session },
    );

    // 2. Emit Socket Events (Non-transactional, async)
    setImmediate(() => {
      try {
        // Notify Customer
        emitUserEvent(returnRequest.userId.toString(), 'return:status_updated', payload);

        // Notify Admin Dashboard
        emitAdminNotification({
          type: 'return_status',
          title: `Return Status Updated`,
          message: `Return ${returnRequest.returnId} is now ${newStatus}`,
          data: payload,
        });
      } catch (err) {
        logger.error(`Failed to emit socket events for return ${returnRequest.returnId}`, err);
      }
    });
  }

  static async emitReturnCreated(returnRequest: IReturnRequest, session?: mongoose.ClientSession) {
    const payload = {
      returnId: returnRequest.returnId,
      orderId: returnRequest.orderId.toString(),
      returnType: returnRequest.returnType,
      itemsCount: returnRequest.items.length,
      createdAt: returnRequest.createdAt,
    };

    await OutboxEvent.create(
      [
        {
          aggregateId: returnRequest._id.toString(),
          aggregateType: 'ReturnRequest',
          eventType: 'ReturnCreated',
          payload,
        },
      ],
      { session },
    );

    setImmediate(() => {
      try {
        emitUserEvent(returnRequest.userId.toString(), 'return:created', payload);
        emitAdminNotification({
          type: 'return_created',
          title: `New ${returnRequest.returnType === 'exchange' ? 'Exchange' : 'Return'} Created`,
          message: `${returnRequest.returnId} created for order ${returnRequest.orderId}`,
          data: payload,
        });
      } catch (err) {
        logger.error(
          `Failed to emit socket events for return creation ${returnRequest.returnId}`,
          err,
        );
      }
    });
  }
}
