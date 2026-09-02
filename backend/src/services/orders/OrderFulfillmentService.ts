import mongoose from 'mongoose';
import Order from '../../models/Order';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import { emitUserEvent } from '../../socket';
import * as Sentry from '@sentry/node';
import { OrderStateMachine } from './OrderStateMachine';
import { PaymentStateMachine } from '../payments/PaymentStateMachine';
import { PaymentRefundService } from '../PaymentRefundService';
import { OrderRollbackService } from './OrderRollbackService';
import OutboxEvent from '../../models/OutboxEvent';
import storeSettingsService from '../../services/StoreSettingsService';
import { RuleEngine } from '../../domains/rules/services/RuleEngine';

export class OrderFulfillmentService {
  static async updateOrderStatus(
    id: string,
    status: string,
    note?: string,
    courierCharges?: number,
  ) {
    const session = await mongoose.startSession();
    let finalOrder: any;
    let triggerPurchaseRewards = false;
    let triggerReversalRewards = false;

    const settings = await storeSettingsService.getSettings();

    // Compatibility Mapping for lowercase status strings
    let finalStatus = status;
    if (status === 'placed' || status === 'Payment Pending') finalStatus = 'Pending';
    else if (status === 'confirmed') finalStatus = 'Confirmed';
    else if (
      status === 'processing' ||
      status === 'packed' ||
      status === 'Packed' ||
      status === 'Ready to Ship' ||
      status === 'Shipped' ||
      status === 'shipped' ||
      status === 'Out for Delivery'
    )
      finalStatus = 'Processing';
    else if (status === 'delivered') finalStatus = 'Delivered';
    else if (status === 'cancelled') finalStatus = 'Cancelled';
    else if (status === 'settled') finalStatus = 'Settled';

    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(id).session(session);
        if (!order) throw new ApiError(404, 'Order not found');

        // State Machine Validation
        const oldStatus = order.orderStatus as any;

        // Evaluate rules before confirming
        if (finalStatus === 'Confirmed' && oldStatus === 'Pending') {
          const { requiresApproval } = await RuleEngine.evaluate(order, 'Order', session);
          if (requiresApproval) {
            finalStatus = 'Pending';
            order.isOnHold = true;
            order.holdReason = 'Order flagged by business rules pending admin approval.';
            note = 'Order flagged by business rules. Placed On Hold pending admin approval.';
          }
        }

        OrderStateMachine.validateTransition(id, oldStatus, finalStatus as any);

        // Track successful state transitions for analytics and audit
        if (oldStatus !== finalStatus) {
          Sentry.addBreadcrumb({
            category: 'state_machine',
            message: `Order ${id} transitioned from ${oldStatus} to ${finalStatus}`,
            level: 'info',
          });
        }

        // Block 'Returned' or 'Refunded' if all items are non-refundable
        if (finalStatus === 'Returned' || finalStatus === 'Refunded') {
          const allNonRefundable =
            order.items.length > 0 && order.items.every((item: any) => item.isNonRefundable);
          if (allNonRefundable) {
            throw new ApiError(
              400,
              'This order consists entirely of non-refundable items and cannot be returned or refunded.',
            );
          }
        }

        order.orderStatus = finalStatus as any;

        if (courierCharges !== undefined && courierCharges !== null) {
          order.courierCharges = courierCharges;
        }

        // Automatic COD Remittance Transitions
        if (order.paymentMethod?.toLowerCase() === 'cod') {
          if (finalStatus === 'Delivered') {
            order.codCollected = true;
            order.paymentStatus = 'COD Collected';
            order.settlementStatus = 'Pending';
            if (!order.courierCharges) {
              order.courierCharges =
                courierCharges !== undefined
                  ? courierCharges
                  : Math.round((order.shippingFee || settings.shipping.deliveryCharge) + 30);
            }
            order.statusHistory.push({
              status: 'COD Collected',
              timestamp: new Date(),
              note: 'Package delivered. Cash collected by courier agent. Reconciliation pending.',
            });
          } else if (finalStatus === 'Settled') {
            order.codCollected = true;
            order.paymentStatus = 'paid';
            order.settlementStatus = 'Settled';
            const charges =
              courierCharges !== undefined
                ? courierCharges
                : order.courierCharges ||
                  Math.round((order.shippingFee || settings.shipping.deliveryCharge) + 30);
            order.courierCharges = charges;
            order.settledAmount = Math.max(0, order.total - charges);
            order.earnings = order.settledAmount;
            order.statusHistory.push({
              status: 'Settled',
              timestamp: new Date(),
              note: `COD Remittance Settled. Received amount: ₹${order.settledAmount} (Total: ₹${order.total} - Courier fee: ₹${charges})`,
            });
          }
        }

        order.statusHistory.push({ status: finalStatus, timestamp: new Date(), note });

        // Process Loyalty/Wallet adjustments based on status change
        if (finalStatus === 'Delivered') {
          triggerPurchaseRewards = true;
        } else if (
          finalStatus === 'Cancelled' ||
          finalStatus === 'Returned' ||
          finalStatus === 'Refunded'
        ) {
          triggerReversalRewards = true;

          // Use centralized rollback service (handles inventory + coupon + wallet with audit trail)
          const isStockConfirmed = oldStatus !== 'Pending'; // If order was beyond Pending, stock was deducted
          await OrderRollbackService.rollbackAll(order, isStockConfirmed, session);

          // Automated Razorpay refund integration for online paid orders via async Queue
          if (
            order.paymentStatus === 'paid' &&
            order.razorpayPaymentId &&
            order.paymentMethod?.toLowerCase() === 'razorpay'
          ) {
            try {
              logger.info(
                `[PAYMENT REFUND] Enqueueing Razorpay automatic refund of ₹${order.total} for order: ${order._id}`,
              );

              await PaymentRefundService.initiateAsyncRefund(
                {
                  amount: order.total,
                  currency: 'INR',
                  originalTransactionId: order.razorpayPaymentId,
                  entityType: 'Order',
                  entityId: order._id,
                },
                session,
              );

              PaymentStateMachine.transition(
                order,
                'refunded',
                'Refund initiated and queued for background processing.',
              );
            } catch (enqueueErr: any) {
              logger.error('🏥 [REFUND FAILED] Failed to enqueue async refund:', enqueueErr);
              order.statusHistory.push({
                status: order.orderStatus as any, // keep current status
                timestamp: new Date(),
                note: `Failed to initiate automated refund: ${enqueueErr.message || 'Queue error'}`,
              });

              // Fallback to manual admin alert
              Sentry.captureException(enqueueErr, { extra: { orderId: order._id } });
            }
          }
        }

        await OutboxEvent.create(
          [
            {
              aggregateId: order._id.toString(),
              aggregateType: 'Order',
              eventType: 'OrderStatusUpdated',
              payload: {
                orderId: order._id.toString(),
                userId: order.user.toString(),
                oldStatus: oldStatus,
                newStatus: finalStatus,
                note: note || '',
                total: order.total,
                paymentStatus: order.paymentStatus,
                triggerPurchaseRewards,
                triggerReversalRewards,
              },
            },
          ],
          { session },
        );

        const { OrderEventService } = require('../../domains/orders/services/OrderEventService');
        await OrderEventService.recordEvent(
          order._id,
          (order as any).orderType || 'purchase',
          `StatusUpdated:${finalStatus}`,
          { name: 'System', role: 'system' }, // Ideally from req.user, but we don't have it in this scope directly. Will use System as fallback.
          'system',
          { oldStatus, finalStatus, note },
          session,
        );

        await order.save({ session });
        finalOrder = order;
      });
    } finally {
      session.endSession();
    }

    const order = finalOrder;

    try {
      emitUserEvent(order.user.toString(), 'order_status_updated', {
        orderId: order._id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        note: note || null,
      });
    } catch (socketErr) {
      logger.debug('Could not emit user order status socket event:', socketErr);
    }

    return order;
  }
}
