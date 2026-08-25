import logger from '../config/logger';
import { getActiveAdminEmailsFromDB } from '../config/adminConfig';
import crypto from 'crypto';
import { emailQueue, isQueuesReady, usingFallback } from '../jobs/queues';
import { emailQueue as fallbackQueue } from './emailQueueService';
import {
  buildOrderConfirmationCustomerEmail,
  buildOrderConfirmationAdminEmail,
  buildOrderStatusChangeEmail,
  buildPaymentFailedEmail,
  buildCustomOrderCustomerEmail,
  buildCustomOrderAdminEmail,
  buildCustomOrderStatusChangeEmail,
  buildInquiryCustomerEmail,
  buildInquiryAdminEmail,
  buildEventBookingCustomerEmail,
  buildEventBookingAdminEmail,
  buildReturnCreatedCustomerEmail,
  buildReturnStatusUpdateEmail,
} from '../utils/email/transactionalEmailTemplates';

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
  ) {
    if (!to) {
      logger.warn(`[EMAIL TRACE][ENQUEUE] skipped — no recipient for action=${action}`);
      return;
    }

    const emailOptions = {
      email: to,
      subject,
      customHtml: html,
      type,
      action,
      notificationKey, // For DB-level idempotency
    };

    const queueReady = isQueuesReady();
    logger.info(
      `[EMAIL TRACE][ENQUEUE][05] enqueue requested key=${notificationKey} queueReady=${queueReady} usingFallback=${usingFallback} queueType=${queueReady && !usingFallback ? 'bullmq' : 'fallback'}`,
    );

    try {
      if (queueReady) {
        // Queue-level idempotency
        const job = await emailQueue.add('sendEmail', emailOptions, { jobId: notificationKey });
        logger.info(
          `[EMAIL TRACE][ENQUEUE][06] queue.add returned jobId=${(job as any)?.id ?? 'NONE'} name=${(job as any)?.name ?? 'NONE'}`,
        );
      } else {
        // Fallback for local dev without Redis
        logger.info(
          `[EMAIL TRACE][ENQUEUE][06] using emailQueueService fallback (direct processor)`,
        );
        fallbackQueue.enqueue(emailOptions);
      }
    } catch (err: any) {
      logger.error(
        `[TransactionalEmailService] Failed to enqueue email for ${action}: ${err?.message}`,
        err,
      );
      // MINIMAL FIX: Route to fallback queue if BullMQ add fails (matches OTP behavior)
      fallbackQueue.enqueue(emailOptions);
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
      await this.enqueueEmail(
        customerEmail,
        subject,
        html,
        'order',
        'order_confirmation_customer',
        notificationKey,
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
    logger.info(`[TransactionalEmailService] Dispatching event booking emails for ${booking._id}`);

    // 1. Notify Customer
    const customerEmail = user?.email || booking.user?.email;
    if (customerEmail) {
      const { subject, html } = buildEventBookingCustomerEmail(booking, user);
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

  // ==========================================
  // RETURN & EXCHANGE EMAILS
  // ==========================================

  public static async sendReturnSubmittedEmails(returnRequest: any, user: any, eventId: string) {
    logger.info(
      `[TransactionalEmailService] Dispatching return created emails for ${returnRequest._id}`,
    );

    // 1. Notify Customer
    const customerEmail = user?.email;
    if (customerEmail) {
      const { subject, html } = buildReturnCreatedCustomerEmail(returnRequest, user);
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

    // 1. Notify Customer
    const customerEmail = user?.email;
    if (customerEmail) {
      const { subject, html } = buildReturnStatusUpdateEmail(
        returnRequest,
        user,
        previousStatus,
        newStatus,
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
}
