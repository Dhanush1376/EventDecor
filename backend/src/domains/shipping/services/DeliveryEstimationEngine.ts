import DeliveryZone from '../models/DeliveryZone';
import HolidayCalendar from '../models/HolidayCalendar';
import { ShiprocketAdapter } from './ShiprocketAdapter';
import logger from '../../../config/logger';

export class DeliveryEstimationEngine {
  /**
   * Calculates dynamic ETA for a given order factoring in:
   * 1. Delivery Zone SLA (Tier 1 vs Tier 3)
   * 2. Courier API estimates
   * 3. Public Holidays / Non-working days
   */
  static async estimateDelivery(
    originPincode: string,
    destPincode: string,
    weightKg: number,
  ): Promise<{ minDays: number; maxDays: number; estimatedDate: Date }> {
    try {
      let baseDays = 3; // Default
      let maxDays = 5;

      // 1. Zone-based SLA
      const zone = await DeliveryZone.findOne({ pincodes: destPincode });
      if (zone) {
        baseDays = zone.transitDays;
        maxDays = zone.transitDays + 2;
      }

      // 2. Try getting real-time Courier Quotes
      const shiprocket = new ShiprocketAdapter();
      try {
        const quotes = await shiprocket.getQuotes(originPincode, destPincode, weightKg, {});
        if (quotes && quotes.length > 0) {
          // Sort by fastest
          quotes.sort((a, b) => a.estimatedDeliveryDays - b.estimatedDeliveryDays);
          baseDays = quotes[0].estimatedDeliveryDays;
          maxDays = baseDays + 2;
        }
      } catch (_err) {
        logger.warn(
          `Courier estimation failed, falling back to Zone SLA for pincode ${destPincode}`,
        );
      }

      // 3. Adjust for holidays and weekends
      const estimatedDate = await this.addBusinessDays(new Date(), maxDays);

      return {
        minDays: baseDays,
        maxDays,
        estimatedDate,
      };
    } catch (error) {
      logger.error('ETA estimation error', error);
      // Absolute fallback
      return { minDays: 5, maxDays: 7, estimatedDate: new Date(Date.now() + 7 * 86400000) };
    }
  }

  private static async addBusinessDays(startDate: Date, daysToAdd: number): Promise<Date> {
    const currentDate = new Date(startDate);
    let addedDays = 0;

    const endDateEstimate = new Date(startDate.getTime() + (daysToAdd + 10) * 86400000);
    const holidayDocs = await HolidayCalendar.find({
      date: { $gte: startDate, $lte: endDateEstimate },
    });
    const holidays = holidayDocs.map((h) => new Date(h.date).toDateString());

    while (addedDays < daysToAdd) {
      currentDate.setDate(currentDate.getDate() + 1);

      const isWeekend = currentDate.getDay() === 0; // Sunday
      const isHoliday = holidays.includes(currentDate.toDateString());

      if (!isWeekend && !isHoliday) {
        addedDays++;
      }
    }

    return currentDate;
  }
}
