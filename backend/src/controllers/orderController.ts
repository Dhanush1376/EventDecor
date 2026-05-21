import crypto from 'crypto';
import { Request, Response } from 'express';
import logger from '../config/logger';
import OrderService from '../services/orderService';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';
import Order from '../models/Order';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { getAdminEmails } from '../config/adminConfig';

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await OrderService.createOrder(req.user!.id, req.body);
  res.status(201).json(new ApiResponse(true, 'Order created and payment initiated', result));
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const order = await OrderService.verifyPayment(req.body, req.user!.id, req.user!.role);
  res.status(200).json(new ApiResponse(true, 'Payment verified successfully', order));
});

export const validateTotals = asyncHandler(async (req: Request, res: Response) => {
  const result = await OrderService.validateTotals(req.user!.id, req.body);
  res.status(200).json(new ApiResponse(true, 'Checkout calculations validated securely', result));
});

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.id).select('+publicTrackingToken');
  if (!order) throw new ApiError(404, 'Order not found');

  if (order.user.toString() !== req.user!.id && !['admin', 'manager', 'coordinator'].includes(req.user!.role)) {
    throw new ApiError(403, 'You are not authorized to view this order');
  }

  res.status(200).json(new ApiResponse(true, 'Order fetched successfully', order));
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await OrderService.getMyOrders(req.user!.id);
  res.status(200).json(new ApiResponse(true, 'Your orders fetched', orders));
});

export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const result = await OrderService.getAllOrders(req.query);
  res.status(200).json(new ApiResponse(true, 'All orders fetched', result));
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note, courierCharges } = req.body;
  const order = await OrderService.updateOrderStatus(req.params.id as string, status, note, courierCharges);
  res.status(200).json(new ApiResponse(true, 'Order status updated', order));
});

export const getOrderPublicTrack = asyncHandler(async (req: Request, res: Response) => {
  const trackingToken = String(req.query.token || '').trim();
  if (!trackingToken || trackingToken.length < 16) {
    throw new ApiError(401, 'Valid tracking token is required');
  }

  const order = await Order.findById(req.params.id).select('+publicTrackingToken');
  if (!order) throw new ApiError(404, 'Order not found');

  const storedToken = order.publicTrackingToken || '';
  const provided = Buffer.from(trackingToken);
  const expected = Buffer.from(storedToken);
  const tokenValid =
    storedToken.length > 0 &&
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected);

  if (!tokenValid) {
    throw new ApiError(403, 'Invalid tracking credentials for this order');
  }

  // Safe basic fields for public tracking scans
  const trackingData = {
    _id: order._id,
    orderId: order._id,
    createdAt: order.createdAt,
    orderStatus: order.orderStatus,
    statusHistory: order.statusHistory,
    trackingNumber: order.trackingNumber,
    courierPartner: order.courierPartner,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: order.total,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    items: order.items.map(item => ({
      title: item.title,
      price: item.price,
      quantity: item.quantity,
      variant: item.variant,
      imageSrc: item.imageSrc,
      category: item.category,
    })),
    shippingAddress: {
      name: order.shippingAddress.name,
      pincode: order.shippingAddress.pincode,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      // Mask phone: show only last 4 digits
      phone: order.shippingAddress.phone
        ? order.shippingAddress.phone.replace(/./g, (c, i, str) => i < str.length - 4 ? '*' : c)
        : '',
    }
  };

  res.status(200).json(new ApiResponse(true, 'Order public tracking fetched', trackingData));
});

export const updateOrderPublicStatus = asyncHandler(async (req: Request, res: Response) => {
  // Dynamically extract and decode optional authorization header
  let authUser: any = undefined;
  let authToken: string | undefined = undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    authToken = req.headers.authorization.split(' ')[1];
  }
  if (authToken) {
    try {
      const jwt = require('jsonwebtoken');
      const User = require('../models/User').default || require('../models/User');
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const decoded = jwt.verify(authToken, secret) as any;
        const userObj = await User.findById(decoded.id).select('role email isVerified');
        if (userObj && userObj.isVerified) {
          decoded.role = userObj.role;
          decoded.email = userObj.email;
          authUser = decoded;
        }
      }
    } catch (err) {
      // Ignored: auth is optional for tracking scans
    }
  }

  const { status, note, logisticsToken } = req.body;
  const trackingToken = String(req.query.token || req.body.token || '').trim();

  const orderDoc = await Order.findById(req.params.id).select('+publicTrackingToken');
  if (!orderDoc) throw new ApiError(404, 'Order not found');

  let isAuthorized = false;
  let isLogisticsToken = false;

  // 1. Check if the user is an authenticated privileged staff
  if ((req.user && ['admin', 'manager', 'coordinator'].includes(req.user.role)) || 
      (authUser && ['admin', 'manager', 'coordinator'].includes(authUser.role))) {
    isAuthorized = true;
  }
  // 2. Validate using the public tracking token
  else if (trackingToken) {
    const storedToken = orderDoc.publicTrackingToken || '';
    const provided = Buffer.from(trackingToken, 'hex');
    const expected = Buffer.from(storedToken, 'hex');
    isAuthorized =
      storedToken.length > 0 &&
      provided.length === expected.length &&
      crypto.timingSafeEqual(provided, expected);
  }
  // 3. Validate using the HMAC-signed logistics token
  else if (logisticsToken) {
    const orderId = req.params.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const secret = process.env.JWT_SECRET || '';
    const expectedToken = crypto.createHmac('sha256', secret)
      .update(`${orderId}:${today}`)
      .digest('hex');
    const provided = Buffer.from(logisticsToken, 'hex');
    const expected = Buffer.from(expectedToken, 'hex');
    isAuthorized = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
    if (isAuthorized) {
      isLogisticsToken = true;
    }
  }

  if (!isAuthorized) {
    throw new ApiError(403, 'Unauthorized. Invalid tracking credentials or logistics token.');
  }

  // Customers/Unauthenticated clients with publicTrackingToken are only allowed to self-cancel or return
  const allowedPublicStatuses = ['Cancelled', 'Returned'];
  const isPrivileged = (req.user && ['admin', 'manager', 'coordinator'].includes(req.user.role)) || 
                       (authUser && ['admin', 'manager', 'coordinator'].includes(authUser.role)) || 
                       isLogisticsToken;

  if (!isPrivileged && !allowedPublicStatuses.includes(status)) {
    throw new ApiError(400, `Logistics tracking only permits self-cancellation or returns. Target status '${status}' is disallowed.`);
  }

  const order = await OrderService.updateOrderStatus(req.params.id as string, status, note);
  res.status(200).json(new ApiResponse(true, 'Order status updated via public logistics endpoint', order));
});

export const handleRazorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    logger.warn('⚠️ Webhook verification aborted: Missing signature or secret.');
    throw new ApiError(400, 'Webhook verification credentials missing');
  }

  // 1. Verify Razorpay webhook signature using HMAC SHA256 on the RAW body
  // IMPORTANT: We use (req as any).rawBody which is the unparsed Buffer, set by the
  // raw body middleware in app.ts. Using JSON.stringify(req.body) would corrupt the
  // payload since it may have been re-serialized with different whitespace/key ordering.
  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    logger.error('🏥 [SECURITY CRITICAL] Webhook received without raw body — middleware misconfiguration!');
    throw new ApiError(500, 'Webhook processing error');
  }

  const shasum = crypto.createHmac('sha256', webhookSecret);
  shasum.update(rawBody);
  const digest = shasum.digest('hex');

  // Timing-safe comparison to prevent timing attacks on the webhook signature
  const sigBuffer = Buffer.from(signature, 'utf8');
  const digestBuffer = Buffer.from(digest, 'utf8');
  const isValid = sigBuffer.length === digestBuffer.length && crypto.timingSafeEqual(sigBuffer, digestBuffer);

  if (!isValid) {
    logger.error('🏥 [SECURITY CRITICAL] Invalid Razorpay webhook signature detected!');
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const event = req.body.event;
  logger.info(`[PAYMENT WEBHOOK] Received verified Razorpay event: ${event}`);

  // We are interested in payment.captured or order.paid events
  if (event === 'order.paid' || event === 'payment.captured') {
    const paymentEntity = req.body.payload?.payment?.entity;
    const razorpay_order_id = paymentEntity?.order_id;
    const razorpay_payment_id = paymentEntity?.id;

    if (!razorpay_order_id || !razorpay_payment_id) {
      logger.warn('[PAYMENT WEBHOOK] Webhook skipped: Missing order/payment details.');
      return res.status(200).json(new ApiResponse(true, 'Skipped: missing entity details'));
    }

    try {
      // 2. Lock the order atomically
      let order: any = await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, paymentStatus: { $in: ['pending', 'failed', 'processing'] } } as any,
        { $set: { paymentStatus: 'processing' } },
        { new: true }
      );

      if (!order) {
        const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (existingOrder && existingOrder.paymentStatus === 'paid') {
          logger.info(`[PAYMENT WEBHOOK REDUNDANCY] Webhook event received but payment already paid for order: ${existingOrder._id}`);
          return res.status(200).json(new ApiResponse(true, 'Webhook redundancy check: already paid'));
        }
        return res.status(200).json(new ApiResponse(true, 'Skipped: Order not found or closed'));
      }

      // Update order to paid
      order.paymentStatus = 'paid';
      order.orderStatus = 'Confirmed';
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = signature;
      order.statusHistory.push({
        status: 'Confirmed' as any,
        timestamp: new Date(),
        note: `Payment captured successfully via Razorpay Webhook [Event: ${event}]`
      });

      await order.save();

      // Clear the user's cart in database
      const User = require('../models/User').default || require('../models/User');
      await User.findByIdAndUpdate(order.user, { $set: { cart: [] } });

      // Coupon increments
      if (order.couponCode) {
        const Coupon = require('../models/Coupon').default || require('../models/Coupon');
        await Coupon.findOneAndUpdate({ code: order.couponCode.toUpperCase() }, { $inc: { usedCount: 1 } });
      }

      // Clear analytics caches
      const { default: AnalyticsService } = require('../services/analyticsService');
      AnalyticsService.clearCache();

      // Dispatch confirmation email
      try {
        const user = await User.findById(order.user);
        if (user) {
          const { sendDirectEmail } = require('../services/notificationService');
          const frontendUrl = process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:5173';
          
          // Generate Invoice PDF
          const invoiceBuffer = await generateInvoicePDF({
            orderId: order._id.toString().slice(-8).toUpperCase(),
            date: order.createdAt,
            customerName: user.name,
            shippingAddress: order.shippingAddress?.addressString || '',
            items: order.items.map((i: any) => ({ name: i.title || 'Decor Item', quantity: i.quantity, price: i.price })),
            subtotal: order.subtotal,
            shipping: order.shippingFee,
            total: order.total
          });

          await sendDirectEmail({
            email: user.email,
            subject: `Order Successfully Placed! ✦ Siri Arts & Crafts [${order._id}]`,
            templateName: 'Order Confirmation',
            templateData: {
              name: user.name,
              orderId: order._id.toString().slice(-8).toUpperCase(),
              totalAmount: order.total.toLocaleString('en-IN'),
              paymentStatus: order.paymentStatus.toUpperCase(),
              shippingAddress: order.shippingAddress,
              frontend_url: frontendUrl,
            },
            attachments: [{
              filename: `Invoice_${order._id.toString().slice(-8).toUpperCase()}.pdf`,
              content: invoiceBuffer,
              contentType: 'application/pdf'
            }],
            type: 'order',
            action: 'order_placed',
            userId: user._id.toString(),
          });
          
          // Notify Admins
          const adminEmails = getAdminEmails();
          for (const adminEmail of adminEmails) {
            await sendDirectEmail({
              email: adminEmail,
              subject: `New Order Received! ✦ [${order._id}]`,
              templateName: 'Admin System Alert',
              templateData: {
                title: 'New Order Placed',
                message: `Order #${order._id.toString().slice(-8).toUpperCase()} for ₹${order.total.toLocaleString('en-IN')} has been placed by ${user.name}.`,
                actionUrl: `${frontendUrl}/admin/orders/${order._id}`
              },
              attachments: [{
                filename: `Invoice_${order._id.toString().slice(-8).toUpperCase()}.pdf`,
                content: invoiceBuffer,
                contentType: 'application/pdf'
              }],
              type: 'system',
              action: 'admin_order_notification'
            });
          }
        }
      } catch (emailErr) {
        logger.error('[PAYMENT WEBHOOK EMAIL] Failed to dispatch webhook email:', emailErr);
      }

      logger.info(`[PAYMENT WEBHOOK SUCCESS] Webhook completed cleanly for order: ${order._id}`);
      return res.status(200).json(new ApiResponse(true, 'Payment successfully captured via Webhook'));

    } catch (dbErr) {
      logger.error('[PAYMENT WEBHOOK ERROR] Error executing database updates inside webhook:', dbErr);
      throw dbErr;
    }
  }

  // Handle failed payment events: payment.failed
  if (event === 'payment.failed') {
    const paymentEntity = req.body.payload?.payment?.entity;
    const razorpay_order_id = paymentEntity?.order_id;
    const errorDescription = paymentEntity?.error_description || 'Unknown transaction error';

    if (razorpay_order_id) {
      const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
      if (order && order.paymentStatus === 'pending') {
        // Return reserved stock
        const Product = require('../models/Product').default || require('../models/Product');
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity }
          });
        }

        order.paymentStatus = 'failed';
        order.statusHistory.push({
          status: 'Pending' as any,
          timestamp: new Date(),
          note: `Razorpay Transaction Failed: ${errorDescription}. Reserved stock returned.`
        });
        await order.save();
        logger.warn(`[PAYMENT WEBHOOK FAILURE] Registered payment failure event for order: ${order._id}`);
      }
    }
  }

  return res.status(200).json(new ApiResponse(true, 'Webhook event received but no action required'));
});

export const sendCodOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Email address is required');
  }

  logger.info(`[ORDER COD] Generating OTP for COD verification: ${email}`);
  const { default: AuthService } = require('../services/authService');
  await AuthService.generateCodOTP(email, req.ip);
  
  res.status(200).json(new ApiResponse(true, 'Verification code sent to your email successfully'));
});

export const verifyCodOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required');
  }

  logger.info(`[ORDER COD] Verifying OTP for COD: ${email}`);
  const { default: AuthService } = require('../services/authService');
  await AuthService.verifyCodOTP(email, otp);

  res.status(200).json(new ApiResponse(true, 'Email verified successfully'));
});

export const updateOrderNotes = asyncHandler(async (req: Request, res: Response) => {
  const { notes } = req.body;
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { $set: { notes: notes || '' } },
    { new: true }
  );
  if (!order) throw new ApiError(404, 'Order not found');
  res.status(200).json(new ApiResponse(true, 'Order notes updated', order));
});

