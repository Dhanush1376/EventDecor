import mongoose from 'mongoose';
import Shipment from '../models/Shipment';
import ShipmentEvent from '../models/ShipmentEvent';
import { ShiprocketAdapter } from './ShiprocketAdapter';
import { ManualCourierAdapter } from './ManualCourierAdapter';
import { ICourierAdapter } from './CourierAdapter';
import logger from '../../../config/logger';

export class ShippingService {
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

      // Prepare shipment payload for courier
      const payload = {
        order_id: orderId,
        billing_name: shippingAddress.firstName,
        billing_address_1: shippingAddress.address,
        billing_city: shippingAddress.city,
        billing_pincode: shippingAddress.pincode,
        billing_state: shippingAddress.state,
        billing_country: shippingAddress.country || 'India',
        billing_phone: shippingAddress.phone || '9999999999',
        weight: 2, // Assuming calculated from packages
      };

      const booking = await adapter.createShipment(payload);

      const shipmentId = `SHP-${Date.now().toString().slice(-6)}`;

      const shipment = new Shipment({
        shipmentId,
        orderId: new mongoose.Types.ObjectId(orderId),
        packages: packageIds.map((id) => new mongoose.Types.ObjectId(id)),
        provider: courierType === 'shiprocket' ? 'Delhivery' : 'Local Courier',
        trackingNumber: booking.trackingNumber,
        labelUrl: booking.labelUrl,
        status: 'pending',
      });

      await shipment.save({ session });

      // Log initial event
      await ShipmentEvent.create(
        [
          {
            shipmentId: shipment._id,
            status: 'dispatched',
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
      logger.error('Failed to dispatch packages:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Syncs latest tracking status from courier and appends ShipmentEvents
   */
  static async syncTrackingStatus(shipmentId: string) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new Error('Shipment not found');

    const adapter =
      (shipment as any).provider === 'Local Courier'
        ? new ManualCourierAdapter()
        : new ShiprocketAdapter();
    const tracking = await adapter.trackShipment(shipment.trackingNumber!);

    // Naive state machine mapping
    let newStatus = shipment.status;
    if (tracking.status.includes('Transit')) newStatus = 'in_transit';
    if (tracking.status.includes('Delivered')) newStatus = 'delivered';

    if (newStatus !== shipment.status) {
      shipment.status = newStatus as any;
      await shipment.save();

      await ShipmentEvent.create([
        {
          shipmentId: shipment._id,
          status: newStatus === 'delivered' ? 'delivered' : 'in_transit',
          location: { city: tracking.location || 'Unknown' },
          timestamp: new Date(),
          source: 'courier_webhook',
          rawPayload: { rawStatus: tracking.status },
        },
      ]);
    }

    return shipment;
  }
}
