import mongoose from 'mongoose';
import ReturnRequest, { IReturnRequest } from '../../models/ReturnRequest';
import Order from '../../models/Order';
import Product from '../../models/Product';
import ApiError from '../../utils/ApiError';
import { ReturnNotificationService } from './ReturnNotificationService';
import { PaymentRefundService } from '../PaymentRefundService';
import { ReturnEventEmitter } from './ReturnEventEmitter';
import logger from '../../config/logger';

const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ['approved', 'rejected', 'cancelled'],
  approved: ['pickup_assigned', 'cancelled'],
  pickup_assigned: ['pickup_accepted', 'rejected'],
  pickup_accepted: ['picked_up'],
  picked_up: ['reached_warehouse'],
  reached_warehouse: ['inspection_started'],
  inspection_started: ['inspection_passed', 'rejected'],
  inspection_passed: ['refund_triggered'],
  refund_triggered: ['completed'],
};

export interface OrderReturnState {
  orderId: string;
  orderStatus: string;
  deliveredDate: Date | null;
  canInitiateReturn: boolean;
  canInitiateExchange: boolean;
  reasonIfBlocked: string | null;
  items: Array<{
    productId: string;
    title: string;
    imageSrc: string;
    isEligibleForReturn: boolean;
    isEligibleForExchange: boolean;
    returnBadge: string;
    exchangeBadge: string;
    reason: string | null;
    daysRemaining: number;
    activeReturnId: string | null;
    activeReturnStatus: string | null;
    activeExchangeId: string | null;
    activeExchangeStatus: string | null;
    isLocked: boolean;
  }>;
}

export class ReturnStateMachine {
  /**
   * Transition the return request to a new status.
   * Validates transition and executes side effects.
   */
  static async transition(
    returnId: string,
    nextStatus: string,
    performedBy: string,
    metadata?: any,
    session?: mongoose.ClientSession,
  ): Promise<IReturnRequest> {
    const request = await ReturnRequest.findById(returnId).session(session || null);
    if (!request) {
      throw new ApiError(404, 'Return request not found');
    }

    const currentStatus = request.status;

    if (!this.validateTransition(currentStatus, nextStatus)) {
      throw new ApiError(400, `Invalid transition from ${currentStatus} to ${nextStatus}`);
    }

    // Update status
    request.status = nextStatus as any;

    // Add timeline entry
    const admin = performedBy !== request.userId.toString() ? performedBy : undefined;
    request.timeline.push({
      action: `Status updated to ${nextStatus}`,
      description: metadata?.reason || `Transitioned to ${nextStatus.replace('_', ' ')}`,
      performedBy: admin ? new mongoose.Types.ObjectId(admin) : undefined,
      metadata,
      timestamp: new Date(),
    });

    if (metadata?.reason && nextStatus === 'rejected') {
      request.approvalNotes = metadata.reason;
    }

    // Save state
    await request.save({ session });

    // Execute side effects synchronously within transaction
    await this.executeSyncSideEffects(request, currentStatus, nextStatus, session);

    // Async side effects (Emails, Notifications)
    setImmediate(() => {
      this.executeAsyncSideEffects(request, currentStatus, nextStatus).catch((err) => {
        logger.error(`Failed to execute async side effects for Return ${request.returnId}:`, err);
      });
    });

    // Emit socket and outbox events
    await ReturnEventEmitter.emitStatusUpdate(request, currentStatus, nextStatus, session);

    return request;
  }

  static validateTransition(currentStatus: string, nextStatus: string): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(nextStatus) : false;
  }

  /**
   * Synchronous side effects that must happen within the same transaction.
   */
  private static async executeSyncSideEffects(
    request: IReturnRequest,
    prevStatus: string,
    nextStatus: string,
    session?: mongoose.ClientSession,
  ) {
    // 1. Order status updates & Inventory
    if (nextStatus === 'completed') {
      await Order.findByIdAndUpdate(request.orderId, { orderStatus: 'Refunded' }, { session });

      // Release inventory for items that were restocked or quality passed
      for (const item of request.items) {
        if (['quality_passed', 'restocked'].includes(item.warehouseStatus)) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: item.returnQuantity } },
            { session },
          );
        }
      }
    } else if (nextStatus === 'rejected' || nextStatus === 'cancelled') {
      await Order.findByIdAndUpdate(request.orderId, { orderStatus: 'Delivered' }, { session });
    } else if (nextStatus === 'submitted') {
      await Order.findByIdAndUpdate(request.orderId, { orderStatus: 'Returned' }, { session });
    }

    // 2. Refund Triggering
    if (nextStatus === 'refund_triggered' && request.refundBreakdown?.grandTotal) {
      await PaymentRefundService.initiateAsyncRefund(
        {
          amount: request.refundBreakdown.grandTotal,
          originalTransactionId: request.orderId.toString(),
          entityType: 'Order',
          entityId: request.orderId,
          isPartial: true,
          reason: `Refund for Return ${request.returnId}`,
        },
        session,
      );
    }
  }

  /**
   * Asynchronous side effects like notifications and emails.
   */
  private static async executeAsyncSideEffects(
    request: IReturnRequest,
    prevStatus: string,
    nextStatus: string,
  ) {
    if (nextStatus === 'submitted') {
      await ReturnNotificationService.notifyAdminNewReturn(request);
    } else if (nextStatus === 'approved') {
      await ReturnNotificationService.notifyCustomerReturnApproved(request);
    } else if (nextStatus === 'rejected') {
      await ReturnNotificationService.notifyCustomerReturnRejected(request);
    } else if (nextStatus === 'pickup_assigned') {
      await ReturnNotificationService.notifyCustomerPickupScheduled(request);
    } else if (nextStatus === 'refund_triggered') {
      await ReturnNotificationService.notifyCustomerRefundInitiated(request);
    } else if (nextStatus === 'completed') {
      await ReturnNotificationService.notifyCustomerRefundCompleted(request);
    }
  }

  /**
   * Compute centralized eligibility state for an order.
   */
  static async getOrderReturnState(orderId: string, userId: string): Promise<OrderReturnState> {
    const order = await Order.findOne({ _id: orderId, user: userId }).lean();
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const isDelivered = order.orderStatus === 'Delivered';
    const deliveredDate =
      order.statusHistory?.find((h) => h.status === 'Delivered')?.timestamp || new Date();

    const activeRequests = await ReturnRequest.find({
      orderId,
      userId,
      status: { $nin: ['cancelled', 'rejected', 'completed'] },
    }).lean();

    const productIds = order.items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('isNonRefundable')
      .lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p.isNonRefundable]));

    const defaultReturnWindow = 7;

    const itemsState = await Promise.all(
      order.items.map(async (item) => {
        const activeReturn = activeRequests.find(
          (r) =>
            r.returnType === 'return' &&
            r.items.some((i) => i.productId.toString() === item.productId.toString()),
        );
        const activeExchange = activeRequests.find(
          (r) =>
            r.returnType === 'exchange' &&
            r.items.some((i) => i.productId.toString() === item.productId.toString()),
        );

        const msPerDay = 1000 * 60 * 60 * 24;
        const daysSinceDelivered = Math.floor(
          (Date.now() - new Date(deliveredDate).getTime()) / msPerDay,
        );
        const daysRemaining = Math.max(0, defaultReturnWindow - daysSinceDelivered);

        const isWindowExpired = daysRemaining === 0 && daysSinceDelivered > defaultReturnWindow;
        const isLocked = !!(activeReturn || activeExchange);

        let returnBadge = 'Eligible';
        let exchangeBadge = 'Eligible';
        let isEligibleForReturn = true;
        let isEligibleForExchange = true;
        let reason = null;

        if (!isDelivered) {
          isEligibleForReturn = false;
          isEligibleForExchange = false;
          returnBadge = 'Delivery Pending';
          exchangeBadge = 'Delivery Pending';
          reason = 'Returns available after delivery';
        } else if (item.isNonRefundable || productMap.get(item.productId.toString()) === true) {
          isEligibleForReturn = false;
          isEligibleForExchange = false;
          returnBadge = 'Non Returnable';
          exchangeBadge = 'Non Exchangeable';
          reason = 'Product is non-returnable';
        } else if (isWindowExpired) {
          isEligibleForReturn = false;
          isEligibleForExchange = false;
          returnBadge = 'Window Expired';
          exchangeBadge = 'Window Expired';
          reason = 'Return window expired';
        } else if (isLocked) {
          isEligibleForReturn = false;
          isEligibleForExchange = false;
          returnBadge = activeReturn ? 'Return Active' : 'Exchange Active';
          exchangeBadge = activeExchange ? 'Exchange Active' : 'Return Active';
          reason = 'Item has an active request';
        } else {
          returnBadge = `${daysRemaining} Days Left`;
          exchangeBadge = `${daysRemaining} Days Left`;
        }

        return {
          productId: item.productId.toString(),
          title: item.title,
          imageSrc: item.imageSrc,
          isEligibleForReturn,
          isEligibleForExchange,
          returnBadge,
          exchangeBadge,
          reason,
          daysRemaining,
          activeReturnId: activeReturn?._id.toString() || null,
          activeReturnStatus: activeReturn?.status || null,
          activeExchangeId: activeExchange?._id.toString() || null,
          activeExchangeStatus: activeExchange?.status || null,
          isLocked,
        };
      }),
    );

    const canInitiateReturn = itemsState.some((i) => i.isEligibleForReturn);
    const canInitiateExchange = itemsState.some((i) => i.isEligibleForExchange);
    let globalReason = null;

    if (!isDelivered) {
      globalReason = 'Returns/Exchanges are only available for delivered orders.';
    }

    return {
      orderId: order._id.toString(),
      orderStatus: order.orderStatus,
      deliveredDate,
      canInitiateReturn,
      canInitiateExchange,
      reasonIfBlocked: globalReason,
      items: itemsState,
    };
  }

  /**
   * Create a new Return or Exchange Request.
   * Handles idempotency and duplicate checking.
   */
  static async createRequest(
    params: {
      userId: string;
      orderId: string;
      returnType: 'return' | 'exchange';
      items: any[];
      refundMethod?: 'original' | 'wallet' | 'store_credit';
      pickupAddress?: any;
      upiId?: string;
    },
    idempotencyKey?: string,
    session?: mongoose.ClientSession,
  ): Promise<IReturnRequest> {
    if (idempotencyKey) {
      const existing = await ReturnRequest.findOne({ idempotencyKey }).session(session || null);
      if (existing) return existing;
    }

    const { userId, orderId, returnType, items, refundMethod, pickupAddress, upiId } = params;

    // Delegate eligibility check to the centralized state
    const orderState = await this.getOrderReturnState(orderId, userId);

    if (orderState.orderStatus !== 'Delivered') {
      throw new ApiError(400, 'Returns/Exchanges are only available for delivered orders.');
    }

    const requestItems = [];
    for (const reqItem of items) {
      const itemState = orderState.items.find((i) => i.productId === reqItem.productId);
      if (!itemState) {
        throw new ApiError(400, `Product ${reqItem.productId} not found in order`);
      }

      if (returnType === 'return' && !itemState.isEligibleForReturn) {
        throw new ApiError(
          400,
          `Product ${itemState.title} is not eligible: ${itemState.reason || itemState.returnBadge}`,
        );
      }

      if (returnType === 'exchange' && !itemState.isEligibleForExchange) {
        throw new ApiError(
          400,
          `Product ${itemState.title} is not eligible: ${itemState.reason || itemState.exchangeBadge}`,
        );
      }

      // Check for active duplicate request directly in DB as a safeguard
      const existingActive = await ReturnRequest.findOne({
        orderId,
        'items.productId': reqItem.productId,
        status: { $nin: ['cancelled', 'rejected', 'completed'] },
      }).session(session || null);

      if (existingActive) {
        throw new ApiError(
          400,
          `An active return/exchange already exists for product ${itemState.title}`,
        );
      }

      // Re-fetch original order details for prices
      const order = await Order.findById(orderId).session(session || null);
      const orderItem = order?.items.find((i) => i.productId.toString() === reqItem.productId);

      if (!orderItem || reqItem.returnQuantity > orderItem.quantity) {
        throw new ApiError(400, `Invalid return quantity for product ${itemState.title}`);
      }

      requestItems.push({
        productId: orderItem.productId,
        title: orderItem.title,
        imageSrc: orderItem.imageSrc,
        variant: orderItem.variant,
        orderedQuantity: orderItem.quantity,
        returnQuantity: reqItem.returnQuantity,
        unitPrice: orderItem.price,
        reason: reqItem.reason,
        description: reqItem.description,
        evidenceImages: reqItem.evidenceImages || [],
        evidenceVideos: reqItem.evidenceVideos || [],
        warehouseStatus: 'pending',
        refundAmount: 0, // Will be calculated
      });
    }

    const Counter = mongoose.model('Counter');
    const counter = await Counter.findOneAndUpdate(
      { _id: returnType === 'return' ? 'returnId' : 'exchangeId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session },
    );
    const prefix = returnType === 'return' ? 'RET-' : 'EXC-';
    const requestId = `${prefix}${counter.seq.toString().padStart(5, '0')}`;

    const newRequest = new ReturnRequest({
      returnId: requestId,
      orderId,
      userId,
      returnType,
      items: requestItems,
      refundMethod,
      pickup: pickupAddress ? { address: pickupAddress, status: 'pending' } : undefined,
      upiId,
      idempotencyKey,
      status: 'submitted',
      sla: {
        currentStage: 'submitted',
        stageEnteredAt: new Date(),
        isOverdue: false,
        escalated: false,
      },
      timeline: [
        {
          action: 'Request Submitted',
          description: `Customer submitted ${returnType} request`,
          timestamp: new Date(),
        },
      ],
    });

    await newRequest.save({ session });

    // Execute side effects for 'submitted'
    await this.executeSyncSideEffects(newRequest, '', 'submitted', session);

    setImmediate(() => {
      this.executeAsyncSideEffects(newRequest, '', 'submitted').catch((err) => {
        logger.error(
          `Failed to execute async side effects for Return ${newRequest.returnId}:`,
          err,
        );
      });
    });

    // Emit creation events
    await ReturnEventEmitter.emitReturnCreated(newRequest, session);
    await ReturnEventEmitter.emitStatusUpdate(newRequest, '', 'submitted', session);

    return newRequest;
  }
}
