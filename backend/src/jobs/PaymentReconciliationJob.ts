import logger from '../config/logger';
import PaymentAttempt from '../models/PaymentAttempt';
import { RazorpayGateway } from '../utils/payment/RazorpayGateway';
import { PaymentVerificationService } from '../services/PaymentVerificationService';
import { withCronLock } from '../utils/cronLock';

/**
 * PaymentReconciliationJob
 *
 * Scans for PaymentAttempts that have been stuck in 'initiated' or 'processing'
 * for an extended period. If the user successfully paid but the webhook was dropped
 * (e.g. firewall issue) and their browser crashed before redirecting, this job
 * queries Razorpay directly and recovers the payment.
 */
export const runPaymentReconciliation = async () => {
  await withCronLock('payment-reconciliation', 10, async () => {
    logger.info('[PAYMENT RECONCILIATION] Starting reconciliation job...');

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Find attempts that are stuck in 'initiated' or 'processing'
    // Limit to the last 48 hours to avoid scanning ancient dead records
    const stuckAttempts = await PaymentAttempt.find({
      status: { $in: ['initiated', 'processing'] },
      createdAt: { $gte: twoDaysAgo, $lte: thirtyMinutesAgo },
    }).limit(100);

    if (stuckAttempts.length === 0) {
      logger.info('[PAYMENT RECONCILIATION] No stuck payment attempts found.');
      return;
    }

    logger.info(
      `[PAYMENT RECONCILIATION] Found ${stuckAttempts.length} stuck attempts. Recovering...`,
    );

    for (const attempt of stuckAttempts) {
      try {
        // Query Razorpay to see if this order was actually paid
        const paymentResponse = await RazorpayGateway.getOrderPayments(attempt.razorpayOrderId);

        if (!paymentResponse || !paymentResponse.items || paymentResponse.items.length === 0) {
          // User never even attempted payment, just abandoned checkout. Let it expire naturally.
          continue;
        }

        // Check if there is any successfully captured payment
        const capturedPayment = paymentResponse.items.find((p: any) => p.status === 'captured');

        if (capturedPayment) {
          logger.info(
            `[PAYMENT RECONCILIATION] Recovering lost payment ${capturedPayment.id} for order ${attempt.razorpayOrderId}`,
          );

          const paymentData = {
            razorpay_order_id: attempt.razorpayOrderId,
            razorpay_payment_id: capturedPayment.id,
            razorpay_signature: 'reconciliation_bypass',
          };

          // Invoke the standard verification pipeline directly (bypassing the HTTP/Webhook layer)
          // The 'webhook' source flag tells the service to skip HMAC signature validation
          // since we fetched this data securely server-to-server directly from Razorpay.
          await PaymentVerificationService.verifyPayment(paymentData, 'system', 'admin', 'webhook');

          logger.info(
            `[PAYMENT RECONCILIATION] Successfully recovered order ${attempt.razorpayOrderId}`,
          );
        } else {
          // Payments were attempted but all failed.
          const failedPayment = paymentResponse.items.find((p: any) => p.status === 'failed');
          if (failedPayment) {
            attempt.status = 'failed';
            await attempt.save();
            logger.info(`[PAYMENT RECONCILIATION] Marked attempt ${attempt._id} as failed.`);
          }
        }
      } catch (err: any) {
        // If it throws 409 or already verified, it's safe and idempotent.
        if (err.statusCode === 409) {
          logger.info(
            `[PAYMENT RECONCILIATION] Attempt ${attempt._id} is currently being processed by another worker.`,
          );
        } else {
          logger.error(`[PAYMENT RECONCILIATION] Failed to reconcile attempt ${attempt._id}:`, err);
        }
      }
    }

    logger.info('[PAYMENT RECONCILIATION] Reconciliation job completed.');
  });
};
