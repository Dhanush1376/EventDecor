import { createAdminNotification } from '../notificationService';
import OutboxEvent from '../../models/OutboxEvent';
import { IReturnRequest } from '../../models/ReturnRequest';
import User from '../../models/User';
import ExchangeRequest from '../../models/ExchangeRequest';

import logger from '../../config/logger';

export class ReturnNotificationService {
  private static async getUser(userId: string) {
    return await User.findById(userId).select('name email phone').lean();
  }

  private static async getExchangeDetails(returnRequestId: string) {
    return await ExchangeRequest.findOne({ returnRequestId }).lean();
  }

  static async notifyAdminNewReturn(returnRequest: IReturnRequest) {
    try {
      const user = await this.getUser(returnRequest.userId.toString());
      const isExchange = returnRequest.returnType === 'exchange';

      const isHighValue = (returnRequest.refundBreakdown?.grandTotal ?? 0) > 5000;
      const isHighRisk = (returnRequest.fraudScore ?? 0) > 50;

      let title = isExchange ? 'New Exchange Request' : 'New Return Request';
      let type: 'user' | 'system' | 'order' | 'custom_request' | 'payment' | 'inquiry' = 'order';

      if (isHighRisk) {
        title = `🚨 High Risk ${isExchange ? 'Exchange' : 'Return'} Request`;
        type = 'system';
      } else if (isHighValue) {
        title = `💰 High Value ${isExchange ? 'Exchange' : 'Return'} Request`;
        type = 'payment';
      }

      await createAdminNotification({
        title,
        message: `${isExchange ? 'Exchange' : 'Return'} ${returnRequest.returnId} requested for Order ${returnRequest.orderId}.`,
        type,
        actionLink: `/admin/returns/requests/${returnRequest._id}`,
      });

      if (user?.email) {
        // Customer email is handled by the outbox processor for RETURNREQUEST_RETURNCREATED
      }
    } catch (error) {
      logger.error(`Error in notifyAdminNewReturn for ${returnRequest.returnId}:`, error);
    }
  }

  static async notifyCustomerReturnApproved(returnRequest: IReturnRequest) {
    try {
      const user = await this.getUser(returnRequest.userId.toString());
      if (!user?.email) return;

      // Customer email is handled by the outbox processor for RETURNREQUEST_RETURNSTATUSUPDATED
    } catch (error) {
      logger.error(`Error in notifyCustomerReturnApproved for ${returnRequest.returnId}:`, error);
    }
  }

  static async notifyCustomerReturnRejected(returnRequest: IReturnRequest, _reason?: string) {
    try {
      const user = await this.getUser(returnRequest.userId.toString());
      if (!user?.email) return;

      // Customer email is handled by the outbox processor for RETURNREQUEST_RETURNSTATUSUPDATED
    } catch (error) {
      logger.error(`Error in notifyCustomerReturnRejected for ${returnRequest.returnId}:`, error);
    }
  }

  static async notifyCustomerExchangeVerified(returnRequest: IReturnRequest) {
    try {
      await OutboxEvent.create({
        aggregateId: returnRequest._id.toString(),
        aggregateType: 'ReturnRequest',
        eventType: 'RETURNREQUEST_EXCHANGE_PAYMENT_VERIFIED',
        payload: { returnId: returnRequest._id.toString() },
      });
    } catch (error) {
      logger.error(`Error in notifyCustomerExchangeVerified for ${returnRequest.returnId}:`, error);
    }
  }

  static async notifyCustomerPickupScheduled(returnRequest: IReturnRequest) {
    try {
      await OutboxEvent.create({
        aggregateId: returnRequest._id.toString(),
        aggregateType: 'ReturnRequest',
        eventType: 'RETURNREQUEST_RETURNSTATUSUPDATED',
        payload: { status: 'return_courier_assigned' },
      });
    } catch (error) {
      logger.error(`Error in notifyCustomerPickupScheduled for ${returnRequest.returnId}:`, error);
    }
  }

  static async notifyCustomerRefundInitiated(returnRequest: IReturnRequest) {
    try {
      await OutboxEvent.create({
        aggregateId: returnRequest._id.toString(),
        aggregateType: 'ReturnRequest',
        eventType: 'RETURNREQUEST_RETURNSTATUSUPDATED',
        payload: { status: 'refund_initiated' },
      });
    } catch (error) {
      logger.error(`Error in notifyCustomerRefundInitiated for ${returnRequest.returnId}:`, error);
    }
  }

  static async notifyCustomerRefundCompleted(returnRequest: IReturnRequest) {
    try {
      await OutboxEvent.create({
        aggregateId: returnRequest._id.toString(),
        aggregateType: 'ReturnRequest',
        eventType: 'RETURNREQUEST_RETURNSTATUSUPDATED',
        payload: { status: 'completed' },
      });
    } catch (error) {
      logger.error(`Error in notifyCustomerRefundCompleted for ${returnRequest.returnId}:`, error);
    }
  }

  static async alertSlaBreach(returnRequest: IReturnRequest) {
    await createAdminNotification({
      title: '⚠️ SLA Breach: Return Request Overdue',
      message: `Return ${returnRequest.returnId} is overdue in stage: ${returnRequest.sla?.currentStage}`,
      type: 'system',
      actionLink: `/admin/returns/requests/${returnRequest._id}`,
    });
  }
}
