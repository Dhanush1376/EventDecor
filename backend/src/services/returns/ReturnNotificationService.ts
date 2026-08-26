import { createAdminNotification, sendDirectEmail } from '../notificationService';
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
      const user = await this.getUser(returnRequest.userId.toString());
      if (!user?.email) return;

      // Customer email is handled by the outbox processor for RETURNREQUEST_RETURNSTATUSUPDATED
    } catch (error) {
      logger.error(`Error in notifyCustomerExchangeVerified for ${returnRequest.returnId}:`, error);
    }
  }

  static async notifyCustomerPickupScheduled(returnRequest: IReturnRequest) {
    const user = await this.getUser(returnRequest.userId.toString());
    if (user?.email) {
      await sendDirectEmail({
        email: user.email,
        subject: `Pickup Scheduled for ${returnRequest.returnType === 'exchange' ? 'Exchange' : 'Return'} - ${returnRequest.returnId}`,
        customHtml: `<h1>Pickup Scheduled</h1><p>Your pickup is scheduled for ${returnRequest.pickup?.scheduledDate}.</p>`,
        type: 'order',
        action: 'return_pickup_scheduled',
      });
    }
  }

  static async notifyCustomerRefundInitiated(returnRequest: IReturnRequest) {
    const user = await this.getUser(returnRequest.userId.toString());
    if (user?.email) {
      await sendDirectEmail({
        email: user.email,
        subject: `Refund Initiated for Return - ${returnRequest.returnId}`,
        customHtml: `<h1>Refund Initiated</h1><p>A refund of ₹${returnRequest.refundBreakdown?.grandTotal} has been initiated.</p>`,
        type: 'order',
        action: 'return_refund_initiated',
      });
    }
  }

  static async notifyCustomerRefundCompleted(returnRequest: IReturnRequest) {
    const user = await this.getUser(returnRequest.userId.toString());
    if (user?.email) {
      await sendDirectEmail({
        email: user.email,
        subject: `Refund Completed - ${returnRequest.returnId}`,
        customHtml: `<h1>Refund Completed</h1><p>Your refund of ₹${returnRequest.refundBreakdown?.grandTotal} has been completed.</p>`,
        type: 'order',
        action: 'return_refund_completed',
      });
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
