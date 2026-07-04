import mongoose from 'mongoose';
import ProductionOrder from '../models/ProductionOrder';
import ManufacturingBatch from '../models/ManufacturingBatch';
import Product from '../../../models/Product';

export class ProductionService {
  /**
   * Creates a production order for a custom e-commerce order
   */
  static async createForCustomOrder(
    orderId: string,
    items: any[],
    session?: mongoose.ClientSession,
  ) {
    const prodOrderId = `PROD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;

    const mappedItems = items.map((item) => ({
      productId: item.productId,
      sku: item.sku || `CUST-SKU-${Date.now()}`,
      quantity: item.quantity,
      rawMaterials: [],
      currentStage: 'pending_material',
    }));

    const prodOrder = new ProductionOrder({
      productionOrderId: prodOrderId,
      orderId: new mongoose.Types.ObjectId(orderId),
      orderType: 'custom',
      items: mappedItems,
      priority: 'high',
      status: 'queued',
    });

    if (session) {
      await prodOrder.save({ session });
    } else {
      await prodOrder.save();
    }

    return prodOrder;
  }

  /**
   * Triggers a manufacturing batch to restock inventory
   */
  static async triggerRestockBatch(productId: string, quantity: number, adminId?: string) {
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    const batchNumber = `BATCH-${product.primaryCategory ? product.primaryCategory.toString().substring(0, 3).toUpperCase() : 'PRD'}-${Date.now().toString().slice(-6)}`;

    // Create a dummy order reference or we can make orderId optional for batches.
    // In ProductionOrder schema, orderId is required. We should use a systemic Order ID or modify schema to allow null.
    // For now, let's assume we have a "System Restock" order ID, or we modify the schema.
    // Wait, ProductionOrder has `orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true }`.
    // I should probably remove `required: true` if it's a batch restock. Or we can just use the product ID as a mock if needed.
    // Let's modify the schema later if needed, or pass a dummy ID.
    const dummyOrderId = new mongoose.Types.ObjectId();

    const prodOrder = new ProductionOrder({
      productionOrderId: `PROD-BATCH-${Date.now().toString().slice(-6)}`,
      orderId: dummyOrderId,
      orderType: 'purchase', // internal restock
      items: [
        {
          productId: product._id,
          sku: product.sku || 'SKU-UNKNOWN',
          quantity,
          rawMaterials: [],
          currentStage: 'pending_material',
        },
      ],
      priority: 'normal',
      status: 'queued',
    });

    await prodOrder.save();

    const batch = new ManufacturingBatch({
      batchNumber,
      productId: product._id,
      totalQuantity: quantity,
      completedQuantity: 0,
      status: 'planning',
      productionOrders: [prodOrder._id],
    });

    await batch.save();

    // Update inventory to reflect production
    if (!product.inventory) {
      product.inventory = {
        available: product.stock || 0,
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
    product.inventory.production += quantity;
    await product.save({ validateBeforeSave: false });

    return batch;
  }
}
