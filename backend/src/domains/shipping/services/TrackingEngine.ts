import Shipment from '../models/Shipment';
import ShipmentEvent from '../models/ShipmentEvent';
import { ShiprocketAdapter } from './ShiprocketAdapter';
import { ManualCourierAdapter } from './ManualCourierAdapter';
import mongoose from 'mongoose';
import logger from '../../../config/logger';

export class TrackingEngine {
  /**
   * Normalizes webhook data or polled tracking updates into standard internal states
   */
  static async syncTrackingStatus(shipmentId: string) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const shipment = await Shipment.findById(shipmentId).session(session);
      if (!shipment) throw new Error('Shipment not found');

      const adapter =
        shipment.courierPartner === 'Local Courier'
          ? new ManualCourierAdapter()
          : new ShiprocketAdapter();

      const tracking = await adapter.trackShipment(shipment.trackingNumber!);

      // Advanced State Machine Mapping (to be moved to adapters later)
      let newStatus = shipment.status;
      if (tracking.status.includes('Transit')) newStatus = 'in_transit';
      if (tracking.status.includes('Delivered')) newStatus = 'delivered';
      if (tracking.status.includes('Out for delivery')) newStatus = 'out_for_delivery';

      if (newStatus !== shipment.status) {
        shipment.status = newStatus as any;
        if (newStatus === 'delivered') {
          shipment.actualDeliveryDate = new Date();
        }
        await shipment.save({ session });

        await ShipmentEvent.create(
          [
            {
              shipmentId: shipment._id,
              status: newStatus,
              location: { city: tracking.location || 'Unknown' },
              timestamp: new Date(),
              source: 'courier_webhook',
              rawPayload: { rawStatus: tracking.status },
            },
          ],
          { session },
        );
      }

      await session.commitTransaction();
      return shipment;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Failed to sync tracking status via TrackingEngine:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }
}
