import mongoose from 'mongoose';
import Shipment from '../models/Shipment';
import ShipmentEvent from '../models/ShipmentEvent';
import { ShiprocketAdapter } from './ShiprocketAdapter';
import { ManualCourierAdapter } from './ManualCourierAdapter';
import { ICourierAdapter } from './CourierAdapter';
import logger from '../../../config/logger';

export class CourierEngine {
  /**
   * Initializes a shipment for a set of packages, booking it with the appropriate courier
   */
  static async dispatchPackages(
    orderId: string,
    packageIds: string[],
    courierType: 'shiprocket' | 'manual',
    shippingAddress: any,
  ) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      let adapter: ICourierAdapter;
      if (courierType === 'shiprocket') {
        adapter = new ShiprocketAdapter();
      } else {
        adapter = new ManualCourierAdapter();
      }

      // TODO: Fetch weight from packages dynamically
      const payload = {
        order_id: orderId,
        billing_name: shippingAddress.firstName,
        billing_address_1: shippingAddress.address,
        billing_city: shippingAddress.city,
        billing_pincode: shippingAddress.pincode,
        billing_state: shippingAddress.state,
        billing_country: shippingAddress.country || 'India',
        billing_phone: shippingAddress.phone || '9999999999',
        weight: 2,
      };

      const booking = await adapter.createShipment(payload);
      const shipmentId = `SHP-${Date.now().toString().slice(-6)}`;

      const Order = mongoose.model('Order');
      const order = await Order.findById(orderId);
      const defaultProvider = order?.courierPartner || 'Standard Courier';

      const shipment = new Shipment({
        shipmentId,
        orderId: new mongoose.Types.ObjectId(orderId),
        packages: packageIds.map((id) => new mongoose.Types.ObjectId(id)),
        provider: courierType === 'shiprocket' ? defaultProvider : 'Local Courier',
        trackingNumber: booking.trackingNumber,
        trackingUrl: booking.labelUrl,
        status: 'booked', // from Shipment schema enum
      });

      await shipment.save({ session });

      await ShipmentEvent.create(
        [
          {
            shipmentId: shipment._id,
            status: 'booked',
            location: { city: 'Warehouse', hubName: 'Origin Hub' },
            timestamp: new Date(),
            source: 'manual_scan',
            rawPayload: { providerTrackingNumber: booking.trackingNumber },
          },
        ],
        { session },
      );

      await session.commitTransaction();
      return shipment;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Failed to dispatch packages via CourierEngine:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }
}
