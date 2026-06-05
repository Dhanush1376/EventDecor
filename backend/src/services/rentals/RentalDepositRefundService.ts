import mongoose from 'mongoose';
import RentalOrder from '../../models/RentalOrder';
import ApiError from '../../utils/ApiError';
import { PaymentRefundService } from '../PaymentRefundService';
import logger from '../../config/logger';
import OutboxEvent from '../../models/OutboxEvent';

export class RentalDepositRefundService {
  /**
   * Automates the deposit refund after a successful inspection of returned rental items.
   * Calculates deductions for damages or late returns.
   */
  static async processDepositRefund(
    rentalId: string,
    deductions: { amount: number; reason: string }[],
    adminId: string,
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const rental = await RentalOrder.findById(rentalId).session(session);
      if (!rental) {
        throw new ApiError(404, 'Rental order not found');
      }

      if (rental.status !== 'returned') {
        throw new ApiError(400, 'Deposit can only be refunded after items are marked as returned');
      }

      if (rental.depositStatus !== 'held') {
        throw new ApiError(400, `Deposit is already in '${rental.depositStatus}' status`);
      }

      const totalDeduction = deductions.reduce((sum, d) => sum + d.amount, 0);
      if (totalDeduction > rental.securityDeposit) {
        throw new ApiError(400, 'Total deductions cannot exceed the security deposit amount');
      }

      const refundAmount = rental.securityDeposit - totalDeduction;

      // Update rental status
      rental.depositStatus = refundAmount > 0 ? 'refunded' : 'forfeited';

      const noteParts = [
        `Deposit inspection completed by ${adminId}.`,
        `Deposit: ₹${rental.securityDeposit}, Deductions: ₹${totalDeduction}, Refund: ₹${refundAmount}.`,
      ];
      if (deductions.length > 0) {
        noteParts.push(
          'Deduction Details: ' + deductions.map((d) => `${d.reason} (₹${d.amount})`).join(', '),
        );
      }

      rental.statusHistory.push({
        status: rental.status,
        note: noteParts.join(' '),
        performedBy: adminId,
      } as any);

      await rental.save({ session });

      if (refundAmount > 0) {
        if (rental.razorpayPaymentId) {
          logger.info(
            `[RENTAL DEPOSIT] Initiating refund of ₹${refundAmount} for rental ${rental._id}`,
          );
          await PaymentRefundService.initiateAsyncRefund(
            {
              amount: refundAmount,
              currency: 'INR',
              originalTransactionId: rental.razorpayPaymentId,
              entityType: 'Rental',
              entityId: rental._id,
              isPartial: true,
              reason: 'Security Deposit Refund (Post-Inspection)',
            },
            session,
          );
        } else {
          logger.warn(
            `[RENTAL DEPOSIT] Cannot initiate online refund for rental ${rental._id} — no Razorpay Payment ID found`,
          );
          // Note: offline refunds require manual intervention
        }
      }

      await OutboxEvent.create(
        [
          {
            aggregateId: rental._id.toString(),
            aggregateType: 'RentalOrder',
            eventType: refundAmount > 0 ? 'RentalDepositRefunded' : 'RentalDepositForfeited',
            payload: {
              orderId: rental._id.toString(),
              userId: rental.user.toString(),
              depositAmount: rental.securityDeposit,
              refundAmount,
              deductions,
              adminId,
            },
          },
        ],
        { session },
      );

      await session.commitTransaction();
      return {
        success: true,
        depositAmount: rental.securityDeposit,
        totalDeduction,
        refundAmount,
        depositStatus: rental.depositStatus,
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}
