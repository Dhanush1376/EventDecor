import mongoose from 'mongoose';
import RefundRecord from '../models/RefundRecord';
import AdminAuditLog from '../models/AdminAuditLog';
import ApiError from '../utils/ApiError';
import { PaymentRefundService } from './PaymentRefundService';
import logger from '../config/logger';
import { createAdminNotification } from './notificationService';

const REFUND_APPROVAL_THRESHOLD = 5000; // Refunds above ₹5000 require approval

export class AdminRefundApprovalService {
  /**
   * Evaluates if a refund requires admin approval.
   * If yes, creates a pending refund record and notifies admins.
   * If no, proceeds with standard async refund.
   */
  static async evaluateRefundRequest(
    refundParams: {
      amount: number;
      currency?: string;
      originalTransactionId: string;
      entityType: 'Order' | 'Rental' | 'EventBooking';
      entityId: mongoose.Types.ObjectId | string;
      isPartial?: boolean;
      reason?: string;
    },
    requestedBy: string,
  ): Promise<{ status: 'queued_for_processing' | 'requires_approval'; refundId?: string }> {
    if (refundParams.amount >= REFUND_APPROVAL_THRESHOLD) {
      logger.info(`[REFUND APPROVAL] Refund of ₹${refundParams.amount} requires admin approval.`);

      const refundRecord = await RefundRecord.create({
        ...refundParams,
        status: 'pending_approval',
      });

      await createAdminNotification({
        title: 'High-Value Refund Requires Approval',
        message: `A refund of ₹${refundParams.amount} for ${refundParams.entityType} (${refundParams.entityId}) has been requested and requires approval.`,
        type: 'payment',
        actionLink: `/admin/refunds/${refundRecord._id}/approve`,
      });

      return { status: 'requires_approval', refundId: refundRecord._id.toString() };
    }

    // Direct processing for small refunds
    await PaymentRefundService.initiateAsyncRefund(refundParams);
    return { status: 'queued_for_processing' };
  }

  /**
   * Approves a pending high-value refund and queues it for processing.
   */
  static async approveRefund(refundId: string, adminId: string, approvalNotes?: string) {
    const User = require('../models/User').default;
    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.role !== 'super_admin') {
      throw new ApiError(403, 'Forbidden: Only superadmins can approve high-value refunds.');
    }

    const refund = await RefundRecord.findById(refundId);
    if (!refund) throw new ApiError(404, 'Refund record not found');
    if (refund.status !== 'pending_approval') {
      throw new ApiError(400, `Refund cannot be approved (current status: ${refund.status})`);
    }

    refund.status = 'pending';
    refund.reason = refund.reason
      ? `${refund.reason} | Approved by ${adminId}: ${approvalNotes || 'No notes'}`
      : `Approved by ${adminId}`;
    await refund.save();

    // Enqueue for processing
    const { isQueuesReady, refundQueue } = require('../jobs/queues');
    if (isQueuesReady()) {
      await refundQueue.add('processRefund', { refundRecordId: refund._id });
    } else {
      throw new ApiError(500, 'Queue system unavailable. Cannot process approved refund.');
    }

    // Audit Log
    await AdminAuditLog.create({
      actorId: new mongoose.Types.ObjectId(adminId),
      method: 'SYSTEM',
      path: '/system/refund-approval',
      statusCode: 200,
      action: 'APPROVE',
      entityType: 'RefundRecord',
      entityId: refund._id.toString(),
      changes: {
        status: { old: 'pending_approval', new: 'pending' },
        approvalNotes: { new: approvalNotes },
      },
      ip: 'internal',
    });

    return refund;
  }

  /**
   * Rejects a pending high-value refund.
   */
  static async rejectRefund(refundId: string, adminId: string, rejectionReason: string) {
    const User = require('../models/User').default;
    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.role !== 'super_admin') {
      throw new ApiError(403, 'Forbidden: Only superadmins can reject high-value refunds.');
    }

    const refund = await RefundRecord.findById(refundId);
    if (!refund) throw new ApiError(404, 'Refund record not found');
    if (refund.status !== 'pending_approval') {
      throw new ApiError(400, `Refund cannot be rejected (current status: ${refund.status})`);
    }

    refund.status = 'failed';
    refund.errorDetails = `Rejected by Admin (${adminId}): ${rejectionReason}`;
    await refund.save();

    await AdminAuditLog.create({
      actorId: new mongoose.Types.ObjectId(adminId),
      method: 'SYSTEM',
      path: '/system/refund-rejection',
      statusCode: 200,
      action: 'REJECT',
      entityType: 'RefundRecord',
      entityId: refund._id.toString(),
      changes: {
        status: { old: 'pending_approval', new: 'failed' },
        rejectionReason: { new: rejectionReason },
      },
      ip: 'internal',
    });

    return refund;
  }
}
