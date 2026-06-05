import Product from '../../models/Product';
import RentalDayBlock from '../../models/RentalDayBlock';
import ApiError from '../../utils/ApiError';
import mongoose from 'mongoose';

export class RentalAvailabilityService {
  /**
   * Helper to generate array of date strings 'YYYY-MM-DD'
   */
  static getDatesInRange(startDate: Date, endDate: Date): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    // Include all days up to the end date
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  /**
   * Check if a product is available for the requested date range,
   * and if so, return an available unitNumber.
   */
  static async checkAvailability(productId: string, startDate: Date, endDate: Date, session?: any) {
    const product = await Product.findById(productId).lean();
    if (!product) throw new ApiError(404, 'Product not found');
    if (!product.rentalEnabled) throw new ApiError(400, 'This product is not available for rent');

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (product.rentalStock <= 0) {
      return { available: false, reason: 'No rental stock available' };
    }

    const requestedDates = this.getDatesInRange(start, end);

    // Fetch all booked blocks for this product on the requested dates
    const query = RentalDayBlock.find({
      product: productId,
      date: { $in: requestedDates },
    });

    if (session) {
      query.session(session);
    }

    const bookedBlocks = await query.lean();

    // Map units to their booked dates
    const unitBookings: Record<number, Set<string>> = {};
    for (const block of bookedBlocks) {
      if (!unitBookings[block.unitNumber]) {
        unitBookings[block.unitNumber] = new Set();
      }
      unitBookings[block.unitNumber].add(block.date);
    }

    // Find the first unitNumber (1 to rentalStock) that has NO overlap with requestedDates
    let availableUnitNumber = -1;
    for (let unit = 1; unit <= product.rentalStock; unit++) {
      let isAvailable = true;
      for (const date of requestedDates) {
        if (unitBookings[unit] && unitBookings[unit].has(date)) {
          isAvailable = false;
          break;
        }
      }
      if (isAvailable) {
        availableUnitNumber = unit;
        break;
      }
    }

    if (availableUnitNumber === -1) {
      return {
        available: false,
        reason: 'Product is fully booked for the selected dates',
      };
    }

    return { available: true, unitNumber: availableUnitNumber, requestedDates };
  }

  /**
   * Lock the dates by creating RentalDayBlock documents.
   * Due to the unique index on { product, date, unitNumber }, this will natively
   * throw a MongoError 11000 if a concurrent transaction tries to book the same unit.
   */
  static async lockDates(
    productId: string,
    rentalOrderId: string,
    unitNumber: number,
    dates: string[],
    session: mongoose.ClientSession,
  ) {
    const blocks = dates.map((date) => ({
      product: productId,
      rentalOrder: rentalOrderId,
      date,
      unitNumber,
    }));

    try {
      await RentalDayBlock.insertMany(blocks, { session: session || undefined });
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ApiError(
          409,
          'Dates were just booked by another user. Please try different dates.',
        );
      }
      throw error;
    }
  }

  /**
   * Release locked dates for a cancelled/failed order.
   */
  static async releaseDates(rentalOrderId: string, session?: mongoose.ClientSession) {
    await RentalDayBlock.deleteMany(
      { rentalOrder: rentalOrderId },
      { session: session || undefined },
    );
  }
}
