import mongoose from 'mongoose';
import Order from '../../models/Order';
import ApiError from '../../utils/ApiError';
// Sub-module for Razorpay Initialization and Verification

export class OrderPaymentService {
  static async verifyPayment(data: any) {
    // Migrated from legacy OrderService
    throw new Error('Not implemented. See legacy OrderService until fully migrated.');
  }

  static async refundOrder(orderId: string, data: any) {
    // Migrated from legacy OrderService
    throw new Error('Not implemented. See legacy OrderService until fully migrated.');
  }
}
