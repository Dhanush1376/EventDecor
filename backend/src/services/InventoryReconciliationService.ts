import Product from '../models/Product';
import InventoryReservation from '../models/InventoryReservation';
import logger from '../config/logger';

export class InventoryReconciliationService {
  /**
   * Reconciles reservedStock against actual InventoryReservation documents.
   * Finds phantom reservations (where reservedStock > sum of reservations)
   * or uncounted reservations (where reservedStock < sum of reservations).
   */
  static async reconcileStockCounts() {
    logger.info('[INVENTORY RECONCILIATION] Starting reconciliation...');

    const activeReservationsAgg = await InventoryReservation.aggregate([
      { $match: { status: 'reserved' } },
      { $group: { _id: '$product', totalReserved: { $sum: '$quantity' } } },
    ]);

    const activeMap = new Map(
      activeReservationsAgg.map((r) => [r._id.toString(), r.totalReserved]),
    );
    const activeProductIds = Array.from(activeMap.keys());

    // Get all products that have reserved stock, negative stock, or active reservations (orphans)
    const products = await Product.find({
      $or: [
        { reservedStock: { $gt: 0 } },
        { stock: { $lt: 0 } },
        { _id: { $in: activeProductIds } },
      ],
    }).select('_id title stock reservedStock');

    let discrepancies = 0;
    let fixed = 0;

    for (const product of products) {
      const actualReserved = activeMap.get(product._id.toString()) || 0;

      let needsFix = false;
      const fixPayload: any = {};

      if (product.reservedStock !== actualReserved) {
        discrepancies++;
        const isOrphan = product.reservedStock === 0 && actualReserved > 0;
        const severity = isOrphan ? 'MEDIUM' : 'HIGH';

        logger.warn(
          `[INVENTORY RECONCILIATION] [${severity}] Drift on ${product._id}: DB reservedStock=${product.reservedStock}, Actual=${actualReserved}`,
        );
        needsFix = true;
        fixPayload.reservedStock = actualReserved;
      }

      if (product.stock < 0) {
        discrepancies++;
        logger.warn(
          `[INVENTORY RECONCILIATION] [CRITICAL] Negative stock on ${product._id}: ${product.stock}`,
        );

        try {
          const { AlertingService } = require('./AlertingService');
          await AlertingService.inventoryAnomaly('Negative Inventory Stock', {
            productId: product._id.toString(),
            stock: product.stock,
          });
        } catch {
          /* ignore */
        }

        needsFix = true;
        fixPayload.stock = 0;
      }

      if (needsFix) {
        try {
          await Product.findByIdAndUpdate(product._id, { $set: fixPayload });
          fixed++;
        } catch (err) {
          logger.error(`[INVENTORY RECONCILIATION] Failed to fix drift on ${product._id}`, err);
        }
      }
    }

    if (discrepancies > 0) {
      const { createAdminNotification } = require('./notificationService');
      await createAdminNotification({
        title: `⚠️ Inventory Drift Detected`,
        message: `Found ${discrepancies} inventory drift issues. Auto-corrected ${fixed}. Check logs for CRITICAL/HIGH/MEDIUM severity details.`,
        type: 'system',
      }).catch((e: any) => logger.error('Failed to create admin notification', e));
    }

    logger.info(
      `[INVENTORY RECONCILIATION] Completed. Checked ${products.length} products. Found ${discrepancies} drifts. Fixed ${fixed}.`,
    );

    return {
      productsChecked: products.length,
      discrepanciesFound: discrepancies,
      autoFixed: fixed,
    };
  }
}
