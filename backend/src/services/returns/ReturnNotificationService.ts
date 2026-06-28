import { createAdminNotification, sendDirectEmail } from '../notificationService';
import { IReturnRequest } from '../../models/ReturnRequest';
import User from '../../models/User';

export class ReturnNotificationService {
  private static async getUserEmail(userId: string): Promise<string | null> {
    const user = await User.findById(userId).select('email').lean();
    return user?.email || null;
  }

  static async notifyAdminNewReturn(returnRequest: IReturnRequest) {
    const isHighValue = (returnRequest.refundBreakdown?.grandTotal ?? 0) > 5000;
    const isHighRisk = (returnRequest.fraudScore ?? 0) > 50;

    let title =
      returnRequest.returnType === 'exchange' ? 'New Exchange Request' : 'New Return Request';
    let type: 'user' | 'system' | 'order' | 'custom_request' | 'payment' | 'inquiry' = 'order';

    if (isHighRisk) {
      title = `🚨 High Risk ${returnRequest.returnType === 'exchange' ? 'Exchange' : 'Return'} Request`;
      type = 'system';
    } else if (isHighValue) {
      title = `💰 High Value ${returnRequest.returnType === 'exchange' ? 'Exchange' : 'Return'} Request`;
      type = 'payment';
    }

    await createAdminNotification({
      title,
      message: `${returnRequest.returnType === 'exchange' ? 'Exchange' : 'Return'} ${returnRequest.returnId} requested for Order ${returnRequest.orderId}. Value: ₹${returnRequest.refundBreakdown?.grandTotal || 0}`,
      type,
      actionLink: `/admin/returns/requests/${returnRequest._id}`,
    });

    const email = await this.getUserEmail(returnRequest.userId.toString());
    if (email) {
      await sendDirectEmail({
        email,
        subject: `${returnRequest.returnType === 'exchange' ? 'Exchange' : 'Return'} Request Received - ${returnRequest.returnId}`,
        templateName: 'return-submitted',
        context: { returnRequest },
        type: 'order',
        action: 'return_request_submitted',
      });
    }
  }

  static async notifyCustomerReturnApproved(returnRequest: IReturnRequest) {
    const email = await this.getUserEmail(returnRequest.userId.toString());
    if (email) {
      await sendDirectEmail({
        email,
        subject: `Update on your Return Request - ${returnRequest.returnId}`,
        templateName: 'return-approved',
        context: { returnRequest },
        type: 'order',
        action: 'return_request_approved',
      });
    }
  }

  static async notifyCustomerReturnRejected(returnRequest: IReturnRequest) {
    const email = await this.getUserEmail(returnRequest.userId.toString());
    if (email) {
      await sendDirectEmail({
        email,
        subject: `Update on your Return Request - ${returnRequest.returnId}`,
        templateName: 'return-rejected',
        context: { returnRequest },
        type: 'order',
        action: 'return_request_rejected',
      });
    }
  }

  static async notifyCustomerPickupScheduled(returnRequest: IReturnRequest) {
    const email = await this.getUserEmail(returnRequest.userId.toString());
    if (email) {
      await sendDirectEmail({
        email,
        subject: `Pickup Scheduled for Return - ${returnRequest.returnId}`,
        customHtml: `<h1>Pickup Scheduled</h1><p>Your pickup is scheduled for ${returnRequest.pickup?.scheduledDate}.</p>`,
        type: 'order',
        action: 'return_pickup_scheduled',
      });
    }
  }

  static async notifyCustomerRefundInitiated(returnRequest: IReturnRequest) {
    const email = await this.getUserEmail(returnRequest.userId.toString());
    if (email) {
      await sendDirectEmail({
        email,
        subject: `Refund Initiated for Return - ${returnRequest.returnId}`,
        customHtml: `<h1>Refund Initiated</h1><p>A refund of ₹${returnRequest.refundBreakdown?.grandTotal} has been initiated.</p>`,
        type: 'order',
        action: 'return_refund_initiated',
      });
    }
  }

  static async notifyCustomerRefundCompleted(returnRequest: IReturnRequest) {
    const email = await this.getUserEmail(returnRequest.userId.toString());
    if (email) {
      await sendDirectEmail({
        email,
        subject: `Refund Completed - ${returnRequest.returnId}`,
        templateName: 'refund-completed',
        context: { returnRequest },
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
