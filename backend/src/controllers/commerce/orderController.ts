import { Request, Response } from 'express';
import logger from '../../config/logger';
import { OrderQueryService } from '../../services/orders/OrderQueryService';
import { OrderCheckoutService } from '../../services/orders/OrderCheckoutService';
import { OrderFulfillmentService } from '../../services/orders/OrderFulfillmentService';
import { OrderValidationService } from '../../services/orderValidation';
import { LogisticsService } from '../../services/logisticsService';
import { PaymentService, PaymentWebhookService } from '../../services/paymentService';
import OtpAuthService from '../../services/OtpAuthService';
import asyncHandler from '../../utils/asyncHandler';
import ApiError from '../../utils/ApiError';
import ApiResponse from '../../utils/ApiResponse';
import Order from '../../models/Order';
import { STAFF_ROLES } from '../../config/adminConfig';
import { AdminAuditService } from '../../services/AdminAuditService';

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) {
    throw new ApiError(400, 'Idempotency-Key header is required for order creation');
  }

  const userId = req.user!.id;
  const orderData = { ...req.body, idempotencyKey };

  const result = await OrderCheckoutService.createOrder(userId, orderData);

  res.status(201).json(new ApiResponse(true, 'Order created and payment initiated', result));
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const order = await PaymentService.verifyPayment(req.body, req.user!.id, req.user!.role);
  res.status(200).json(new ApiResponse(true, 'Payment verified successfully', order));
});

export const validateTotals = asyncHandler(async (req: Request, res: Response) => {
  const result = await OrderValidationService.validateTotals(req.user!.id, req.body);
  res.status(200).json(new ApiResponse(true, 'Checkout calculations validated securely', result));
});

export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.id).populate('items.productId');
  if (!order) throw new ApiError(404, 'Order not found');

  if (
    order.user.toString() !== req.user!.id &&
    !(STAFF_ROLES as readonly string[]).includes(req.user!.role)
  ) {
    throw new ApiError(403, 'You are not authorized to view this order');
  }

  res.status(200).json(new ApiResponse(true, 'Order fetched successfully', order));
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const paginatedOrders = await OrderQueryService.getMyOrders(req.user!.id, req.query);
  res
    .status(200)
    .json(new ApiResponse(true, 'Your orders retrieved successfully', paginatedOrders));
});

export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const result = await OrderQueryService.getAllOrders(req.query);
  res.status(200).json(new ApiResponse(true, 'All orders fetched', result));
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note, courierCharges } = req.body;

  // We need the previous status for the audit log
  const Order = require('../../models/Order').default;
  const existingOrder = await Order.findById(req.params.id);
  const previousStatus = existingOrder ? existingOrder.orderStatus : 'unknown';

  const order = await OrderFulfillmentService.updateOrderStatus(
    req.params.id as string,
    status,
    note,
    courierCharges,
  );

  // If performed by an admin, log it
  if (
    req.user &&
    ['super_admin', 'main_admin', 'admin', 'moderator', 'order_manager'].includes(req.user.role)
  ) {
    const { AdminAuditService } = require('../../services/AdminAuditService');
    await AdminAuditService.logOrderStatusChange(
      req.user.id,
      req.user.email || 'unknown',
      order._id.toString(),
      previousStatus,
      status,
      note,
    );
  }

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
  const isPrivileged =
    (req.user && (STAFF_ROLES as readonly string[]).includes(req.user.role)) ||
    (req as any).isLogisticsToken;

  if (!isPrivileged && !allowedPublicStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Logistics tracking only permits self-cancellation or returns. Target status '${status}' is disallowed.`,
    );
  }

  const order = await OrderFulfillmentService.updateOrderStatus(
    req.params.id as string,
    status,
    note,
  );
  res
    .status(200)
    .json(new ApiResponse(true, 'Order status updated via public logistics endpoint', order));
});

export const handleRazorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    logger.error('FATAL: RAZORPAY_WEBHOOK_SECRET is not set. Webhook verification disabled.');
    throw new ApiError(503, 'Payment webhook verification is not configured');
  }

  if (!signature) {
    logger.warn('Webhook verification aborted: Missing x-razorpay-signature header.');
    throw new ApiError(400, 'Webhook signature missing');
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    logger.error(
      'ðŸ¥ [SECURITY CRITICAL] [WEBHOOK_ERROR] Webhook received without raw body â€” middleware misconfiguration!',
    );
    throw new ApiError(500, 'Webhook processing error');
  }

  if (!PaymentWebhookService.verifyWebhookSignature(signature, rawBody, webhookSecret)) {
    logger.error(
      'ðŸ¥ [SECURITY CRITICAL] [WEBHOOK_ERROR] Invalid Razorpay webhook signature detected!',
      { ip: req.ip },
    );
    throw new ApiError(400, 'Invalid webhook signature');
  }

  const eventId = (req.headers['x-razorpay-event-id'] as string) || `evt_${Date.now()}`;
  const result = await PaymentWebhookService.processRazorpayWebhook(
    req.body.event,
    req.body,
    signature,
    eventId,
  );
  return res.status(result.status).json(new ApiResponse(true, result.message));
});

export const sendCodOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Email address is required');
  }

  logger.info(`[ORDER COD] Generating OTP for COD verification: ${email}`);
  await OtpAuthService.generateCodOTP(email, req.ip);

  res.status(200).json(new ApiResponse(true, 'Verification code sent to your email successfully'));
});

export const verifyCodOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required');
  }

  logger.info(`[ORDER COD] Verifying OTP for COD: ${email}`);
  await OtpAuthService.verifyCodOTP(email, otp);

  res.status(200).json(new ApiResponse(true, 'Email verified successfully'));
});

export const updateOrderNotes = asyncHandler(async (req: Request, res: Response) => {
  const { notes } = req.body;

  // Authorization: only the order owner or admin staff may update notes
  const existingOrder = await Order.findById(req.params.id);
  if (!existingOrder) throw new ApiError(404, 'Order not found');
  if (
    existingOrder.user.toString() !== req.user!.id &&
    !['admin', 'super_admin', 'main_admin', 'moderator', 'order_manager'].includes(req.user!.role)
  ) {
    throw new ApiError(403, 'You are not authorized to update notes for this order');
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { $set: { notes: notes || '' } },
    { returnDocument: 'after' },
  );
  if (!order) throw new ApiError(404, 'Order not found');

  if (req.user!.role !== 'user') {
    await AdminAuditService.logAction({
      actorId: req.user!.id,
      actorEmail: req.user!.email || 'unknown',
      actorRole: req.user!.role,
      method: req.method,
      path: req.originalUrl,
      entityType: 'Order',
      entityId: order.id,
      action: 'update_notes',
      previousValue: { notes: existingOrder.notes },
      newValue: { notes: order.notes },
    });
  }

  res.status(200).json(new ApiResponse(true, 'Order notes updated', order));
});
