import mongoose from 'mongoose';
import Shipment from '../models/Shipment';
import ShipmentEvent from '../models/ShipmentEvent';
import Package from '../../warehouse/models/Package';
import Order from '../../../models/Order';
import { CourierAdapterFactory } from './CourierAdapterFactory';
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

      const adapter = CourierAdapterFactory.getAdapter(courierType);

      // Calculate actual weight (fallback to 0.5kg if missing)
      const packages = await Package.find({ _id: { $in: packageIds } }).session(session);
      const totalWeightKg = packages.reduce((sum: number, pkg: any) => {
        return sum + (pkg.weight || 0.5);
      }, 0);

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
        weight: totalWeightKg,
      };

      const booking = await adapter.createShipment(payload);

      const { SequenceGeneratorService } = require('../../../services/SequenceGeneratorService');
      const shipmentId = await SequenceGeneratorService.generateFulfilmentNumber();

      const order = await Order.findById(orderId).session(session);
      if (!order) throw new Error('Order not found');

      const defaultProvider = order.courierPartner || 'Standard Courier';

      const shipment = new Shipment({
        shipmentId,
        orderId: new mongoose.Types.ObjectId(orderId),
        packageIds: packageIds.map((id) => new mongoose.Types.ObjectId(id)),
        courierPartner: courierType === 'shiprocket' ? defaultProvider : 'Local Courier',
        awbNumber: booking.trackingNumber, // Use AWB provided by courier
        trackingNumber: booking.trackingNumber,
        trackingUrl: booking.labelUrl, // Tracking label URL provided by the courier or generated locally
        status: 'booked',
      });

      await shipment.save({ session });

      // Log initial event
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

      // Update Packages status to dispatched
      await Package.updateMany(
        { _id: { $in: packageIds } },
        {
          $set: {
            status: 'dispatched',
            shipmentId: shipment._id,
          },
        },
        { session },
      );

      // Update Order with tracking info and status if ALL packages are dispatched
      // For partial shipment, we might set orderStatus to 'Partially Shipped'
      const totalPackages = await Package.countDocuments({ orderId }).session(session);
      const dispatchedPackages = await Package.countDocuments({
        orderId,
        status: 'dispatched',
      }).session(session);

      const newOrderStatus = dispatchedPackages >= totalPackages ? 'Shipped' : 'Ready to Ship'; // or Partially Shipped if we add it

      // For customer visibility, we assign the first AWB to the order tracking field
      // Advanced frontends will query the packages/shipments directly for multi-package orders
      if (!order.trackingNumber) {
        order.trackingNumber = shipment.awbNumber;
        order.courierPartner = shipment.courierPartner;
        order.barcodeData = shipment.awbNumber; // Now encodes real AWB

        const { getFrontendUrl } = require('../../../utils/getFrontendUrl');
        const { LogisticsService } = require('../../../services/logisticsService');
        const token = LogisticsService.generateTrackingToken(order._id.toString());
        order.qrCodeData = `${getFrontendUrl()}/track/${order._id}?token=${token}`;
      }

      order.orderStatus = newOrderStatus as any;
      order.dispatchDate = new Date();
      await order.save({ session });

      await session.commitTransaction();

      // POST-COMMIT SIDE EFFECTS
      try {
        const { emitUserEvent } = require('../../../socket');
        emitUserEvent(order.user.toString(), 'order_status_updated', {
          orderId: order._id,
          orderStatus: newOrderStatus,
        });

        const { NotificationService } = require('../../../services/notificationService');
        await NotificationService.createNotification({
          userId: order.user,
          title: newOrderStatus === 'Shipped' ? 'Order Shipped' : 'Order Partially Shipped',
          message: `Your order has been shipped. Tracking AWB: ${shipment.awbNumber}`,
          type: 'order_update',
        });
      } catch (e) {
        logger.warn('Post-commit notification failed', e);
      }

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

    const provider = (shipment as any).provider || (shipment as any).courierPartner || 'manual';
    const adapter = CourierAdapterFactory.getAdapter(provider);
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
