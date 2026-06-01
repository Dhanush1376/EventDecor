import RentalService from '../services/rentalService';
import RentalOrder from '../models/RentalOrder';
import RentalCalendar from '../models/RentalCalendar';
import logger from '../config/logger';

/**
 * Rental Cron Jobs
 *
 * These functions are designed to be called by the application's
 * existing cron/scheduler infrastructure (e.g., node-cron, Bull queue).
 *
 * Schedule:
 *   - applyLateFees:          Daily at 00:30 IST
 *   - sendRentalReminders:    Daily at 09:00 IST
 *   - releaseExpiredCalendar: Every 6 hours
 */

/**
 * Apply late fees to all overdue active rentals.
 * Should run daily.
 */
export async function runApplyLateFees() {
  try {
    logger.info('[RENTAL CRON] Starting late fee application...');
    const result = await RentalService.applyLateFees();
    logger.info(`[RENTAL CRON] Late fees applied to ${result.processed} rental(s)`);
    return result;
  } catch (error) {
    logger.error('[RENTAL CRON] Failed to apply late fees:', error);
    throw error;
  }
}

/**
 * Send rental ending soon reminders (2 days before end date).
 * Should run daily.
 */
export async function runSendRentalReminders() {
  try {
    logger.info('[RENTAL CRON] Checking for upcoming rental returns...');

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Rentals ending in the next 2 days
    const endingSoon = await RentalOrder.find({
      status: 'active_rental',
      rentalEndDate: { $gte: today, $lte: twoDaysFromNow },
      paymentStatus: 'paid',
    })
      .populate('user', 'name email')
      .lean();

    let sent = 0;
    for (const rental of endingSoon) {
      try {
        // Future: integrate with notificationService to send email/SMS/WhatsApp
        logger.info(
          `[RENTAL CRON] Reminder needed for ${rental.rentalOrderId} (ends: ${rental.rentalEndDate})`,
        );
        sent++;
      } catch (err) {
        logger.error(`[RENTAL CRON] Failed to send reminder for ${rental.rentalOrderId}:`, err);
      }
    }

    logger.info(`[RENTAL CRON] Processed ${sent} rental reminder(s)`);
    return { sent };
  } catch (error) {
    logger.error('[RENTAL CRON] Failed to send rental reminders:', error);
    throw error;
  }
}

/**
 * Release calendar blocks for cancelled/returned orders that haven't
 * been cleaned up due to race conditions or crashes.
 * Should run every 6 hours.
 */
export async function runReleaseExpiredCalendar() {
  try {
    logger.info('[RENTAL CRON] Cleaning up expired calendar blocks...');

    // Find calendar blocks for orders that are cancelled/completed but still marked as booked
    const staleBlocks = await RentalCalendar.find({
      status: 'booked',
    })
      .populate('rentalOrder', 'status')
      .lean();

    let cleaned = 0;
    for (const block of staleBlocks) {
      const order = block.rentalOrder as any;
      if (order && ['cancelled', 'completed', 'refunded'].includes(order.status)) {
        await RentalCalendar.findByIdAndUpdate(block._id, {
          status: order.status === 'cancelled' ? 'cancelled' : 'returned',
        });
        cleaned++;
      }
    }

    logger.info(`[RENTAL CRON] Cleaned up ${cleaned} stale calendar block(s)`);
    return { cleaned };
  } catch (error) {
    logger.error('[RENTAL CRON] Failed to clean expired calendar blocks:', error);
    throw error;
  }
}

/**
 * Release rental stock and cancel pending rental orders older than 30 minutes.
 * Should run every 15 minutes.
 */
export async function releaseStalePendingRentals() {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const staleRentals = await RentalOrder.find({
      paymentStatus: 'pending',
      createdAt: { $lt: cutoff },
    }).lean();

    let processed = 0;
    for (const rental of staleRentals) {
      const session = await RentalOrder.startSession();
      session.startTransaction();
      try {
        // Only release the calendar block since we no longer reduce global stock
        await RentalCalendar.deleteOne({ rentalOrder: rental._id }, { session });

        await RentalOrder.findByIdAndUpdate(
          rental._id,
          {
            status: 'cancelled',
            paymentStatus: 'failed',
            $push: {
              statusHistory: {
                status: 'cancelled',
                timestamp: new Date(),
                note: 'Order cancelled due to payment timeout - rental stock and calendar released',
              },
            },
          },
          { session },
        );

        await session.commitTransaction();
        processed++;
      } catch (err) {
        await session.abortTransaction();
        logger.error(`[RENTAL CRON] Failed to release stale rental ${rental._id}:`, err);
      } finally {
        session.endSession();
      }
    }

    if (processed > 0) {
      logger.info(`[RENTAL CRON] Released ${processed} stale pending rental order(s)`);
    }
    return { processed };
  } catch (error) {
    logger.error('[RENTAL CRON] Failed to release stale pending rentals:', error);
    throw error;
  }
}
