import ReturnRequest from '../models/ReturnRequest';
import Order from '../models/Order';
import { createAdminNotification } from '../services/notificationService';
import logger from '../config/logger';

export class ReturnReconciliationJob {
  /**
   * Run the reconciliation job. Should be scheduled to run every 6 hours.
   */
  static async run() {
    logger.info('Starting ReturnReconciliationJob...');

    try {
      await this.detectOrphanedRefunds();
      await this.detectSlaBreaches();
      await this.detectStalledInspections();

      logger.info('ReturnReconciliationJob completed successfully.');
    } catch (error) {
      logger.error('Error in ReturnReconciliationJob:', error);
    }
  }

  /**
   * Detects returns that are completed but the order status was not updated to Refunded/Returned.
   */
  private static async detectOrphanedRefunds() {
    // Find all completed returns from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const completedReturns = await ReturnRequest.find({
      status: 'completed',
      updatedAt: { $gte: sevenDaysAgo },
    }).lean();

    let repairedCount = 0;

    for (const ret of completedReturns) {
      const order = await Order.findById(ret.orderId).lean();

      // If order is still 'Delivered', it was not updated correctly
      if (order && order.orderStatus === 'Delivered') {
        logger.warn(
          `Reconciliation: Order ${order._id} was not updated to Refunded for completed return ${ret.returnId}. Auto-repairing.`,
        );

        await Order.findByIdAndUpdate(ret.orderId, { orderStatus: 'Refunded' });
        repairedCount++;
      }
    }

    if (repairedCount > 0) {
      await createAdminNotification({
        title: '🛠️ Auto-repair: Orphaned Refunds',
        message: `Reconciliation job auto-repaired ${repairedCount} order statuses for completed returns.`,
        type: 'system',
        actionLink: '/admin/returns/all',
      });
    }
  }

  /**
   * Detects SLA breaches and updates the SLA object.
   */
  private static async detectSlaBreaches() {
    const activeReturns = await ReturnRequest.find({
      status: { $nin: ['completed', 'rejected', 'cancelled'] },
      'sla.isOverdue': false,
    });

    let breachedCount = 0;
    const now = new Date().getTime();

    for (const ret of activeReturns) {
      if (!ret.sla?.stageEnteredAt) continue;

      const timeInStageMs = now - ret.sla.stageEnteredAt.getTime();
      const timeInStageHours = timeInStageMs / (1000 * 60 * 60);

      let maxHours = 48; // Default max hours in a stage

      // Specific SLAs based on stage
      if (ret.status === 'submitted')
        maxHours = 24; // Needs approval within 24h
      else if (ret.status === 'reached_warehouse')
        maxHours = 48; // Needs inspection within 48h
      else if (ret.status === 'inspection_passed') maxHours = 24; // Needs refund within 24h

      if (timeInStageHours > maxHours) {
        ret.sla.isOverdue = true;
        await ret.save();

        // Notify admin
        await createAdminNotification({
          title: '⚠️ SLA Breach: Return Request Overdue',
          message: `Return ${ret.returnId} has been in ${ret.status} for over ${maxHours} hours.`,
          type: 'system',
          actionLink: `/admin/returns/requests/${ret._id}`,
        });

        breachedCount++;
      }
    }

    if (breachedCount > 0) {
      logger.warn(`Reconciliation: Detected ${breachedCount} new SLA breaches.`);
    }
  }

  /**
   * Detects returns where inspection passed but refund was never triggered.
   */
  private static async detectStalledInspections() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const stalledReturns = await ReturnRequest.find({
      status: 'inspection_passed',
      'sla.stageEnteredAt': { $lte: twentyFourHoursAgo },
    }).lean();

    if (stalledReturns.length > 0) {
      await createAdminNotification({
        title: '🚨 Stalled Refunds',
        message: `Found ${stalledReturns.length} returns where inspection passed over 24h ago but refund was not triggered.`,
        type: 'system',
        actionLink: '/admin/returns/all?status=inspection_passed',
      });
    }
  }
}
