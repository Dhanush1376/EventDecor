import { emailQueue, notificationQueue } from '../../jobs/queues';
import logger from '../../config/logger';
import { getFrontendUrl } from '../../utils/getFrontendUrl';

export class OrderNotificationService {
  /**
   * Enqueues the PDF generation and Email dispatch for a successful order.
   */
  static async dispatchOrderConfirmation(order: any, user: any, adminEmails: string[]) {
    try {
      const frontendUrl = getFrontendUrl();

      const itemTitle =
        order.items && order.items.length > 0
          ? order.items[0].title ||
            order.items[0].name ||
            order.items[0].showcaseTitle ||
            order.items[0].productTitle ||
            'Product'
          : 'Order';
      const moreCount =
        order.items && order.items.length > 1 ? ` (+${order.items.length - 1} more)` : '';
      const productName = `${itemTitle}${moreCount}`;
      const customerName =
        user?.name ||
        (typeof order.shippingAddress === 'object' ? order.shippingAddress.name : '') ||
        'A customer';
      const displayInvoice =
        order.invoice?.number ||
        order.invoiceNumber ||
        (order._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : 'Confirmed');

      // Base context for templates
      const context = {
        customerName:
          user?.name ||
          (typeof order.shippingAddress === 'object' ? order.shippingAddress.name : '') ||
          'Customer',
        customerEmail: user?.email,
        customerPhone:
          user?.phone ||
          (typeof order.shippingAddress === 'object' ? order.shippingAddress.phone : ''),
        orderId: displayInvoice,
        rawOrderId: order._id.toString(),
        orderDate: order.createdAt || new Date().toISOString(),
        paymentMethod:
          order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment (Razorpay)',
        items: order.items.map((i: any) => ({
          name: i.title || i.name,
          variant: i.variant,
          quantity: i.quantity,
          price: i.price,
          image: i.imageSrc,
        })),
        subtotal: order.subtotal,
        shipping: order.shippingFee || order.courierCharges || 0,
        total: order.total,
        shippingAddress: order.shippingAddress,
        dashboardUrl: `${frontendUrl}/dashboard?tab=orders`,
        currentYear: new Date().getFullYear(),
        invoiceNumber: displayInvoice,
        store: order.store,
        tax: order.tax,
        invoice: order.invoice,
        trackingNumber: order.trackingNumber,
      };

      // Dispatch to customer (only if they have an email)
      if (user?.email) {
        await emailQueue.add('orderConfirmationEmail', {
          to: user.email,
          subject: `Order Confirmed: ${productName} (${displayInvoice})`,
          template: 'order-confirmation',
          context,
        });
      }

      const adminSubject = `[New Order] ${productName} placed by ${customerName}`;

      // Dispatch to admins
      if (adminEmails && adminEmails.length > 0) {
        await emailQueue.add('adminOrderAlertEmail', {
          to: adminEmails[0],
          subject: adminSubject,
          template: 'order-confirmation',
          context,
        });
      }

      // Admin UI Notification
      await notificationQueue.add('adminNotification', {
        title: adminSubject,
        message: `${user.name || 'A customer'} placed a new order (₹${order.total}).`,
        type: 'order',
        actionLink: `/admin/orders/${order._id}`,
        metadata: {
          image: order.items && order.items.length > 0 ? order.items[0].imageSrc : null,
        },
      });
    } catch (err) {
      logger.error('Failed to enqueue order confirmation notifications:', err);
    }
  }

  /**
   * Enqueues an email for failed payments or cancelled orders.
   */
  static async dispatchOrderFailure(order: any, user: any, reason: string) {
    try {
      if (!user.email) {
        logger.info(`[ORDER NOTIFICATION] Skipping failure email — user ${user._id} has no email`);
        return;
      }
      await emailQueue.add('orderFailureEmail', {
        to: user.email,
        subject: `Payment Failed for Order #${order._id}`,
        template: 'order-failed',
        context: {
          customerName: user.name,
          orderId: order._id.toString(),
          reason,
          total: order.total,
        },
      });
    } catch (err) {
      logger.error('Failed to enqueue order failure notifications:', err);
    }
  }
}
