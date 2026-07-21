import mongoose from 'mongoose';
import { IScanHandler, IScanHandlerResult, ScanParserRegistry } from './ScanParserRegistry';
import { IScanEvent } from '../../types/scanEvent';
import Shipment from '../../../shipping/models/Shipment';
import ShipmentEvent from '../../../shipping/models/ShipmentEvent';

export class CourierScanHandler implements IScanHandler {
  prefix = 'AWB'; // Assuming couriers use prefix like AWB847382937 or AWB- depending on integration
  entityType = 'shipment' as const;

  async handle(
    scanEvent: IScanEvent,
    session: mongoose.ClientSession,
  ): Promise<IScanHandlerResult> {
    const awb = scanEvent.entityId as string;

    // Find shipment by AWB or Tracking number
    const shipment = await Shipment.findOne({
      $or: [{ awbNumber: awb }, { trackingNumber: awb }],
    }).session(session);

    if (!shipment) return { success: false, errorMessage: 'Shipment not found for AWB' };

    // Advance state machine for Courier Pickup
    if (shipment.status === 'booked') {
      shipment.status = 'picked_up';
      await shipment.save({ session });

      await ShipmentEvent.create(
        [
          {
            shipmentId: shipment._id,
            status: 'picked_up',
            source: 'manual_scan',
            rawPayload: { scannedBy: scanEvent.scannedBy, scanId: scanEvent.scanId },
          },
        ],
        { session },
      );

      scanEvent.action = 'ship';
      await scanEvent.save({ session });
      return { success: true };
    }

    // Already picked up - idempotent
    if (['picked_up', 'in_transit', 'delivered'].includes(shipment.status)) {
      return { success: true };
    }

    return { success: false, errorMessage: `Invalid shipment state: ${shipment.status}` };
  }
}

ScanParserRegistry.register(new CourierScanHandler());
