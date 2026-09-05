import logger from '../config/logger';
import { getActiveAdminEmailsFromDB } from '../config/adminConfig';
import crypto from 'crypto';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import {
  buildOrderConfirmationCustomerEmail,
  buildOrderConfirmationAdminEmail,
  buildRentalOrderCustomerEmail,
  buildRentalOrderAdminEmail,
  buildOrderStatusChangeEmail,
  buildPaymentFailedEmail,
  buildCustomOrderCustomerEmail,
  buildCustomOrderAdminEmail,
  buildCustomOrderStatusChangeEmail,
  buildInquiryCustomerEmail,
  buildInquiryAdminEmail,
  buildEventBookingInquiryEmail,
  buildEventBookingConfirmedEmail,
  buildEventBookingAdminEmail,
  buildEventBookingStatusUpdateEmail,
  buildReturnCreatedCustomerEmail,
  buildReturnStatusUpdateEmail,
  buildRentalStatusChangeEmail,
  buildRentalDepositRefundedEmail,
  buildRentalPaymentReceivedEmail,
} from '../utils/email/transactionalEmailTemplates';

import { sendDirectEmailProcessor } from './notificationService';

export class TransactionalEmailService {
  /**
   * Safe wrapper to enqueue an email for persistent delivery.
   * Uses outbox/queue so failures don't block the main thread.
   */
  private static async enqueueEmail(
    to: string,
    subject: string,
    html: string,
    type: 'order' | 'system' | 'engagement',
    action: string,
    notificationKey: string,
    attachments?: { filename: string; content: Buffer | string; contentType?: string }[],
  ) {
    if (!to) {
      logger.warn(`[EMAIL TRACE][ENQUEUE] skipped — no recipient for action=${action}`);
      return;
    }

    const emailOptions: any = {
      email: to,
      subject,
      customHtml: html,
      type,
      action,
      notificationKey, // For DB-level idempotency
    };

    if (attachments && attachments.length > 0) {
      emailOptions.attachments = attachments;
    }

    logger.info(`[EMAIL TRACE] Sending email directly (bypassing queue) for ${action} to ${to}`);

    try {
      // Await synchronous delivery to guarantee the mail is pushed to SMTP
      await sendDirectEmailProcessor(emailOptions);
    } catch (err: any) {
      logger.error(
        `[TransactionalEmailService] Failed to send email for ${action}: ${err?.message}`,
        err,
      );
      throw err; // Let OutboxProcessor handle the retry logic
    }
  }

  private static hashEmail(email: string) {
    return crypto.createHash('md5').update(email).digest('hex').substring(0, 8);
  }

  /**
   * Broadcasts an email to all active operational admins
   */
  private static async notifyAllAdmins(
    subject: string,
    html: string,
    action: string,
    outboxEventId: string,
    baseKey: string,
  ) {
    try {
      const adminEmails = await getActiveAdminEmailsFromDB();
      if (!adminEmails || adminEmails.length === 0) {
        logger.warn(`[TransactionalEmailService] No active admins found to notify for ${action}`);
        return;
      }

      for (const email of adminEmails) {
        const adminHash = this.hashEmail(email);
        const notificationKey = `${baseKey}:${outboxEventId}:ADMIN:${adminHash}`;
        await this.enqueueEmail(email, subject, html, 'system', action, notificationKey);
      }
    } catch (err) {
      logger.error(`[TransactionalEmailService] Failed to notify admins for ${action}:`, err);
    }
  }

  // ==========================================
  // ORDER EMAILS (COD & Online)
  // ==========================================

  public static async sendOrderPlacedEmails(order: any, user: any, eventId: string) {
    logger.info(`[TransactionalEmailService] Dispatching order placed emails for ${order._id}`);

    // 1. Notify Customer
    const customerEmail = user?.email || order.shippingAddress?.email;
    if (customerEmail) {
      const { subject, html } = buildOrderConfirmationCustomerEmail(order, user);
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `ORDER_CREATED:${eventId}:CUSTOMER:${customerHash}`;

      let attachments: any[] = [];
      try {
        const orderData = {
          orderId: order.orderUuid || order.orderNumber || order._id.toString(),
          date: order.createdAt || new Date(),
          customerName: user?.name || order.shippingAddress?.name || 'Customer',
          shippingAddress: order.shippingAddress
            ? `${order.shippingAddress.name}, ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`
            : 'Not Provided',
          items: order.items.map((i: any) => ({
            name: i.title || i.name || 'Item',
            quantity: i.quantity || 1,
            price: i.price || 0,
          })),
          subtotal: order.subtotal || 0,
          shipping: order.shippingFee || order.courierCharges || 0,
          total: order.total || 0,
          store: order.store,
          invoice: order.invoice,
        };
        const pdfBuffer = await generateInvoicePDF(orderData);
        attachments = [
          {
            filename: `Invoice_${orderData.orderId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ];
        logger.info(
          `[TransactionalEmailService] Successfully generated invoice PDF for ${order._id}`,
        );
      } catch (pdfErr) {
        logger.error(
          `[TransactionalEmailService] Failed to generate invoice PDF for ${order._id}:`,
          pdfErr,
        );
      }

      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'order_confirmation_customer',
        notificationKey,
        attachments,
      );
    }

    // 2. Notify Admins
    const adminTemplate = buildOrderConfirmationAdminEmail(order);
    await this.notifyAllAdmins(
      adminTemplate.subject,
      adminTemplate.html,
      'order_confirmation_admin',
      eventId,
      'ORDER_CREATED',
    );
  }

  public static async sendRentalOrderPlacedEmails(rentalOrder: any, user: any, eventId: string) {
    logger.info(
      `[TransactionalEmailService] Dispatching rental order placed emails for ${rentalOrder._id}`,
    );

    // 1. Notify Customer
    const customerEmail = user?.email || rentalOrder.shippingAddress?.email;
    if (customerEmail) {
      const { subject, html } = buildRentalOrderCustomerEmail(rentalOrder, user);
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `RENTAL_ORDER_CREATED:${eventId}:CUSTOMER:${customerHash}`;

      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'rental_order_confirmation_customer',
        notificationKey,
      );
    }

    // 2. Notify Admins
    const adminTemplate = buildRentalOrderAdminEmail(rentalOrder);
    await this.notifyAllAdmins(
      adminTemplate.subject,
      adminTemplate.html,
      'rental_order_confirmation_admin',
      eventId,
      'RENTAL_ORDER_CREATED',
    );
  }

  public static async sendPaymentSuccessEmails(order: any, user: any, eventId: string) {
    logger.info(`[TransactionalEmailService] Dispatching payment success emails for ${order._id}`);
    await this.sendOrderPlacedEmails(order, user, eventId);
  }

  public static async sendOrderStatusChangeEmail(
    order: any,
    user: any,
    oldStatus: string,
    newStatus: string,
    eventId: string,
  ) {
    logger.info(`[TransactionalEmailService] Dispatching status change email for ${order._id}`);
    const customerEmail = user?.email || order.shippingAddress?.email;
    if (customerEmail) {
      const { subject, html } = buildOrderStatusChangeEmail(order, oldStatus, newStatus);
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `ORDER_STATUS_UPDATED:${eventId}:CUSTOMER:${customerHash}`;
      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'order_status_change',
        notificationKey,
      );
    }

    // Admins only receive website notifications for status changes to prevent email spam.
    // The notification is handled by the outbox processor.
  }

  public static async sendPaymentFailedEmail(
    order: any,
    user: any,
    reason: string,
    eventId: string,
  ) {
    logger.info(`[TransactionalEmailService] Dispatching payment failed email for ${order._id}`);
    const customerEmail = user?.email || order.shippingAddress?.email;
    if (customerEmail) {
      const { subject, html } = buildPaymentFailedEmail(order, reason);
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `PAYMENT_FAILED:${eventId}:CUSTOMER:${customerHash}`;
      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'payment_failed',
        notificationKey,
      );
    }
  }

  // ==========================================
  // CUSTOM ORDER EMAILS
  // ==========================================

  public static async sendCustomOrderSubmissionEmails(order: any, eventId: string) {
    logger.info(
      `[TransactionalEmailService] Dispatching custom order submission emails for ${order._id}`,
    );

    // 1. Notify Customer
    if (order.customerEmail) {
      const { subject, html } = buildCustomOrderCustomerEmail(order);
      const customerHash = this.hashEmail(order.customerEmail);
      const notificationKey = `CUSTOM_ORDER_CREATED:${eventId}:CUSTOMER:${customerHash}`;
      await this.enqueueEmail(
        order.customerEmail,
        subject,
        html,
        'order',
        'custom_order_customer',
        notificationKey,
      );
    }

    // 2. Notify Admins
    const adminTemplate = buildCustomOrderAdminEmail(order);
    await this.notifyAllAdmins(
      adminTemplate.subject,
      adminTemplate.html,
      'custom_order_admin',
      eventId,
      'CUSTOM_ORDER_CREATED',
    );
  }

  public static async sendCustomOrderStatusChangeEmail(
    order: any,
    previousStatus: string,
    eventId: string,
  ) {
    logger.info(
      `[TransactionalEmailService] Dispatching custom order status change for ${order._id}`,
    );
    if (order.customerEmail) {
      const { subject, html } = buildCustomOrderStatusChangeEmail(order, previousStatus);
      const customerHash = this.hashEmail(order.customerEmail);
      const notificationKey = `CUSTOM_ORDER_STATUS_UPDATED:${eventId}:CUSTOMER:${customerHash}`;
      await this.enqueueEmail(
        order.customerEmail,
        subject,
        html,
        'order',
        'custom_order_status_change',
        notificationKey,
      );
    }
  }

  // ==========================================
  // INQUIRY EMAILS
  // ==========================================

  public static async sendInquiryEmails(inquiry: any, eventId: string) {
    logger.info(
      `[EMAIL TRACE][INQUIRY][04] sendInquiryEmails entered eventId=${eventId} customerRecipient=${!!inquiry.email}`,
    );

    // 1. Notify Customer
    if (inquiry.email) {
      const { subject, html } = buildInquiryCustomerEmail(inquiry);
      const customerHash = this.hashEmail(inquiry.email);
      const notificationKey = `INQUIRY_CREATED:${eventId}:CUSTOMER:${customerHash}`;
      logger.info(
        `[EMAIL TRACE][INQUIRY][04a] customer email: subjectLen=${subject?.length ?? 0} htmlLen=${html?.length ?? 0} key=${notificationKey}`,
      );
      await this.enqueueEmail(
        inquiry.email,
        subject,
        html,
        'engagement',
        'inquiry_customer',
        notificationKey,
      );
    }

    // 2. Notify Admins
    const adminEmails = await getActiveAdminEmailsFromDB();
    logger.info(`[EMAIL TRACE][INQUIRY][04b] adminRecipientCount=${adminEmails?.length ?? 0}`);
    const adminTemplate = buildInquiryAdminEmail(inquiry);
    await this.notifyAllAdmins(
      adminTemplate.subject,
      adminTemplate.html,
      'inquiry_admin',
      eventId,
      'INQUIRY_CREATED',
    );
  }

  // ==========================================
  // EVENT BOOKING EMAILS
  // ==========================================

  public static async sendEventBookingSubmissionEmails(booking: any, user: any, eventId: string) {
    logger.info(
      `[TransactionalEmailService] Dispatching event booking inquiry emails for ${booking._id}`,
    );

    // 1. Notify Customer
    const customerEmail = user?.email || booking.user?.email;
    if (customerEmail) {
      const { subject, html } = buildEventBookingInquiryEmail(booking, user);
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `EVENT_BOOKING_CREATED:${eventId}:CUSTOMER:${customerHash}`;
      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'event_booking_customer',
        notificationKey,
      );
    }

    // 2. Notify Admins
    const adminTemplate = buildEventBookingAdminEmail(booking, user);
    await this.notifyAllAdmins(
      adminTemplate.subject,
      adminTemplate.html,
      'event_booking_admin',
      eventId,
      'EVENT_BOOKING_CREATED',
    );
  }

  public static async sendEventBookingConfirmedEmails(booking: any, user: any, eventId: string) {
    logger.info(
      `[TransactionalEmailService] Dispatching event booking confirmed emails for ${booking._id}`,
    );

    // 1. Notify Customer
    const customerEmail = user?.email || booking.user?.email;
    if (customerEmail) {
      const { subject, html } = buildEventBookingConfirmedEmail(booking, user);
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `EVENT_BOOKING_CONFIRMED:${eventId}:CUSTOMER:${customerHash}`;
      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'event_booking_customer',
        notificationKey,
      );
    }
  }

  // ==========================================
  // RETURN & EXCHANGE EMAILS
  // ==========================================

  public static async sendReturnSubmittedEmails(returnRequest: any, user: any, eventId: string) {
    logger.info(
      `[TransactionalEmailService] Dispatching return created emails for ${returnRequest._id}`,
    );

    // Fetch the original order for the summary
    let order: any = null;
    try {
      const Order = require('../models/Order').default;
      order = await Order.findById(returnRequest.orderId).lean();
    } catch (err) {
      logger.warn(`Could not fetch order for return emails: ${err}`);
    }

    // 1. Notify Customer
    const customerEmail = user?.email;
    if (customerEmail) {
      const { subject, html } = buildReturnCreatedCustomerEmail(returnRequest, order, user);
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `RETURN_CREATED:${eventId}:CUSTOMER:${customerHash}`;
      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'return_created_customer',
        notificationKey,
      );
    }
  }

  public static async sendReturnStatusUpdateEmails(
    returnRequest: any,
    user: any,
    previousStatus: string,
    newStatus: string,
    eventId: string,
  ) {
    logger.info(
      `[TransactionalEmailService] Dispatching return status update emails for ${returnRequest._id}`,
    );

    // Fetch the original order for the summary
    let order: any = null;
    let exchange: any = null;
    try {
      const Order = require('../models/Order').default;
      order = await Order.findById(returnRequest.orderId).lean();

      if (returnRequest.returnType === 'exchange') {
        const ExchangeRequest = require('../models/ExchangeRequest').default;
        exchange = await ExchangeRequest.findOne({ returnRequestId: returnRequest._id }).lean();
      }
    } catch (err) {
      logger.warn(`Could not fetch order/exchange for return emails: ${err}`);
    }

    // 1. Notify Customer
    const customerEmail = user?.email;
    if (customerEmail) {
      const { subject, html } = buildReturnStatusUpdateEmail(
        returnRequest,
        order,
        user,
        previousStatus,
        newStatus,
        exchange,
      );
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `RETURN_STATUS_UPDATED:${eventId}:CUSTOMER:${customerHash}`;
      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'return_status_customer',
        notificationKey,
      );
    }
  }

  public static async sendEventBookingStatusUpdateEmail(
    booking: any,
    user: any,
    oldStatus: string,
    newStatus: string,
    eventId: string,
  ) {
    logger.info(
      `[TransactionalEmailService] Dispatching event booking status update emails for ${booking._id}`,
    );

    const customerEmail = user?.email || booking?.user?.email;
    if (customerEmail) {
      const { subject, html } = buildEventBookingStatusUpdateEmail(
        booking,
        user,
        oldStatus,
        newStatus,
      );
      const customerHash = this.hashEmail(customerEmail);
      const notificationKey = `EVENT_BOOKING_STATUS_UPDATED:${eventId}:CUSTOMER:${customerHash}`;

      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'event_booking_status_updated',
        notificationKey,
      );
    }
  }
  public static async sendRentalStatusUpdate(
    rentalOrder: any,
    oldStatus: string,
    newStatus: string,
  ) {
    try {
      const email = rentalOrder.user?.email || rentalOrder.shippingAddress?.email;
      if (!email) return;

      const { subject, html } = buildRentalStatusChangeEmail(rentalOrder, oldStatus, newStatus);
      const notificationKey = `rental_status_${rentalOrder._id}_${newStatus}`;

      await this.enqueueEmail(
        email,
        subject,
        html,
        'order',
        'rental_status_update',
        notificationKey,
      );
    } catch (error) {
      logger.error(
        `[EMAIL] Failed to send rental status update email for ${rentalOrder._id}`,
        error,
      );
    }
  }

  public static async sendRentalDepositRefunded(rentalOrder: any, refundData: any) {
    try {
      const email = rentalOrder.user?.email || rentalOrder.shippingAddress?.email;
      if (!email) return;

      const { subject, html } = buildRentalDepositRefundedEmail(rentalOrder, refundData);
      const notificationKey = `rental_deposit_refund_${rentalOrder._id}_${Date.now()}`;

      await this.enqueueEmail(
        email,
        subject,
        html,
        'order',
        'rental_deposit_refunded',
        notificationKey,
      );
    } catch (error) {
      logger.error(
        `[EMAIL] Failed to send rental deposit refund email for ${rentalOrder._id}`,
        error,
      );
    }
  }

  public static async sendRentalPaymentReceived(rentalOrder: any, paymentData: any) {
    try {
      const email = rentalOrder.user?.email || rentalOrder.shippingAddress?.email;
      if (!email) return;

      const { subject, html } = buildRentalPaymentReceivedEmail(rentalOrder, paymentData);
      const notificationKey = `rental_payment_${rentalOrder._id}_${Date.now()}`;

      await this.enqueueEmail(
        email,
        subject,
        html,
        'order',
        'rental_payment_received',
        notificationKey,
      );
    } catch (error) {
      logger.error(`[EMAIL] Failed to send rental payment email for ${rentalOrder._id}`, error);
    }
  }
}
