import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import { PaymentRefundService } from '../../services/PaymentRefundService';
import ApiError from '../../utils/ApiError';
import { z } from 'zod';
import { validateRequest } from '../../middleware/zodValidationMiddleware';
import logger from '../../config/logger';

const adminRefundSchema = z.object({
  body: z.object({
    amount: z.number().positive('Refund amount must be a positive number'),
    reason: z.string().min(5, 'Please provide a valid reason for the refund'),
    isPartial: z.boolean().optional().default(false),
  }),
});

// Admin Manual Refund
export const issueManualRefund = [
  validateRequest(adminRefundSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const entityType = String(req.params.entityType);
    const entityId = String(req.params.entityId);
    const { amount, reason, isPartial } = req.body;

    if (!['Order', 'RentalOrder', 'EventJob'].includes(entityType)) {
      throw new ApiError(400, 'Invalid entity type. Must be Order, RentalOrder, or EventJob.');
    }

    // In a real scenario, we need to verify the originalTransactionId.
    // We fetch it from the entity.
    let originalTransactionId = '';

    if (entityType === 'Order') {
      const Order = require('../../models/Order').default;
      const order = await Order.findById(entityId).select('razorpayPaymentId').lean();
      if (!order) throw new ApiError(404, 'Order not found');
      if (!order.razorpayPaymentId)
        throw new ApiError(400, 'Order does not have a captured Razorpay payment');
      originalTransactionId = order.razorpayPaymentId;
    } else if (entityType === 'RentalOrder') {
      const RentalOrder = require('../../models/RentalOrder').default;
      const rental = await RentalOrder.findById(entityId).select('razorpayPaymentId').lean();
      if (!rental) throw new ApiError(404, 'Rental Order not found');
      if (!rental.razorpayPaymentId)
        throw new ApiError(400, 'Rental Order does not have a captured Razorpay payment');
      originalTransactionId = rental.razorpayPaymentId;
    } else if (entityType === 'EventJob') {
      const EventJob = require('../../domains/event_operations/models/EventJob').default;
      const booking = await EventJob.findById(entityId).select('razorpayPaymentId').lean();
      if (!booking) throw new ApiError(404, 'Event Booking not found');
      if (!booking.razorpayPaymentId)
        throw new ApiError(400, 'Event Booking does not have a captured Razorpay payment');
      originalTransactionId = booking.razorpayPaymentId;
    }

    await PaymentRefundService.initiateAsyncRefund({
      amount,
      currency: 'INR',
      originalTransactionId,
      entityType: entityType as any,
      entityId,
      isPartial,
      reason: `Admin Manual Refund: ${reason}`,
    });

    logger.info(
      `[ADMIN REFUND] Admin ${req.user?.id} initiated refund for ${entityType} ${entityId}`,
    );

    const { AdminAuditService } = require('../../services/AdminAuditService');
    await AdminAuditService.logAction({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      entityType: entityType as any,
      entityId,
      action: 'manual_refund_initiated',
      newValue: { amount, reason, isPartial },
    });

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully and queued for processing.',
    });
  }),
];

// Customer Refund Status
export const getRefundStatus = asyncHandler(async (req: Request, res: Response) => {
  const entityType = String(req.params.entityType);
  const entityId = String(req.params.entityId);

  if (!['Order', 'RentalOrder', 'EventJob'].includes(entityType)) {
    throw new ApiError(400, 'Invalid entity type');
  }

  // Authorization check
  let isAuthorized = false;
  if (['super_admin', 'main_admin', 'admin'].includes(req.user?.role as any)) {
    isAuthorized = true;
  } else {
    if (entityType === 'Order') {
      const Order = require('../../models/Order').default;
      const order = await Order.findById(entityId).select('user').lean();
      if (order && String(order.user) === String(req.user?.id)) isAuthorized = true;
    } else if (entityType === 'RentalOrder') {
      const RentalOrder = require('../../models/RentalOrder').default;
      const rental = await RentalOrder.findById(entityId).select('user').lean();
      if (rental && String(rental.user) === String(req.user?.id)) isAuthorized = true;
    } else if (entityType === 'EventJob') {
      const EventJob = require('../../domains/event_operations/models/EventJob').default;
      const booking = await EventJob.findById(entityId).select('user').lean();
      if (booking && String(booking.user) === String(req.user?.id)) isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    throw new ApiError(403, 'Unauthorized access to refund status');
  }

  const refundStatus = await PaymentRefundService.getRefundStatusForEntity(entityType, entityId);

  res.status(200).json({
    success: true,
    data: refundStatus,
  });
});
