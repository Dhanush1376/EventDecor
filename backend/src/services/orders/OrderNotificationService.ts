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

      // Base context for templates
      const context = {
        customerName: user.name,
        orderId: order._id.toString(),
        orderDate: order.createdAt || new Date().toISOString(),
        paymentMethod:
          order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment (Razorpay)',
        items: order.items.map((i: any) => ({
          name: i.title,
          variant: i.variant,
          quantity: i.quantity,
          price: i.price,
          image: i.imageSrc,
        })),
        subtotal: order.subtotal,
        shipping: order.shippingFee,
        total: order.total,
        shippingAddress:
          typeof order.shippingAddress === 'string'
            ? order.shippingAddress
            : order.shippingAddress?.address || '',
        dashboardUrl: `${frontendUrl}/dashboard?tab=orders`,
        currentYear: new Date().getFullYear(),
        invoiceNumber: order.invoiceNumber,
      };

      // Dispatch to customer
      await emailQueue.add('orderConfirmationEmail', {
        to: user.email,
        subject: `Order Confirmed: #${order._id}`,
        template: 'order-confirmation',
        context,
        generatePdf: true,
      });

      const itemTitle = order.items && order.items.length > 0 ? order.items[0].title : 'Items';
      const moreCount =
        order.items && order.items.length > 1 ? ` +${order.items.length - 1} more` : '';
      const productName = `${itemTitle}${moreCount}`;
      const customerName =
        user.name ||
        (typeof order.shippingAddress === 'object' ? order.shippingAddress.name : '') ||
        'A customer';
      const adminSubject = `[New Order] ${productName} placed by ${customerName}`;

      // Dispatch to admins
      if (adminEmails && adminEmails.length > 0) {
        await emailQueue.add('adminOrderAlertEmail', {
          to: adminEmails[0],
          subject: adminSubject,
          template: 'order-confirmation',
          context,
          generatePdf: true,
        });
      }

      // Admin UI Notification
      await notificationQueue.add('adminNotification', {
        title: adminSubject,
        message: `${user.name || 'A customer'} placed a new order (₹${order.total}).`,
        type: 'order',
        actionLink: `/admin/orders/${order._id}`,
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
