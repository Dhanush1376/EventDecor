import mongoose from 'mongoose';
import ApprovalRequest from '../models/ApprovalRequest';
import Order from '../../../models/Order';
import RentalOrder from '../../../models/RentalOrder';

export class ManualOverrideService {
  /**
   * Admin approves a flagged order/entity
   */
  static async approve(requestId: string, adminId: string, notes?: string) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const request = await ApprovalRequest.findById(requestId).session(session);
      if (!request) throw new Error('Approval request not found');
      if (request.status !== 'pending') throw new Error('Request is already resolved');

      request.status = 'approved';
      request.resolvedBy = new mongoose.Types.ObjectId(adminId);
      request.resolvedAt = new Date();
      request.resolutionNotes = notes;

      await request.save({ session });

      // Resume fulfillment logic
      if (request.entityType === 'Order') {
        await Order.findByIdAndUpdate(request.entityId, { orderStatus: 'Confirmed' }, { session });
        // Trigger dispatch queue, etc.
      } else if (request.entityType === 'RentalOrder') {
        await RentalOrder.findByIdAndUpdate(request.entityId, { status: 'confirmed' }, { session });
      }

      await session.commitTransaction();
      return request;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Admin rejects a flagged order/entity
   */
  static async reject(requestId: string, adminId: string, notes?: string) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const request = await ApprovalRequest.findById(requestId).session(session);
      if (!request) throw new Error('Approval request not found');

      request.status = 'rejected';
      request.resolvedBy = new mongoose.Types.ObjectId(adminId);
      request.resolvedAt = new Date();
      request.resolutionNotes = notes;

      await request.save({ session });

      // Cancel the order
      if (request.entityType === 'Order') {
        await Order.findByIdAndUpdate(request.entityId, { orderStatus: 'Cancelled' }, { session });
      } else if (request.entityType === 'RentalOrder') {
        await RentalOrder.findByIdAndUpdate(request.entityId, { status: 'cancelled' }, { session });
      }

      await session.commitTransaction();
      return request;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
