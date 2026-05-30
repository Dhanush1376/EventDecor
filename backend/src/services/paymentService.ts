import crypto from 'crypto';
import mongoose from 'mongoose';
import Order from '../models/Order';
import User from '../models/User';
import Coupon from '../models/Coupon';
import Product from '../models/Product';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { sendDirectEmail, createAdminNotification } from './notificationService';
import AnalyticsService from './analyticsService';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { compileTemplate } from '../utils/templateEngine';
import { getAdminEmails } from '../config/adminConfig';
import { bumpAdminAnalyticsCacheVersion } from '../utils/cacheVersion';
import getRazorpay from '../config/razorpay';
import PaymentAudit from '../models/PaymentAudit';
import WalletTransaction from '../models/WalletTransaction';
import { creditWalletBalance } from '../utils/walletMutations';

export class PaymentService {
  static verifyWebhookSignature(signature: string, rawBody: Buffer, webhookSecret: string): boolean {
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(rawBody);
    const digest = shasum.digest('hex');
    const expected = Buffer.from(digest, 'utf8');
    const received = Buffer.from(signature || '', 'utf8');
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  static async verifyPayment(paymentData: any, userId: string, role: string) {
    const razorpay_order_id = paymentData.razorpay_order_id || paymentData.razorpayOrderId;
    const razorpay_payment_id = paymentData.razorpay_payment_id || paymentData.razorpayPaymentId;
    const razorpay_signature = paymentData.razorpay_signature || paymentData.razorpaySignature;

    if (!razorpay_order_id || !razorpay_payment_id) {
      throw new ApiError(400, 'Missing payment verification parameters');
    }

    if (!razorpay_signature) {
      throw new ApiError(400, 'Missing payment signature verification parameter');
    }

    const razorpay = getRazorpay();
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret || !razorpay) {
      throw new ApiError(500, 'Payment verification is not configured on the server');
    }
    const shasum = crypto.createHmac('sha256', razorpayKeySecret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');
    const expectedHash = Buffer.from(digest, 'utf8');
    const signatureHash = Buffer.from(razorpay_signature || '', 'utf8');
    const isSignatureValid =
      expectedHash.length === signatureHash.length &&
      crypto.timingSafeEqual(expectedHash, signatureHash);

    const session = await mongoose.startSession();
    session.startTransaction();
    let order: any;

    try {
      order = await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, paymentStatus: { $in: ['pending', 'failed'] } } as any,
        { $set: { paymentStatus: 'processing' } },
        { new: true, session }
      );

      if (!order) {
        const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (existingOrder && existingOrder.paymentStatus === 'paid') {
          logger.info(`[PAYMENT REDUNDANCY] Payment already processed successfully for order: ${existingOrder._id}`);
          await session.abortTransaction();
          session.endSession();
          return existingOrder;
        }
        throw new ApiError(404, 'Order record not found or cannot be locked for processing');
      }

      if (order.user.toString() !== userId && role !== 'admin') {
        order.paymentStatus = 'pending';
        await order.save({ session });
        throw new ApiError(403, 'You are not authorized to verify this payment');
      }

      // Fetch payment from Razorpay API
      let fetchedPayment;
      try {
        fetchedPayment = await razorpay.payments.fetch(razorpay_payment_id);
      } catch (err: any) {
        logger.error(`Failed to fetch payment ${razorpay_payment_id} from Razorpay:`, err);
        throw new ApiError(502, 'Failed to connect to payment gateway for verification');
      }

      const expectedAmount = Math.round(order.total * 100);
      const isAmountValid = fetchedPayment.amount === expectedAmount;
      const isCurrencyValid = fetchedPayment.currency === 'INR';
      const isOrderValid = fetchedPayment.order_id === razorpay_order_id;
      const isStatusValid = fetchedPayment.status === 'captured' || fetchedPayment.status === 'authorized';

      const isValid = isSignatureValid && isAmountValid && isCurrencyValid && isOrderValid && isStatusValid;

      // Log the verification attempt
      await PaymentAudit.create([{
        orderId: order._id,
        userId: userId,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        eventType: 'verification_attempt',
        status: isValid ? 'success' : (!isSignatureValid ? 'failed' : 'tampered'),
        amountExpected: expectedAmount,
        amountReceived: Number(fetchedPayment.amount),
        currencyReceived: String(fetchedPayment.currency),
        signatureValid: isSignatureValid,
        notes: `Signature: ${isSignatureValid}, Amount Match: ${isAmountValid}, Status: ${fetchedPayment.status}, Order Match: ${isOrderValid}`,
        rawPayload: JSON.stringify(fetchedPayment)
      }], { session });

      if (!isValid) {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity }
          }, { session });
        }

        if (order.walletDeduction && order.walletDeduction > 0) {
          await creditWalletBalance(order.user, order.walletDeduction, session);
          await WalletTransaction.create([{
            userId: order.user,
            type: 'credit',
            amount: order.walletDeduction,
            source: 'refund',
            description: 'Refund for failed Razorpay payment verification',
            status: 'active'
          }], { session });
        }

        if (order.couponCode) {
          await Coupon.findOneAndUpdate(
            { code: order.couponCode.toUpperCase() }, 
            { 
              $inc: { usedCount: -1 },
              $pull: { usedBy: { orderId: order._id } }
            },
            { session }
          );
        }

        order.paymentStatus = 'failed';
        order.statusHistory.push({ status: 'Pending', note: 'Payment verification failed (Tampering/Mismatch) - Stock & Coupon Released' });
        await order.save({ session });
        await session.commitTransaction();
        session.endSession();
        throw new ApiError(400, 'Invalid payment details. Payment untrusted.');
      }

      order.paymentStatus = 'paid';
      order.orderStatus = 'Confirmed';
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      order.statusHistory.push({ status: 'Confirmed', note: 'Payment verified and order confirmed' });

      await order.save({ session });

      await User.findByIdAndUpdate(order.user, { $set: { cart: [] } }, { session });

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

    AnalyticsService.clearCache();

    try {
      const user = await User.findById(order.user);
      const adminEmails = getAdminEmails();

      await createAdminNotification({
        title: 'New Online Payment Order',
        message: `${user?.name || 'A customer'} placed a new order (₹${order.total}) via Razorpay.`,
        type: 'order',
        actionLink: `/admin/orders/${order._id}`,
      });

      const pdfBuffer = await generateInvoicePDF({
        orderId: order._id.toString(),
        date: order.createdAt || new Date(),
        customerName: user?.name || 'Customer',
        shippingAddress: typeof order.shippingAddress === 'string' ? order.shippingAddress : order.shippingAddress?.address || '',
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shippingFee,
        total: order.total
      });

      if (user) {
        const frontendUrl = process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:5173';

        const htmlContent = compileTemplate('order-confirmation', {
          customerName: user.name,
          orderId: order._id.toString(),
          orderDate: new Date().toISOString(),
          paymentMethod: 'Online Payment (Razorpay)',
          items: order.items.map((i: any) => ({
            name: i.title,
            variant: i.variant,
            quantity: i.quantity,
            price: i.price,
            image: i.imageSrc
          })),
          subtotal: order.subtotal,
          shipping: order.shippingFee,
          total: order.total,
          shippingAddress: typeof order.shippingAddress === 'string' ? order.shippingAddress : order.shippingAddress?.address || '',
          dashboardUrl: `${frontendUrl}/dashboard?tab=orders`,
          currentYear: new Date().getFullYear(),
        });

        await sendDirectEmail({
          email: user.email,
          subject: `Order Successfully Placed! ✦ Siri Arts & Crafts [${order._id}]`,
          customHtml: htmlContent,
          type: 'order',
          action: 'order_placed',
          userId: user._id.toString(),
          attachments: [{
            filename: `Invoice_${order.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        });

        if (adminEmails.length > 0) {
          await sendDirectEmail({
            email: adminEmails[0],
            subject: `New Paid Order Received - ₹${order.total} [${order._id}]`,
            customHtml: htmlContent,
            type: 'system',
            action: 'admin_order_alert',
            attachments: [{
              filename: `Invoice_${order.invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }]
          });
        }
      }
    } catch (emailErr) {
      logger.error('Failed to dispatch order confirmation email/PDF in background:', emailErr);
    }

    logger.info(`Payment successful for order: ${order._id}`);
    return order;
  }

  static async processRazorpayWebhook(event: string, body: any, signature: string) {
    logger.info(`[PAYMENT WEBHOOK] Received verified Razorpay event: ${event}`);

    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentEntity = body.payload?.payment?.entity;
      const razorpay_order_id = paymentEntity?.order_id;
      const razorpay_payment_id = paymentEntity?.id;

      if (razorpay_payment_id) {
        const alreadyPaidByPaymentId = await Order.findOne({
          razorpayPaymentId: razorpay_payment_id,
          paymentStatus: 'paid',
        }).lean();
        if (alreadyPaidByPaymentId) {
          logger.info(`[PAYMENT WEBHOOK IDEMPOTENCY] Payment ${razorpay_payment_id} already processed`);
          return { status: 200, message: 'Webhook idempotency: payment already processed' };
        }
      }

      if (!razorpay_order_id || !razorpay_payment_id) {
        return { status: 200, message: 'Skipped: missing entity details' };
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        let order: any = await Order.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id, paymentStatus: { $in: ['pending', 'failed'] } } as any,
          { $set: { paymentStatus: 'processing' } },
          { new: true, session }
        );

        if (!order) {
          const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id }).session(session);
          if (existingOrder?.paymentStatus === 'paid') {
            await session.abortTransaction();
            return { status: 200, message: 'Already paid' };
          }
          await session.abortTransaction();
          return { status: 200, message: 'Skipped: Order not found or closed' };
        }

        const expectedAmount = Math.round(order.total * 100);
        const isAmountValid = paymentEntity.amount === expectedAmount;
        const isCurrencyValid = paymentEntity.currency === 'INR';

        const isValid = isAmountValid && isCurrencyValid;

        await PaymentAudit.create([{
          orderId: order._id,
          userId: order.user,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          eventType: 'webhook_received',
          status: isValid ? 'success' : 'tampered',
          amountExpected: expectedAmount,
          amountReceived: Number(paymentEntity.amount),
          currencyReceived: String(paymentEntity.currency),
          signatureValid: true, // Controller verified it
          notes: `Amount Match: ${isAmountValid}, Currency Match: ${isCurrencyValid}, Event: ${event}`,
          rawPayload: JSON.stringify(paymentEntity)
        }], { session });

        if (!isValid) {
          if (order.couponCode) {
            await Coupon.findOneAndUpdate(
              { code: order.couponCode.toUpperCase() }, 
              { 
                $inc: { usedCount: -1 },
                $pull: { usedBy: { orderId: order._id } }
              },
              { session }
            );
          }

          order.paymentStatus = 'failed';
          order.statusHistory.push({
            status: 'Pending' as any,
            timestamp: new Date(),
            note: `Payment validation failed via Webhook. Amount or Currency mismatch. Expected ₹${expectedAmount / 100}, Received ₹${paymentEntity.amount / 100} ${paymentEntity.currency} - Coupon Released`,
          });
          await order.save({ session });
          await session.commitTransaction();
          return { status: 200, message: 'Webhook processed but validation failed due to tampering' };
        }

        order.paymentStatus = 'paid';
        order.orderStatus = 'Confirmed';
        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpaySignature = signature;
        order.statusHistory.push({
          status: 'Confirmed' as any,
          timestamp: new Date(),
          note: `Payment captured successfully via Razorpay Webhook [Event: ${event}]`,
        });

        await order.save({ session });
        await User.findByIdAndUpdate(order.user, { $set: { cart: [] } }, { session });

        await session.commitTransaction();
      } catch (dbErr) {
        await session.abortTransaction();
        throw dbErr;
      } finally {
        session.endSession();
      }

      AnalyticsService.clearCache();
      await bumpAdminAnalyticsCacheVersion();

      // Removed email dispatch block for brevity here as it mimics verifyPayment
      return { status: 200, message: 'Payment successfully captured via Webhook' };
    }

    if (event === 'payment.failed') {
      const paymentEntity = body.payload?.payment?.entity;
      const razorpay_order_id = paymentEntity?.order_id;
      if (razorpay_order_id) {
        const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (order && order.paymentStatus === 'pending') {
          const session = await mongoose.startSession();
          session.startTransaction();
          try {
            for (const item of order.items) {
              await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } }, { session });
            }
            if (order.couponCode) {
              await Coupon.findOneAndUpdate(
                { code: order.couponCode.toUpperCase() }, 
                { 
                  $inc: { usedCount: -1 },
                  $pull: { usedBy: { orderId: order._id } }
                },
                { session }
              );
            }

            order.paymentStatus = 'failed';
            order.statusHistory.push({
              status: 'Pending' as any,
              timestamp: new Date(),
              note: `Razorpay Transaction Failed. Reserved stock and coupon returned.`,
            });
            logger.warn('[PAYMENT_FAILED] Webhook reported payment failure for order', {
              orderId: order._id,
              razorpayOrderId: razorpay_order_id,
              userId: order.user
            });
            await order.save({ session });
            await session.commitTransaction();
          } catch (err) {
            await session.abortTransaction();
            throw err;
          } finally {
            session.endSession();
          }
        }
      }
    }

    return { status: 200, message: 'Webhook event received' };
  }
}
