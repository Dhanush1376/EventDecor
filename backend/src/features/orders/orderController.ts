import crypto from 'crypto';
import { Request, Response } from 'express';
import logger from '../../config/logger';
import OrderService from './orderService';
import { LogisticsService } from '../../services/logisticsService';
import { PaymentService } from '../../services/paymentService';
import AuthService from '../../services/authService';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import Order from '../../models/Order';
import { STAFF_ROLES } from '../../config/adminConfig';

import redisClient from '../../utils/redis';

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) {
    throw new ApiError(400, 'Idempotency-Key header is required for order creation');
  }

  const userId = req.user!.id;
  const cacheKey = `idempotency:order:${userId}:${idempotencyKey}`;

  if (redisClient) {
    const lockAcquired = await redisClient.set(cacheKey, JSON.stringify({ status: 'processing' }), { NX: true, EX: 60 });
    
    if (!lockAcquired) {
       const existing = await redisClient.get(cacheKey);
       if (existing) {
         const parsed = JSON.parse(existing);
         if (parsed.status === 'processing') {
            throw new ApiError(409, 'Order is currently being processed. Please wait.');
         }
         if (parsed && typeof parsed.success === 'boolean') {
           return res.status(200).json(parsed);
         }
         return res.status(200).json(new ApiResponse(true, 'Order created and payment initiated', parsed));
       }
    }
  }

  try {
    const orderData = { ...req.body, idempotencyKey };
    const result = await OrderService.createOrder(userId, orderData);

    if (redisClient) {
      await redisClient.set(cacheKey, JSON.stringify(new ApiResponse(true, 'Order created and payment initiated', result)), { EX: 86400 }); // 24 hours
    }

    res.status(201).json(new ApiResponse(true, 'Order created and payment initiated', result));
  } catch (error) {
    if (redisClient) {
      await redisClient.del(cacheKey);
    }
    throw error;
  }
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const order = await PaymentService.verifyPayment(req.body, req.user!.id, req.user!.role);
  res.status(200).json(new ApiResponse(true, 'Payment verified successfully', order));
});

export const validateTotals = asyncHandler(async (req: Request, res: Response) => {
  const result = await OrderService.validateTotals(req.user!.id, req.body);
  res.status(200).json(new ApiResponse(true, 'Checkout calculations validated securely', result));
});

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  if (order.user.toString() !== req.user!.id && !(STAFF_ROLES as readonly string[]).includes(req.user!.role)) {
    throw new ApiError(403, 'You are not authorized to view this order');
  }

  res.status(200).json(new ApiResponse(true, 'Order fetched successfully', order));
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const paginatedOrders = await OrderService.getMyOrders(req.user!.id, req.query);
  res.status(200).json(new ApiResponse(true, 'Your orders retrieved successfully', paginatedOrders));
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
  if (!trackingToken) {
    throw new ApiError(401, 'Valid tracking token is required');
  }

  const order = await LogisticsService.verifyTrackingTokenAndGetOrder(trackingToken);
  const trackingData = LogisticsService.formatPublicTrackingData(order);

  res.status(200).json(new ApiResponse(true, 'Order public tracking fetched', trackingData));
});

export const updateOrderPublicStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note } = req.body;

  // Customers/Unauthenticated clients with publicTrackingToken are only allowed to self-cancel or return
  const allowedPublicStatuses = ['Cancelled', 'Returned'];
  const isPrivileged = req.user && (STAFF_ROLES as readonly string[]).includes(req.user.role) || (req as any).isLogisticsToken;

  if (!isPrivileged && !allowedPublicStatuses.includes(status)) {
    throw new ApiError(400, `Logistics tracking only permits self-cancellation or returns. Target status '${status}' is disallowed.`);
  }

  const order = await OrderService.updateOrderStatus(req.params.id as string, status, note);
  res.status(200).json(new ApiResponse(true, 'Order status updated via public logistics endpoint', order));
});

export const handleRazorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    logger.error('FATAL: RAZORPAY_WEBHOOK_SECRET is not set. Webhook verification disabled.');
    throw new ApiError(503, 'Payment webhook verification is not configured');
  }

  if (!signature) {
    logger.warn('⚠️ Webhook verification aborted: Missing x-razorpay-signature header.');
    throw new ApiError(400, 'Webhook signature missing');
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    logger.error('🏥 [SECURITY CRITICAL] [WEBHOOK_ERROR] Webhook received without raw body — middleware misconfiguration!');
    throw new ApiError(500, 'Webhook processing error');
  }

  if (!PaymentService.verifyWebhookSignature(signature, rawBody, webhookSecret)) {
    logger.error('🏥 [SECURITY CRITICAL] [WEBHOOK_ERROR] Invalid Razorpay webhook signature detected!', { ip: req.ip });
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const result = await PaymentService.processRazorpayWebhook(req.body.event, req.body, signature);
  return res.status(result.status).json(new ApiResponse(true, result.message));
});

export const sendCodOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Email address is required');
  }

  logger.info(`[ORDER COD] Generating OTP for COD verification: ${email}`);
  await AuthService.generateCodOTP(email, req.ip);
  
  res.status(200).json(new ApiResponse(true, 'Verification code sent to your email successfully'));
});

export const verifyCodOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required');
  }

  logger.info(`[ORDER COD] Verifying OTP for COD: ${email}`);
  await AuthService.verifyCodOTP(email, otp);

  res.status(200).json(new ApiResponse(true, 'Email verified successfully'));
});

export const updateOrderNotes = asyncHandler(async (req: Request, res: Response) => {
  const { notes } = req.body;

  // Authorization: only the order owner or admin staff may update notes
  const existingOrder = await Order.findById(req.params.id);
  if (!existingOrder) throw new ApiError(404, 'Order not found');
  if (existingOrder.user.toString() !== req.user!.id && !['admin', 'super_admin', 'main_admin', 'moderator', 'order_manager'].includes(req.user!.role)) {
    throw new ApiError(403, 'You are not authorized to update notes for this order');
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { $set: { notes: notes || '' } },
    { new: true }
  );
  if (!order) throw new ApiError(404, 'Order not found');
  res.status(200).json(new ApiResponse(true, 'Order notes updated', order));
});

