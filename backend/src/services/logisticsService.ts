import crypto from 'crypto';
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
    return jwt.sign({ orderId, purpose: 'logistics' }, secret, { expiresIn: '90d' }); // valid for 90 days
  }

  /**
   * Returns the order's public tracking token, creating one for orders placed before tokens
   * were generated at checkout.
   */
  static async ensurePublicTrackingToken(orderId: any): Promise<string> {
    const existing = await Order.findById(orderId).select('+publicTrackingToken').lean();
    if (existing?.publicTrackingToken) return existing.publicTrackingToken;
    const token = crypto.randomBytes(24).toString('hex');
    const updated = await Order.findOneAndUpdate(
      {
        _id: orderId,
        $or: [
          { publicTrackingToken: { $exists: false } },
          { publicTrackingToken: '' },
          { publicTrackingToken: null },
        ],
      },
      { $set: { publicTrackingToken: token } },
      { returnDocument: 'after' },
    )
      .select('+publicTrackingToken')
      .lean();
    if (updated?.publicTrackingToken) return updated.publicTrackingToken;
    // Another request set it concurrently
    const reread = await Order.findById(orderId).select('+publicTrackingToken').lean();
    return reread?.publicTrackingToken || token;
  }

  /**
   * Authorizes public (unauthenticated) tracking of order `orderId` using either its public
   * tracking token or a logistics JWT issued for that same order.
   */
  static async verifyPublicTrackingAccess(orderId: string, token: string) {
    const order = await Order.findById(orderId).select('+publicTrackingToken');
    if (!order) throw new ApiError(404, 'Order not found');

    const stored = order.publicTrackingToken || '';
    if (stored && /^[0-9a-f]+$/i.test(token)) {
      const provided = Buffer.from(token, 'hex');
      const expected = Buffer.from(stored, 'hex');
      if (provided.length === expected.length && crypto.timingSafeEqual(provided, expected)) {
        return order;
      }
    }

    const secret = process.env.JWT_SECRET;
    if (secret) {
      try {
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
        if (decoded?.orderId === String(order._id) && decoded?.purpose === 'logistics') {
          return order;
        }
      } catch {
        // fall through
      }
    }
    throw new ApiError(403, 'Invalid or expired tracking credentials for this order');
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
    const enrichedPackages: any[] = [];

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
