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

export class PaymentService {
  static verifyWebhookSignature(signature: string, rawBody: Buffer, webhookSecret: string): boolean {
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(rawBody);
    const digest = shasum.digest('hex');
    const sigBuffer = Buffer.from(signature, 'utf8');
    const digestBuffer = Buffer.from(digest, 'utf8');
    return sigBuffer.length === digestBuffer.length && crypto.timingSafeEqual(sigBuffer, digestBuffer);
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

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      throw new ApiError(500, 'Payment verification is not configured on the server');
    }
    const shasum = crypto.createHmac('sha256', razorpayKeySecret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    const session = await mongoose.startSession();
    session.startTransaction();
    let order: any;

    try {
      order = await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, paymentStatus: { $in: ['pending', 'failed', 'processing'] } } as any,
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

      if (digest !== razorpay_signature) {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity }
          }, { session });
        }

        order.paymentStatus = 'failed';
        order.statusHistory.push({ status: 'Pending', note: 'Payment verification failed (Signature Mismatch) - Stock Released' });
        await order.save({ session });
        await session.commitTransaction();
        session.endSession();
        throw new ApiError(400, 'Invalid payment signature. Payment untrusted.');
      }

      order.paymentStatus = 'paid';
      order.orderStatus = 'Confirmed';
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      order.statusHistory.push({ status: 'Confirmed', note: 'Payment verified and order confirmed' });
      
      await order.save({ session });

      await User.findByIdAndUpdate(order.user, { $set: { cart: [] } }, { session });

      if (order.couponCode) {
        await Coupon.findOneAndUpdate(
          { code: order.couponCode.toUpperCase() }, 
          { 
            $inc: { usedCount: 1 },
            $push: { usedBy: { userId: order.user, orderId: order._id } }
          },
          { session }
        );
      }

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

      let order: any = await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, paymentStatus: { $in: ['pending', 'failed', 'processing'] } } as any,
        { $set: { paymentStatus: 'processing' } },
        { new: true }
      );

      if (!order) {
        const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (existingOrder?.paymentStatus === 'paid') return { status: 200, message: 'Already paid' };
        return { status: 200, message: 'Skipped: Order not found or closed' };
      }

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
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

        if (order.couponCode) {
          await Coupon.findOneAndUpdate(
            { code: order.couponCode.toUpperCase() },
            { 
              $inc: { usedCount: 1 },
              $push: { usedBy: { userId: order.user, orderId: order._id } }
            },
            { session }
          );
        }

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
            order.paymentStatus = 'failed';
            order.statusHistory.push({
              status: 'Pending' as any,
              timestamp: new Date(),
              note: `Razorpay Transaction Failed. Reserved stock returned.`,
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
