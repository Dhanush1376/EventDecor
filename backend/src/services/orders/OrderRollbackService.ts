import mongoose from 'mongoose';
import Coupon from '../../models/Coupon';
import WalletTransaction from '../../models/WalletTransaction';
import { creditWalletBalance } from '../../utils/payment/walletMutations';
import { InventoryService } from '../InventoryService';
import logger from '../../config/logger';

/**
 * OrderRollbackService — Centralized rollback operations for failed/cancelled orders.
 *
 * Eliminates code duplication between:
 * - PaymentVerificationService (verification failure rollback)
 * - PaymentWebhookService (webhook failure rollback)
 * - OrderFulfillmentService (cancellation/return rollback)
 *
 * Every rollback operation writes to InventoryLog via InventoryService.
 */
export class OrderRollbackService {
  /**
   * Releases inventory reservations OR restores confirmed stock.
   * @param order The order document
   * @param isConfirmed Whether stock was already confirmed (deducted from stock) or just reserved
   * @param session MongoDB session for transaction safety
   */
  static async rollbackInventory(
    order: any,
    isConfirmed: boolean,
    session: mongoose.ClientSession,
  ): Promise<void> {
    if (isConfirmed) {
      // Stock was already deducted — restore it
      for (const item of order.items) {
        if (item.productId && item.quantity) {
          await InventoryService.restoreStock(
            item.productId.toString(),
            item.quantity,
            'order_cancelled',
            order._id.toString(),
            'Order',
            'system',
            session,
          );
        }
      }
    } else {
      // Stock was only reserved — release reservations
      if (order.reservationIds && order.reservationIds.length > 0) {
        for (const resId of order.reservationIds) {
          try {
            await InventoryService.cancelReservation(resId.toString(), session);
          } catch (err: any) {
            if (err.statusCode === 404 || err.message?.includes('not found')) {
              logger.warn(
                `[ROLLBACK] Reservation ${resId} not found during rollback of order ${order._id}. Skipping since it is already released.`,
              );
            } else {
              throw err;
            }
          }
        }
      } else {
        // Fallback for older orders without reservation tracking
        for (const item of order.items) {
          if (item.productId && item.quantity) {
            await InventoryService.releaseReservedStock(
              item.productId.toString(),
              item.quantity,
              'order_cancelled',
              order._id.toString(),
              'Order',
              'system',
              session,
            );
          }
        }
      }
    }
  }

  /**
   * Rolls back coupon usage for the given order.
   */
  static async rollbackCoupon(order: any, session: mongoose.ClientSession): Promise<void> {
    if (!order.couponCode) return;

    await Coupon.findOneAndUpdate(
      {
        code: order.couponCode.toUpperCase(),
        'usedBy.orderId': order._id,
        usedCount: { $gt: 0 },
      },
      {
        $inc: { usedCount: -1 },
        $pull: { usedBy: { orderId: order._id } },
      },
      { session },
    );

    logger.info(`[ROLLBACK] Coupon usage reversed for order ${order._id}: ${order.couponCode}`);
  }

  /**
   * Refunds wallet deduction for the given order.
   * Includes idempotency check to prevent double refunds.
   */
  static async rollbackWallet(order: any, session: mongoose.ClientSession): Promise<void> {
    if (!order.walletDeduction || order.walletDeduction <= 0) return;

    // Idempotency check — prevent double wallet refunds
    const existingRefund = await WalletTransaction.findOne({
      userId: order.user,
      amount: order.walletDeduction,
      source: 'refund',
      description: { $regex: new RegExp(`order ${order._id}`, 'i') },
    }).session(session);

    if (existingRefund) {
      logger.info(`[ROLLBACK] Wallet refund already exists for order ${order._id}, skipping`);
      return;
    }

    await creditWalletBalance(order.user, order.walletDeduction, session);
    await WalletTransaction.create(
      [
        {
          userId: order.user,
          type: 'credit',
          amount: order.walletDeduction,
          source: 'refund',
          description: `Refund for order ${order._id}`,
          status: 'active',
        },
      ],
      { session },
    );

    logger.info(`[ROLLBACK] Wallet ₹${order.walletDeduction} refunded for order ${order._id}`);
  }

  /**
   * Performs a complete rollback of all checkout side effects.
   * Used when payment verification fails or webhook reports failure.
   *
   * @param order The order document
   * @param isConfirmed Whether stock was already confirmed (post-payment) or just reserved (pre-payment)
   * @param session MongoDB session
   */
  static async rollbackAll(
    order: any,
    isConfirmed: boolean,
    session: mongoose.ClientSession,
  ): Promise<void> {
    await this.rollbackInventory(order, isConfirmed, session);
    await this.rollbackCoupon(order, session);
    await this.rollbackWallet(order, session);
  }
}
