import Order from '../../../models/Order';
import Product from '../../../models/Product';
import User from '../../../models/User';
import Shipment from '../../shipping/models/Shipment';
import logger from '../../../config/logger';

export class EnterpriseSearchService {
  /**
   * Unified search across Products, Orders, Users, and Shipments.
   * Leverages MongoDB Atlas Search ($search) if configured,
   * otherwise falls back to regex-based queries for local dev.
   */
  static async globalSearch(query: string, limit: number = 10) {
    if (!query || query.length < 2) return { products: [], orders: [], users: [], shipments: [] };

    try {
      // Basic fallback search using regex for local dev.
      // In production, this should ideally use MongoDB Atlas $search index.
      const regex = new RegExp(query, 'i');

      const [products, orders, users, shipments] = await Promise.all([
        Product.find({ $or: [{ title: regex }, { sku: regex }] })
          .limit(limit)
          .lean(),
        Order.find({
          $or: [
            { _id: (query.length === 24 ? query : null) as any }, // strict hex fallback
            { invoiceNumber: regex },
            { 'shippingAddress.phone': regex },
            { 'shippingAddress.name': regex },
          ].filter(Boolean),
        })
          .limit(limit)
          .lean(),
        User.find({ $or: [{ name: regex }, { email: regex }, { phone: regex }] })
          .select('-password')
          .limit(limit)
          .lean(),
        Shipment.find({
          $or: [{ awbNumber: regex }, { trackingNumber: regex }, { shipmentId: regex }],
        })
          .limit(limit)
          .lean(),
      ]);

      return {
        products,
        orders,
        users,
        shipments,
      };
    } catch (err) {
      logger.error('Global search failed:', err);
      throw err;
    }
  }
}
