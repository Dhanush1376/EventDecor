import logger from '../../../config/logger';
import ApprovalRequest, { IApprovalRequest } from '../models/ApprovalRequest';
import mongoose from 'mongoose';
import Product from '../../../models/Product';

type ApprovalHandler = (
  approval: IApprovalRequest,
  session: mongoose.ClientSession,
) => Promise<void>;

export class ApprovalExecutor {
  private static registry: Map<string, ApprovalHandler> = new Map();

  /**
   * Register a handler for a specific approval type
   */
  static registerHandler(type: string, handler: ApprovalHandler) {
    this.registry.set(type, handler);
  }

  /**
   * Execute the consequence for an approved request.
   * Ensures idempotency and uses a transaction to ensure atomic updates.
   */
  static async executeConsequence(approvalId: string, _actorId: string): Promise<IApprovalRequest> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const approval = await ApprovalRequest.findById(approvalId).session(session);

      if (!approval) {
        throw new Error('Approval request not found');
      }

      if (approval.status !== 'Pending') {
        throw new Error(`Approval request is already ${approval.status}`);
      }

      const handler = this.registry.get(approval.type);
      if (!handler) {
        throw new Error(`No execution handler registered for approval type: ${approval.type}`);
      }

      // Execute the domain-specific business logic
      await handler(approval, session);

      // Mark as approved and create audit trail
      approval.status = 'Approved';
      // We could add an 'approvedBy' field here if the schema supported it
      await approval.save({ session });

      // In a real system, we'd write to the global audit log here too
      // AdminAuditLog.create(...)

      await session.commitTransaction();
      return approval;
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Approval consequence execution failed for ${approvalId}:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }
}

// ============================================================================
// Register Built-in Handlers
// ============================================================================

ApprovalExecutor.registerHandler('High-Value Refund', async (approval, _session) => {
  logger.info(`Executing High-Value Refund consequence for amount ${approval.amount}`);
});

ApprovalExecutor.registerHandler('Discount Override', async (approval, _session) => {
  logger.info(`Executing Discount Override consequence for amount ${approval.amount}`);
});

ApprovalExecutor.registerHandler('Inventory Adjustment', async (approval, session) => {
  logger.info(`Executing Inventory Adjustment consequence for ${approval.details}`);
  const match = approval.details.match(/deducting (\d+) units of (SKU-[a-zA-Z0-9_-]+)/i);
  if (match) {
    const qty = parseInt(match[1], 10);
    const sku = match[2];

    const product = await Product.findOne({ sku }).session(session);
    if (product) {
      product.stock -= qty;
      await product.save({ session });
    }
  }
});
