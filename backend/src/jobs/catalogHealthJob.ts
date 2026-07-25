import Product from '../models/Product';
import CatalogValue from '../models/CatalogValue';
import logger from '../config/logger';

export class CatalogHealthJob {
  /**
   * Run the catalog health self-healing job
   */
  static async run() {
    logger.info('[CATALOG HEALTH] Starting self-healing scan...');
    const startTime = Date.now();

    try {
      // 1. Recalculate usage counts directly from products
      const variantUsage = await Product.aggregate([
        { $unwind: '$variants' },
        { $match: { 'variants.valueId': { $ne: null } } },
        {
          $group: {
            _id: '$variants.valueId',
            count: { $sum: 1 },
          },
        },
      ]);

      const tagUsage = await Product.aggregate([
        { $unwind: '$tagIds' },
        {
          $group: {
            _id: '$tagIds',
            count: { $sum: 1 },
          },
        },
      ]);

      // Map of valueId -> usageCount
      const usageMap = new Map<string, number>();
      variantUsage.forEach((v) => usageMap.set(v._id.toString(), v.count));
      tagUsage.forEach((t) => usageMap.set(t._id.toString(), t.count));

      // 2. Update CatalogValues with correct usage counts
      const allValues = await CatalogValue.find();
      const ops = [];

      for (const cv of allValues) {
        const idStr = cv._id.toString();
        const actualUsage = usageMap.get(idStr) || 0;

        if (cv.usageCount !== actualUsage) {
          ops.push({
            updateOne: {
              filter: { _id: cv._id },
              update: {
                $set: {
                  usageCount: actualUsage,
                  lastUsedAt: actualUsage > 0 ? new Date() : cv.lastUsedAt,
                },
              },
            },
          });
        }
      }

      if (ops.length > 0) {
        await CatalogValue.bulkWrite(ops);
        logger.info(`[CATALOG HEALTH] Corrected usage counts for ${ops.length} values`);
      }

      // 3. Detect Orphans (count 0, unused for 60+ days)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const orphans = await CatalogValue.find({
        usageCount: 0,
        status: { $ne: 'rejected' },
        $or: [
          { lastUsedAt: { $lte: sixtyDaysAgo } },
          { lastUsedAt: null, createdAt: { $lte: sixtyDaysAgo } },
        ],
      });

      if (orphans.length > 0) {
        logger.info(`[CATALOG HEALTH] Found ${orphans.length} orphaned catalog values`);
        // Optional: Auto-reject or flag orphans (doing nothing to just report them in health score)
      }

      // 4. Compute Health Score
      const totalValues = allValues.length;
      const approvedValues = allValues.filter((v) => v.status === 'approved').length;
      const pendingValues = allValues.filter((v) => v.status === 'pending').length;

      let score = 100;
      if (totalValues > 0) {
        // -1 point for every pending value, max -20
        score -= Math.min(20, (pendingValues / totalValues) * 100);
        // -0.5 points for every orphan, max -10
        score -= Math.min(10, (orphans.length / totalValues) * 50);
      }

      score = Math.max(0, Math.round(score));

      logger.info(
        `[CATALOG HEALTH] Scan complete in ${Date.now() - startTime}ms. Score: ${score}/100`,
      );

      return {
        success: true,
        score,
        metrics: {
          totalValues,
          approvedValues,
          pendingValues,
          orphanedValues: orphans.length,
          correctedCounts: ops.length,
        },
      };
    } catch (err: any) {
      logger.error(`[CATALOG HEALTH] Error during scan: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
