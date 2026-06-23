import mongoose from 'mongoose';
import Order from '../models/Order';
import EventBooking from '../models/EventBooking';
import RentalOrder from '../models/RentalOrder';
import { RazorpayGateway } from '../utils/payment/RazorpayGateway';
import logger from '../config/logger';
import { createAdminNotification, sendDirectEmail } from '../services/notificationService';
import { getAdminEmails } from '../config/adminConfig';
import { PaymentRefundService } from '../services/PaymentRefundService';

export const runPaymentReconciliation = async () => {
  logger.info('[RECONCILIATION] Starting automated payment reconciliation...');

  const yesterday = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const now = Math.floor(Date.now() / 1000);

  try {
    let skip = 0;
    const count = 100;
    let hasMore = true;

    const mismatches: string[] = [];
    const healed: string[] = [];

    while (hasMore) {
      const payments: any = await RazorpayGateway.getAllPayments({
        from: yesterday,
        to: now,
        count,
        skip,
      });

      if (!payments.items || payments.items.length === 0) {
        hasMore = false;
        break;
      }

      for (const rp of payments.items) {
        if (rp.status === 'captured' || rp.status === 'authorized') {
          const orderId = rp.order_id;

          let dbEntity: any = null;
          let entityType: 'Order' | 'EventBooking' | 'Rental' | null = null;

          if (orderId) {
            dbEntity = await Order.findOne({ razorpayOrderId: orderId }).lean();
            if (dbEntity) entityType = 'Order';
          }

          if (!dbEntity) {
            dbEntity = await EventBooking.findOne({ 'payments.transactionId': rp.id }).lean();
            if (dbEntity) entityType = 'EventBooking';
          }

          if (!dbEntity) {
            dbEntity = await RentalOrder.findOne({ razorpayPaymentId: rp.id }).lean();
            if (dbEntity) entityType = 'Rental';
          }

          if (!dbEntity) {
            // GHOST PAYMENT: Auto Refund
            mismatches.push(
              `Ghost Payment: Razorpay Payment ${rp.id} (Order ${orderId || 'None'}). Auto-refunding.`,
            );
            try {
              await PaymentRefundService.initiateAsyncRefund({
                amount: Number(rp.amount) / 100, // convert paise to INR
                currency: rp.currency,
                originalTransactionId: rp.id,
                entityType: 'Order',
                entityId: new mongoose.Types.ObjectId(), // Dummy ID for ghost payment tracking
              });
              healed.push(`Auto-refunded Ghost Payment ${rp.id} (₹${Number(rp.amount) / 100})`);
            } catch (err: any) {
              mismatches.push(`Failed to auto-refund Ghost Payment ${rp.id}: ${err.message}`);
            }
            continue;
          }

          // Check Status Mismatches
          if (entityType === 'Order') {
            if (dbEntity.paymentStatus !== 'paid' && dbEntity.paymentStatus !== 'refunded') {
              mismatches.push(
                `Status Mismatch: Order ${dbEntity._id} is '${dbEntity.paymentStatus}' in DB, but '${rp.status}' in Razorpay.`,
              );
              try {
                // Attempt auto-salvage by refunding the orphaned payment
                await PaymentRefundService.initiateAsyncRefund({
                  amount: Number(rp.amount) / 100,
                  currency: rp.currency,
                  originalTransactionId: rp.id,
                  entityType: 'Order',
                  entityId: dbEntity._id,
                });
                healed.push(
                  `Auto-refunded Orphaned Order ${dbEntity._id} (₹${Number(rp.amount) / 100})`,
                );
              } catch (err: any) {
                mismatches.push(
                  `Failed to auto-refund Orphaned Order ${dbEntity._id}: ${err.message}`,
                );
              }
            }
          } else if (entityType === 'EventBooking') {
            // EventBooking status mismatch handling
            const payment = dbEntity.payments.find((p: any) => p.transactionId === rp.id);
            if (!payment || payment.status !== 'success') {
              mismatches.push(
                `Status Mismatch: EventBooking ${dbEntity._id} payment is '${payment?.status || 'Missing'}' in DB, but '${rp.status}' in Razorpay.`,
              );
              try {
                await PaymentRefundService.initiateAsyncRefund({
                  amount: Number(rp.amount) / 100,
                  currency: rp.currency,
                  originalTransactionId: rp.id,
                  entityType: 'EventBooking',
                  entityId: dbEntity._id,
                });
                healed.push(
                  `Auto-refunded failed EventBooking payment ${rp.id} for ${dbEntity._id}`,
                );
              } catch (err: any) {
                mismatches.push(
                  `Failed to auto-refund failed EventBooking payment ${rp.id}: ${err.message}`,
                );
              }
            }
          } else if (entityType === 'Rental') {
            if (dbEntity.paymentStatus !== 'paid' && dbEntity.paymentStatus !== 'refunded') {
              mismatches.push(
                `Status Mismatch: Rental ${dbEntity._id} is '${dbEntity.paymentStatus}' in DB, but '${rp.status}' in Razorpay.`,
              );
              try {
                await PaymentRefundService.initiateAsyncRefund({
                  amount: Number(rp.amount) / 100,
                  currency: rp.currency,
                  originalTransactionId: rp.id,
                  entityType: 'Rental',
                  entityId: dbEntity._id,
                });
                healed.push(`Auto-refunded failed Rental payment ${rp.id} for ${dbEntity._id}`);
              } catch (err: any) {
                mismatches.push(
                  `Failed to auto-refund failed Rental payment ${rp.id}: ${err.message}`,
                );
              }
            }
          }
        }
      }

      skip += count;
    }

    // --- Refund Reconciliation ---
    skip = 0;
    hasMore = true;
    while (hasMore) {
      const refunds: any = await RazorpayGateway.getAllRefunds({
        from: yesterday,
        to: now,
        count,
        skip,
      });

      if (!refunds.items || refunds.items.length === 0) {
        hasMore = false;
        break;
      }

      for (const rzpRefund of refunds.items) {
        const refundRecordId = rzpRefund.notes?.refundRecordId;
        let dbRefund: any = null;

        if (refundRecordId) {
          const RefundRecord = require('../models/RefundRecord').default;
          dbRefund = await RefundRecord.findById(refundRecordId).lean();
        } else {
          const RefundRecord = require('../models/RefundRecord').default;
          dbRefund = await RefundRecord.findOne({ razorpayRefundId: rzpRefund.id }).lean();
        }

        if (!dbRefund) {
          mismatches.push(
            `Ghost Refund: Razorpay Refund ${rzpRefund.id} (Payment ${rzpRefund.payment_id}) has no corresponding internal RefundRecord.`,
          );
          // Healing a ghost refund implies we might need to update the Order/Booking status if it's not already refunded.
          // For now, just logging it as it's hard to safely auto-heal without knowing the internal entity.
        } else {
          // Status mismatch
          if (rzpRefund.status === 'processed' && dbRefund.status !== 'completed') {
            mismatches.push(
              `Refund Status Mismatch: RZP is processed but DB is ${dbRefund.status} for RefundRecord ${dbRefund._id}.`,
            );
            try {
              const RefundRecord = require('../models/RefundRecord').default;
              await RefundRecord.updateOne(
                { _id: dbRefund._id },
                { $set: { status: 'completed', razorpayRefundId: rzpRefund.id } },
              );
              healed.push(`Auto-healed RefundRecord ${dbRefund._id} to completed.`);
            } catch (err: any) {
              mismatches.push(`Failed to auto-heal RefundRecord ${dbRefund._id}: ${err.message}`);
            }
          }
        }
      }
      skip += count;
    }

    if (mismatches.length > 0 || healed.length > 0) {
      logger.error(
        `[RECONCILIATION] Found ${mismatches.length} discrepancies, Healed ${healed.length}.`,
      );
      const adminEmails = getAdminEmails();

      await createAdminNotification({
        title: 'Payment Reconciliation Auto-Heal Report',
        message: `Found ${mismatches.length} mismatches. Successfully healed ${healed.length}. Check email for details.`,
        type: 'system',
      });

      if (adminEmails.length > 0) {
        await sendDirectEmail({
          email: adminEmails[0],
          subject: 'Payment Reconciliation Auto-Heal Report',
          customHtml: `<p>The daily reconciliation job executed.</p>
                       <h3>Mismatches Found:</h3><ul>${mismatches.map((m) => `<li>${m}</li>`).join('') || '<li>None</li>'}</ul>
                       <h3>Auto-Healed Actions:</h3><ul>${healed.map((h) => `<li>${h}</li>`).join('') || '<li>None</li>'}</ul>`,
          type: 'system',
          action: 'admin_reconciliation_alert',
        });
      }
    } else {
      logger.info('[RECONCILIATION] Success: No discrepancies found. All payments match exactly.');
    }
  } catch (err: any) {
    logger.error('[RECONCILIATION] Job failed to execute:', err);
  }
};
