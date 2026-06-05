import mongoose from 'mongoose';
import InventoryLedger from '../models/InventoryLedger';
import Product from '../models/Product';

/**
 * InventorySnapshotService — Recalculates product stock dynamically from the ledger.
 */
export class InventorySnapshotService {
  /**
   * Recalculate and synchronize a product's stock directly from the double-entry ledger.
   * This is the ultimate source of truth, used to fix any cache drift.
   */
  static async takeSnapshot(
    productId: string,
    session?: mongoose.ClientSession,
  ): Promise<{ stock: number; reservedStock: number }> {
    const objectId = new mongoose.Types.ObjectId(productId);

    // Aggregate all ledger entries for this product
    const aggregation = await InventoryLedger.aggregate(
      [
        { $match: { product: objectId, status: 'committed' } },
        {
          $group: {
            _id: null,
            totalInAvailable: {
              $sum: { $cond: [{ $eq: ['$toAccount', 'AVAILABLE'] }, '$quantity', 0] },
            },
            totalOutAvailable: {
              $sum: { $cond: [{ $eq: ['$fromAccount', 'AVAILABLE'] }, '$quantity', 0] },
            },
            totalInReserved: {
              $sum: { $cond: [{ $eq: ['$toAccount', 'RESERVED'] }, '$quantity', 0] },
            },
            totalOutReserved: {
              $sum: { $cond: [{ $eq: ['$fromAccount', 'RESERVED'] }, '$quantity', 0] },
            },
          },
        },
      ],
      { session: session || null },
    );

    let stock = 0;
    let reservedStock = 0;

    if (aggregation.length > 0) {
      const { totalInAvailable, totalOutAvailable, totalInReserved, totalOutReserved } =
        aggregation[0];
      stock = totalInAvailable - totalOutAvailable;
      reservedStock = totalInReserved - totalOutReserved;
    }

    // Sync back to Product materialised view
    await Product.findByIdAndUpdate(
      productId,
      { $set: { stock: Math.max(0, stock), reservedStock: Math.max(0, reservedStock) } },
      { session: session || null },
    );

    return { stock, reservedStock };
  }

  /**
   * Rollback a specific ledger transaction (e.g. for failed orders).
   */
  static async rollbackTransaction(
    referenceId: string,
    performedBy: string,
    session?: mongoose.ClientSession,
  ) {
    const entries = await InventoryLedger.find({ referenceId, status: 'committed' }).session(
      session || null,
    );

    if (entries.length === 0) return;

    for (const entry of entries) {
      // Create compensating entry
      await InventoryLedger.create(
        [
          {
            product: entry.product,
            referenceId: entry.referenceId,
            referenceType: entry.referenceType,
            type: 'refund',
            quantity: entry.quantity,
            fromAccount: entry.toAccount, // reverse direction
            toAccount: entry.fromAccount,
            status: 'committed',
            performedBy,
            notes: `Rollback of transaction ${entry._id}`,
          },
        ],
        { session },
      );

      // Mark original as rolled back
      entry.status = 'rolled_back';
      await entry.save({ session });
    }

    // Re-snapshot affected products
    const productIds = [...new Set(entries.map((e) => e.product.toString()))];
    for (const pid of productIds) {
      await this.takeSnapshot(pid, session);
    }
  }
}
