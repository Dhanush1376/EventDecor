import mongoose from 'mongoose';
import RefundRecord from '../../models/RefundRecord';
import WalletTransaction from '../../models/WalletTransaction';
import User from '../../models/User';
import OutboxEvent from '../../models/OutboxEvent';
import logger from '../../config/logger';
import ApiError from '../../utils/ApiError';

export class WalletRefundService {
  /**
   * Secure server-side service to credit a refund directly to a user's wallet.
   * Completely idempotent and runs synchronously within the main database transaction.
   */
  static async creditRefund(
    {
      returnRequestId,
      orderId,
      userId,
      amount,
      currency = 'INR',
      reason,
      isPartial = false,
    }: {
      returnRequestId: string | mongoose.Types.ObjectId;
      orderId: string | mongoose.Types.ObjectId;
      userId: string | mongoose.Types.ObjectId;
      amount: number;
      currency?: string;
      reason?: string;
      isPartial?: boolean;
    },
    session?: mongoose.ClientSession,
  ) {
    if (amount <= 0) {
      throw new ApiError(400, 'Refund amount must be greater than zero.');
    }

    const existingTransaction = await WalletTransaction.findOne({
      source: 'refund',
      returnRequestId: returnRequestId,
    }).session(session || null);

    if (existingTransaction) {
      logger.warn(
        `[WALLET_REFUND] Idempotency triggered: Refund for ReturnRequest ${returnRequestId} already credited to wallet.`,
      );
      return;
    }

    // 2. Lock User document for wallet balance update
    const user = await User.findById(userId).session(session || null);
    if (!user) {
      throw new ApiError(404, 'User not found for wallet refund.');
    }

    const balanceBefore = user.walletBalance || 0;
    const balanceAfter = balanceBefore + amount;

    // 3. Update User Balance
    user.walletBalance = balanceAfter;
    await user.save({ session });

    // 4. Create Wallet Ledger Transaction
    const transactionDesc = reason || `Refund for Return ${returnRequestId}`;
    const walletTx = new WalletTransaction({
      userId,
      type: 'credit',
      amount,
      source: 'refund',
      description: transactionDesc,
      orderId,
      returnRequestId,
      balanceBefore,
      balanceAfter,
      status: 'active',
    });
    await walletTx.save({ session });

    // 5. Create RefundRecord to track this refund
    const refundRecord = new RefundRecord({
      amount,
      currency,
      originalTransactionId: `wallet_tx_${walletTx._id}`,
      entityType: 'Order',
      entityId: orderId,
      status: 'completed', // Wallet refunds are instant
      isPartial,
      reason: transactionDesc,
      returnRequestId,
      refundMethod: 'wallet',
      completedAt: new Date(),
    });
    await refundRecord.save({ session });

    // 6. Create Outbox Event for Notifications
    const outboxEvent = new OutboxEvent({
      aggregateId: returnRequestId.toString(),
      aggregateType: 'ReturnRequest',
      eventType: 'WalletRefundCompleted',
      payload: {
        returnRequestId: returnRequestId.toString(),
        userId: userId.toString(),
        amount,
        walletTransactionId: walletTx._id.toString(),
        refundRecordId: refundRecord._id.toString(),
      },
    });
    await outboxEvent.save({ session });

    logger.info(
      `[WALLET_REFUND] Successfully credited ₹${amount} to user ${userId} for ReturnRequest ${returnRequestId}`,
    );

    return {
      walletTransaction: walletTx,
      refundRecord,
    };
  }
}
