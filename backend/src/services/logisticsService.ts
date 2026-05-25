import jwt from 'jsonwebtoken';
import Order from '../models/Order';
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
    } catch (err) {
      throw new ApiError(403, 'Invalid or expired tracking credentials for this order');
    }
  }

  /**
   * Safe basic fields for public tracking scans
   */
  static formatPublicTrackingData(order: any) {
    return {
      _id: order._id,
      orderId: order._id,
      createdAt: order.createdAt,
      orderStatus: order.orderStatus,
      statusHistory: order.statusHistory,
      trackingNumber: order.trackingNumber,
      courierPartner: order.courierPartner,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discount: order.discount,
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
          ? order.shippingAddress.phone.replace(/./g, (c: string, i: number, str: string) => i < str.length - 4 ? '*' : c)
          : '',
      }
    };
  }
}
