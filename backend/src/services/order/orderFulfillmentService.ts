import mongoose from 'mongoose';
import Order from '../../models/Order';
import ApiError from '../../utils/ApiError';
import { emailQueue, notificationQueue } from '../../jobs/queues';

// Sub-module for Logistics, Tracking, and Fulfillment Status

export class OrderFulfillmentService {
  static async updateOrderStatus(orderId: string, status: string, trackingData?: any) {
    // Migrated from legacy OrderService
    throw new Error('Not implemented. See legacy OrderService until fully migrated.');
  }

  static async markDelivered(orderId: string) {
    // Migrated from legacy OrderService
    throw new Error('Not implemented. See legacy OrderService until fully migrated.');
  }
}
