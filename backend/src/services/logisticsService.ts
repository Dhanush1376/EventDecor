import jwt from 'jsonwebtoken';
import Order from '../models/Order';
import Package from '../domains/warehouse/models/Package';
import Shipment from '../domains/shipping/models/Shipment';
import ShipmentEvent from '../domains/shipping/models/ShipmentEvent';
import ApiError from '../utils/ApiError';

export class LogisticsService {
  /**
   * Generates a signed JWT for public logistics tracking
   */
  static generateTrackingToken(orderId: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required to generate tracking tokens');
    return jwt.sign({ orderId }, secret, { expiresIn: '90d' }); // valid for 90 days
  }

  /**
   * Verifies the tracking token and returns the Order
   */
  static async verifyTrackingTokenAndGetOrder(token: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new ApiError(500, 'Server configuration error');

    try {
      const decoded = jwt.verify(token, secret) as { orderId: string };
      if (!decoded.orderId) throw new Error('Invalid token payload');

      const order = await Order.findById(decoded.orderId);
      if (!order) throw new ApiError(404, 'Order not found');

      return order;
    } catch {
      throw new ApiError(403, 'Invalid or expired tracking credentials for this order');
    }
  }

  /**
   * Safe basic fields for public tracking scans
   */
  /**
   * Safe basic fields for public tracking scans, enriched with package/shipment data
   */
  static async formatPublicTrackingData(order: any) {
    const packages = await Package.find({ orderId: order._id }).lean();

    // For each package, fetch shipment details if dispatched
    const enrichedPackages = await Promise.all(
      packages.map(async (pkg: any) => {
        let shipmentData = null;
        let shipmentEvents: any[] = [];
        if (pkg.shipmentId) {
          const shipment = await Shipment.findById(pkg.shipmentId).lean();
          if (shipment) {
            shipmentData = {
              awbNumber: shipment.awbNumber,
              courierPartner: shipment.courierPartner,
              status: shipment.status,
              estimatedDeliveryDate: shipment.estimatedDeliveryDate,
              actualDeliveryDate: shipment.actualDeliveryDate,
              trackingUrl: shipment.trackingUrl,
            };
            shipmentEvents = await ShipmentEvent.find({ shipmentId: shipment._id })
              .sort({ timestamp: -1 })
              .lean();
          }
        }

        return {
          packageId: pkg.packageId,
          packageNumber: pkg.packageNumber,
          totalPackages: pkg.totalPackages,
          status: pkg.status,
          updatedAt: pkg.updatedAt,
          items: pkg.items.map((i: any) => ({ sku: i.sku, quantity: i.quantity })),
          shipment: shipmentData,
          events: shipmentEvents.map((e: any) => ({
            status: e.status,
            timestamp: e.timestamp,
            location: e.location?.city || e.location?.hubName || 'Unknown',
          })),
        };
      }),
    );

    return {
      _id: order._id,
      orderId: order._id,
      createdAt: order.createdAt,
      orderStatus: order.orderStatus,
      statusHistory: order.statusHistory,
      trackingNumber: order.trackingNumber, // Primary AWB
      courierPartner: order.courierPartner, // Primary Courier
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discount: order.discount,
      packages: enrichedPackages,
      items: order.items.map((item: any) => ({
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        variant: item.variant,
        imageSrc: item.imageSrc,
        category: item.category,
      })),
      shippingAddress: {
        name: order.shippingAddress.name,
        pincode: order.shippingAddress.pincode,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        // Mask phone: show only last 4 digits
        phone: order.shippingAddress.phone
          ? order.shippingAddress.phone.replace(/./g, (c: string, i: number, str: string) =>
              i < str.length - 4 ? '*' : c,
            )
          : '',
      },
    };
  }
}
