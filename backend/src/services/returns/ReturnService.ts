import mongoose from 'mongoose';
import { IReturnRequest } from '../../models/ReturnRequest';
import Order from '../../models/Order';
import ApiError from '../../utils/ApiError';
import { ReturnStateMachine, OrderReturnState } from './ReturnStateMachine';

export class ReturnService {
  /**
   * Calculate exact refund breakdown for a return request.
   * This is done entirely server-side.
   */
  static calculateRefund(request: IReturnRequest, order: any) {
    let productTotal = 0;

    // Sum up the eligible refund amount for each item
    request.items.forEach((item) => {
      const itemRefund = item.unitPrice * item.returnQuantity;
      item.refundAmount = itemRefund;
      productTotal += itemRefund;
    });

    // Calculate proportion of this return against the total order subtotal
    const returnRatio = order.subtotal > 0 ? productTotal / order.subtotal : 0;

    const taxRefund = 0;
    const shippingRefund = 0;

    // Prorate discounts and wallet usage to prevent over-refunding
    const discountDeduction = (order.discount || 0) * returnRatio;
    const walletUsedDeduction = (order.walletDeduction || 0) * returnRatio;
    const restockingFee = 0;

    const grandTotal =
      productTotal +
      taxRefund +
      shippingRefund -
      discountDeduction -
      walletUsedDeduction -
      restockingFee;

    request.refundBreakdown = {
      productTotal,
      taxRefund,
      shippingRefund,
      discountDeduction,
      couponDeduction: 0,
      walletUsedDeduction,
      storeCreditDeduction: 0,
      restockingFee,
      partialRefundAmount: 0,
      grandTotal: Math.max(0, grandTotal),
    };

    return request;
  }

  /**
   * Create a new return request for multiple items.
   * Delegates to ReturnStateMachine for validation and execution.
   */
  static async createReturnRequest(
    userId: string,
    orderId: string,
    items: Array<{
      productId: string;
      returnQuantity: number;
      reason: string;
      description?: string;
      evidenceImages?: string[];
      evidenceVideos?: string[];
    }>,
    refundMethod: 'original' | 'wallet' | 'store_credit',
    pickupAddress?: any,
    upiId?: string,
    idempotencyKey?: string,
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const returnRequest = await ReturnStateMachine.createRequest(
        {
          userId,
          orderId,
          returnType: 'return',
          items,
          refundMethod,
          pickupAddress,
          upiId,
        },
        idempotencyKey,
        session,
      );

      const order = await Order.findById(orderId).session(session);
      if (!order) throw new ApiError(404, 'Order not found');

      // Calculate refund breakdown
      this.calculateRefund(returnRequest, order);

      // Determine approval level
      returnRequest.fraudScore = 0;
      const grandTotal = returnRequest.refundBreakdown?.grandTotal || 0;
      if (grandTotal > 25000) {
        returnRequest.approvalLevel = 'senior_admin';
      } else if (grandTotal > 5000) {
        returnRequest.approvalLevel = 'manager';
      } else {
        returnRequest.approvalLevel = 'auto';
      }

      await returnRequest.save({ session });

      await session.commitTransaction();
      return returnRequest;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get return eligibility for an order's items.
   * Delegates to ReturnStateMachine.
   */
  static async getReturnEligibility(orderId: string, userId: string): Promise<OrderReturnState> {
    return await ReturnStateMachine.getOrderReturnState(orderId, userId);
  }

  /**
   * Admin approves a return request.
   * Delegates to ReturnStateMachine.
   */
  static async approveReturn(returnId: string, adminId: string) {
    return await ReturnStateMachine.transition(returnId, 'approved', adminId);
  }
}
