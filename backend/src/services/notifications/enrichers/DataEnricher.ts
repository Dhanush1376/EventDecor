import User from '../../../models/User';
import Order from '../../../models/Order';
import EventJob from '../../../domains/event_operations/models/EventJob';
import RentalOrder from '../../../models/RentalOrder';
import logger from '../../../config/logger';

export class DataEnricher {
  public static async enrich(
    eventCategory: string,
    aggregateId: string,
    payloadData: any,
  ): Promise<any> {
    const enriched = { ...payloadData };

    try {
      if (eventCategory === 'order') {
        const order = await Order.findById(aggregateId).populate('user').lean();
        if (order) {
          enriched.order = order;
          if (order.user) enriched.user = order.user;
        }
      } else if (eventCategory === 'booking') {
        const booking = await EventJob.findById(aggregateId)
          .populate('user')
          .populate('eventPackage')
          .lean();
        if (booking) {
          enriched.booking = booking;
          if (booking.user) enriched.user = booking.user;
        }
      } else if (eventCategory === 'rental') {
        const rental = await RentalOrder.findById(aggregateId).populate('user').lean();
        if (rental) {
          enriched.rental = rental;
          if (rental.user) enriched.user = rental.user;
        }
      } else if (payloadData.userId) {
        // Fallback explicit user fetch
        const user = await User.findById(payloadData.userId).lean();
        if (user) enriched.user = user;
      }

      // Map universal fields for templating
      if (enriched.user) {
        enriched.name = enriched.user.name || enriched.name;
        enriched.email = enriched.user.email || enriched.email;
        enriched.phone = enriched.user.phone || enriched.phone;
      }
    } catch (error) {
      logger.warn(
        `[DATA ENRICHER] Failed to enrich payload for ${eventCategory}:${aggregateId}:`,
        error,
      );
    }

    return enriched;
  }
}
