import mongoose from 'mongoose';
import ProductionOrder from '../models/ProductionOrder';
import ProductionQueue from '../models/ProductionQueue';
import Product from '../../../models/Product';
import ApiError from '../../../utils/ApiError';
import { ProductionStage } from '../types/production';

const STAGE_ORDER: ProductionStage[] = [
  'pending_material',
  'material_sourced',
  'cutting',
  'assembly',
  'finishing',
  'quality_check',
  'packing',
  'ready_for_warehouse',
  'handover_complete',
];

export class ProductionStateMachine {
  /**
   * Transitions a specific item within a ProductionOrder to the next stage
   */
  static async transitionItem(
    productionOrderId: string,
    sku: string,
    nextStage: ProductionStage,
    actorId: string,
    metadata?: any,
  ) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const prodOrder = await ProductionOrder.findById(productionOrderId).session(session);
      if (!prodOrder) throw new ApiError(404, 'Production Order not found');

      const item = prodOrder.items.find((i: any) => i.sku === sku);
      if (!item) throw new ApiError(404, 'Item SKU not found in Production Order');

      const currentIdx = STAGE_ORDER.indexOf(item.currentStage as ProductionStage);
      const nextIdx = STAGE_ORDER.indexOf(nextStage);

      if (nextIdx === -1) throw new ApiError(400, 'Invalid next stage');
      if (nextIdx < currentIdx) {
        throw new ApiError(
          400,
          `Cannot transition backwards from ${item.currentStage} to ${nextStage}`,
        );
      }

      // Enforce rules
      if (nextStage === 'cutting' && item.currentStage !== 'material_sourced') {
        // Can skip some stages if allowed, but typically materials must be sourced
        if (item.currentStage === 'pending_material') {
          throw new ApiError(400, 'Materials must be sourced before cutting');
        }
      }

      // Update item stage
      item.currentStage = nextStage;

      // Log in stages array
      prodOrder.stages.push({
        stage: nextStage,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        worker: {
          userId: new mongoose.Types.ObjectId(actorId),
          name: metadata?.workerName || 'Worker',
        },
        notes: metadata?.notes,
        photos: metadata?.photos || [],
        qualityScore: metadata?.qualityScore,
      });

      // Update Queue logic based on next stage
      await this.handleQueueTransition(
        prodOrder._id,
        item.currentStage as ProductionStage,
        nextStage,
        session,
      );

      // If Handover is complete, update product inventory and warehouse
      if (nextStage === 'handover_complete') {
        await this.handleInventoryHandover(item.productId, item.quantity, session);

        // Check if all items in order are complete
        const allComplete = prodOrder.items.every(
          (i: any) => i.currentStage === 'handover_complete',
        );
        if (allComplete) {
          prodOrder.status = 'sent_to_warehouse';
          prodOrder.actualCompletionDate = new Date();
        }
      }

      await prodOrder.save({ session });
      await session.commitTransaction();

      return prodOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private static async handleQueueTransition(
    prodOrderId: any,
    currentStage: ProductionStage,
    nextStage: ProductionStage,
    session: mongoose.ClientSession,
  ) {
    // Complete previous queue entry
    const activeQueues = ['cutting', 'assembly', 'finishing', 'quality_check', 'packing'];
    if (activeQueues.includes(currentStage)) {
      await ProductionQueue.findOneAndUpdate(
        { productionOrderId: prodOrderId, station: currentStage, status: { $ne: 'completed' } },
        { status: 'completed', completedAt: new Date() },
        { session },
      );
    }

    // Add to next queue
    if (activeQueues.includes(nextStage as any)) {
      const existing = await ProductionQueue.findOne({
        productionOrderId: prodOrderId,
        station: nextStage,
      }).session(session);
      if (!existing) {
        await ProductionQueue.create(
          [
            {
              station: nextStage,
              productionOrderId: prodOrderId,
              status: 'queued',
              enteredAt: new Date(),
            },
          ],
          { session },
        );
      }
    }
  }

  private static async handleInventoryHandover(
    productId: any,
    quantity: number,
    session: mongoose.ClientSession,
  ) {
    const product = await Product.findById(productId).session(session);
    if (!product) return;

    if (!product.inventory) {
      product.inventory = {
        available: 0,
        reserved: 0,
        production: 0,
        packing: 0,
        transit: 0,
        rental: 0,
        maintenance: 0,
        returned: 0,
        damaged: 0,
        lost: 0,
        qualityHold: 0,
      };
    }

    // Reduce from production, add to available
    product.inventory.production = Math.max(0, product.inventory.production - quantity);
    product.inventory.available += quantity;
    product.stock = product.inventory.available;

    await product.save({ session, validateBeforeSave: false }); // Bypass full validation for performance
  }
}
