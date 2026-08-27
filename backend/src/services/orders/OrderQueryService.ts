import Order from '../../models/Order';
import ApiError from '../../utils/ApiError';
import { getPaginationOptions, formatPaginationResponse } from '../../utils/pagination';
import { OrderCardStateService } from './OrderCardStateService';

export class OrderQueryService {
  /**
   * Fetch all orders with pagination and filtering (Admin).
   */
  static async getAllOrders(query: any) {
    const { page, limit, skip } = getPaginationOptions(query);
    const filter: any = {};
    if (query.status) {
      filter.orderStatus = query.status;
    }
    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }
    if (query.user) {
      filter.user = query.user;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email phone')
        .populate('customOrderId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const ReturnRequest = require('../../models/ReturnRequest').default;
    const ExchangeRequest = require('../../models/ExchangeRequest').default;

    const populatedOrders = await Promise.all(
      orders.map(async (order: any) => {
        order.cardState = await OrderCardStateService.getCardState(order._id);
        order.returns = await ReturnRequest.find({
          orderId: order._id,
          returnType: 'return',
        }).lean();

        const exchanges = await ReturnRequest.find({
          orderId: order._id,
          returnType: 'exchange',
        }).lean();
        const exchangeIds = exchanges.map((e: any) => e._id);
        const exchangeDetails = await ExchangeRequest.find({
          returnRequestId: { $in: exchangeIds },
        }).lean();

        order.exchanges = exchanges.map((ex: any) => {
          const detail = exchangeDetails.find(
            (d: any) => d.returnRequestId.toString() === ex._id.toString(),
          );
          return { ...ex, exchangeDetail: detail };
        });
        return order;
      }),
    );

    return formatPaginationResponse(populatedOrders, total, page, limit);
  }

  /**
   * Fetch a specific order by ID (Customer/Admin).
   */
  static async getOrderById(id: string, userId: string, role: string) {
    const order: any = await Order.findById(id)
      .populate('user', 'name email phone')
      .populate('customOrderId')
      .lean();
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (role !== 'admin' && order.user?._id.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to access this order');
    }

    // Attach card state dynamically
    order.cardState = await OrderCardStateService.getCardState(order._id);
    return order;
  }

  /**
   * Fetch all orders for the authenticated user.
   */
  static async getMyOrders(userId: string, query: any) {
    const { page, limit, skip } = getPaginationOptions(query);
    const filter: any = {
      user: userId,
      $or: [
        { paymentMethod: 'cod' },
        { paymentStatus: { $nin: ['pending', 'processing', 'failed'] } },
      ],
    };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customOrderId', 'productSnapshot inspirationImages referenceImages files')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    // Attach card state to each order
    const ordersWithCardState = await Promise.all(
      orders.map(async (order: any) => {
        order.cardState = await OrderCardStateService.getCardState(order._id);
        return order;
      }),
    );

    return formatPaginationResponse(ordersWithCardState, total, page, limit);
  }

  /**
   * Fetch all invoice data (Admin).
   */
  static async getAllInvoices(query: any) {
    const { page, limit, skip } = getPaginationOptions(query);
    const filter: any = { orderStatus: { $nin: ['Cancelled'] } }; // Usually invoices for valid orders

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const invoices = orders.map((order: any) => ({
      orderId: order._id,
      invoiceNumber: order.invoiceNumber || order.invoice?.number || 'Not Generated',
      date: order.createdAt,
      customerName: (order.user as any)?.name || 'Unknown',
      customerEmail: (order.user as any)?.email || '',
      amount: order.total,
      paymentStatus: order.paymentStatus,
    }));

    return formatPaginationResponse(invoices, total, page, limit);
  }
}
