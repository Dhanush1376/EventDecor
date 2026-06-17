import mongoose from 'mongoose';
import ApiError from '../utils/ApiError';
import { AdminAuditService } from './AdminAuditService';
import Order from '../models/Order';
import EventBooking from '../models/EventBooking';
import { PaymentRefundService } from './PaymentRefundService';
import { InventoryService } from './InventoryService';
import { OrderStateMachine } from './orders/OrderStateMachine';
import { EventBookingStateMachine } from './eventBooking/EventBookingStateMachine';

export class AdminWorkflowEngine {
  /**
   * High-value cancellation approval workflow.
   * Required for orders/bookings above a certain value threshold (e.g., ₹10,000)
   */
  static async approveCancellation(
    entityType: 'Order' | 'EventBooking' | 'RentalOrder',
    entityId: string,
    approvedBy: string,
    notes: string,
    session?: mongoose.ClientSession,
  ) {
    const User = require('../models/User').default;
    const adminUser = await User.findById(approvedBy);
    if (!adminUser || adminUser.role !== 'super_admin') {
      throw new ApiError(403, 'Forbidden: Only superadmins can approve high-value cancellations.');
    }

    let refundAmount = 0;
    let originalTxn = '';

    if (entityType === 'Order') {
      const order = await Order.findById(entityId).session(session || null);
      if (!order) throw new ApiError(404, 'Order not found');

      OrderStateMachine.validateTransition(entityId, order.orderStatus as any, 'Cancelled');
      order.orderStatus = 'Cancelled';
      await order.save({ session });

      refundAmount = order.total;
      originalTxn = order.razorpayPaymentId || '';
    } else if (entityType === 'EventBooking') {
      const booking = await EventBooking.findById(entityId).session(session || null);
      if (!booking) throw new ApiError(404, 'Booking not found');

      EventBookingStateMachine.transition(booking, 'cancelled', notes, approvedBy);
      await booking.save({ session });

      refundAmount = booking.pricing.depositAmount;
      originalTxn = booking.razorpayPaymentId || '';
    } else {
      throw new ApiError(400, `Unsupported entity type: ${entityType}`);
    }

    if (refundAmount > 0 && originalTxn) {
      await PaymentRefundService.initiateAsyncRefund({
        amount: refundAmount,
        currency: 'INR',
        originalTransactionId: originalTxn,
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
        reason: 'admin_approved_cancellation',
      });
    }

    await AdminAuditService.logAction({
      actorId: approvedBy,
      action: 'APPROVE_CANCELLATION',
      entityType,
      entityId,
      previousValue: { status: 'pending' },
      newValue: { status: 'cancelled', refundInitiated: refundAmount > 0 },
      note: `Cancellation approved. Notes: ${notes}`,
    } as any);

    return { success: true, refundInitiated: refundAmount > 0 };
  }

  /**
   * Workflow for approving major inventory adjustments (e.g., writing off > 10 units).
   */
  static async approveInventoryAdjustment(
    productId: string,
    adjustment: number, // positive or negative
    reason: string,
    approvedBy: string,
    session?: mongoose.ClientSession,
  ) {
    if (Math.abs(adjustment) > 50) {
      // Hard limit for safety
      throw new ApiError(403, 'Adjustments > 50 units require SuperAdmin physical approval in DB.');
    }

    const result = await InventoryService.adjustInventory(
      productId,
      adjustment,
      reason,
      approvedBy,
      session,
    );

    await AdminAuditService.logAction({
      actorId: approvedBy,
      action: 'INVENTORY_UPDATE',
      entityType: 'Product',
      entityId: productId,
      previousValue: { stock: result.previousStock },
      newValue: { stock: result.newStock },
      note: `Approved inventory adjustment of ${adjustment} units. Reason: ${reason}`,
    } as any);

    return result;
  }
}
