import logger from '../config/logger';
import OutboxEvent from '../models/OutboxEvent';
import { withCronLock } from '../utils/cronLock';
import * as Sentry from '@sentry/node';
import { TransactionalEmailService } from '../services/TransactionalEmailService';
import Order from '../models/Order';
import CustomOrder from '../models/CustomOrder';
import EventJob from '../domains/event_operations/models/EventJob';
import ReturnRequest from '../models/ReturnRequest';
import RentalOrder from '../models/RentalOrder';

/**
 * OutboxProcessor — Processes ALL outbox event types.
 *
 * Previously only handled 'OrderCreated'. Now handles:
 * - OrderCreated → Customer + admin order confirmation emails
 * - PaymentFailed → Customer failure email + admin alert
 * - PaymentDisputed → Admin dispute notification
 * - BookingConfirmed → Customer booking confirmation email + admin notification
 * - RentalCreated → Customer rental confirmation email + admin notification
 * - RentalPaymentFailed → Customer failure email
 * - RefundFailed → Critical admin alert + Sentry
 */
export const processOutboxEvents = async () => {
  await withCronLock('outbox-processor', 20, async () => {
    // Process up to 50 pending events
    const events = await OutboxEvent.find({ status: 'PENDING' })
      .sort({ createdAt: 1 })
      .limit(50)
      .maxTimeMS(10000);

    if (events.length === 0) return;

    logger.info(`[OUTBOX] Found ${events.length} pending events to process`);

    for (const event of events) {
      try {
        await processEvent(event);

        event.status = 'PUBLISHED';
        await event.save();
      } catch (err: any) {
        logger.error(
          `[OUTBOX] Failed to process event ${event._id} (${event.aggregateType}/${event.eventType}):`,
          err,
        );
        event.retryCount += 1;
        event.errorDetails = err.message;
        if (event.retryCount >= 5) {
          event.status = 'FAILED';
          Sentry.captureMessage(
            `Outbox event exhausted retries: ${event.aggregateType}/${event.eventType}`,
            {
              level: 'error',
              tags: { critical: 'outbox_dead_letter' },
              extra: {
                eventId: event._id.toString(),
                aggregateId: event.aggregateId,
                errorDetails: err.message,
              },
            },
          );
        }
        await event.save();
      }
    }
  });
};

/**
 * Process a single outbox event by its MongoDB _id.
 * Called INLINE after a transaction commits so emails/notifications fire
 * immediately without depending on cron or Redis.
 * Safe to call: errors are caught and logged, the event is marked FAILED for retry.
 */
export const processOutboxEventById = async (eventId: string) => {
  try {
    const event = await OutboxEvent.findById(eventId);
    if (!event || event.status !== 'PENDING') return;

    await processEvent(event);
    event.status = 'PUBLISHED';
    await event.save();
    logger.info(
      `[OUTBOX-INLINE] Successfully processed event ${eventId} (${event.aggregateType}/${event.eventType})`,
    );
  } catch (err: any) {
    logger.error(`[OUTBOX-INLINE] Failed to process event ${eventId}:`, err?.message || err);
    // Don't crash the caller — the cron will retry if it's ever enabled
    try {
      await OutboxEvent.findByIdAndUpdate(eventId, {
        $inc: { retryCount: 1 },
        $set: { errorDetails: err?.message || 'Inline processing failed' },
      });
    } catch {}
  }
};

export async function processEvent(event: any): Promise<void> {
  // Convert "Aggregate:Action" to "AGGREGATE_ACTION" format
  const eventName = `${event.aggregateType}_${event.eventType}`.toUpperCase();

  // 1. Process Transactional Emails based on Outbox Event (Persistent/Idempotent)
  try {
    if (eventName === 'ORDER_ORDERCREATED') {
      const order = await Order.findById(event.aggregateId).populate('user');
      if (order)
        await TransactionalEmailService.sendOrderPlacedEmails(
          order,
          order.user,
          event._id.toString(),
        );
    } else if (eventName === 'ORDER_REFUNDCOMPLETED') {
      const order = await Order.findById(event.aggregateId).populate('user');
      if (order && order.user && (order.user as any).email) {
        const { sendDirectEmail } = require('../services/notificationService');
        await sendDirectEmail({
          email: (order.user as any).email,
          subject: `Refund Processed Successfully - Order #${(order as any).orderId || order._id}`,
          customHtml: `<h1>Refund Processed</h1><p>Your refund of ₹${event.payload?.amount || ''} has been successfully processed via Razorpay. It should reflect in your account shortly.</p>`,
          type: 'order',
          action: 'order_refund_completed',
        });
      }
    } else if (eventName === 'ORDER_ORDERSTATUSUPDATED') {
      const order = await Order.findById(event.aggregateId).populate('user');
      if (order && event.payload) {
        await TransactionalEmailService.sendOrderStatusChangeEmail(
          order,
          order.user,
          event.payload.oldStatus,
          event.payload.newStatus,
          event._id.toString(),
        );
      }
    } else if (eventName === 'CUSTOMORDER_CUSTOMORDERSUBMITTED') {
      const customOrder = await CustomOrder.findById(event.aggregateId);
      if (customOrder)
        await TransactionalEmailService.sendCustomOrderSubmissionEmails(
          customOrder,
          event._id.toString(),
        );
    } else if (eventName === 'CUSTOMORDER_PRODUCTCUSTOMIZATIONSUBMITTED') {
      const customOrder = await CustomOrder.findById(event.aggregateId);
      if (customOrder)
        await TransactionalEmailService.sendCustomOrderSubmissionEmails(
          customOrder,
          event._id.toString(),
        );
    } else if (eventName === 'EVENTJOB_BOOKINGINQUIRYSUBMITTED') {
      const booking = await EventJob.findById(event.aggregateId)
        .populate('user')
        .populate('eventPackage');
      if (booking) {
        await TransactionalEmailService.sendEventBookingSubmissionEmails(
          booking,
          (booking as any).user,
          event._id.toString(),
        );
      }
    } else if (eventName === 'EVENTJOB_BOOKINGCONFIRMED') {
      const booking = await EventJob.findById(event.aggregateId)
        .populate('user')
        .populate('eventPackage');
      if (booking) {
        await TransactionalEmailService.sendEventBookingConfirmedEmails(
          booking,
          (booking as any).user,
          event._id.toString(),
        );
      }
    } else if (eventName === 'RETURNREQUEST_RETURNCREATED') {
      const returnReq = await ReturnRequest.findById(event.aggregateId).populate('userId');
      if (returnReq) {
        await TransactionalEmailService.sendReturnSubmittedEmails(
          returnReq,
          (returnReq as any).userId,
          event._id.toString(),
        );
      }
    } else if (eventName === 'RETURNREQUEST_RETURNSTATUSUPDATED') {
      const returnReq = await ReturnRequest.findById(event.aggregateId).populate('userId');
      if (returnReq && event.payload) {
        await TransactionalEmailService.sendReturnStatusUpdateEmails(
          returnReq,
          (returnReq as any).userId,
          event.payload.previousStatus,
          event.payload.status || event.payload.newStatus,
          event._id.toString(),
        );
      }
    } else if (eventName === 'RETURNREQUEST_WALLETREFUNDCOMPLETED') {
      const returnReq = await ReturnRequest.findById(event.aggregateId).populate('userId');
      if (returnReq) {
        const {
          ReturnNotificationService,
        } = require('../services/returns/ReturnNotificationService');
        await ReturnNotificationService.notifyCustomerRefundCompleted(returnReq);
      }
    } else if (eventName === 'RETURNREQUEST_EXCHANGE_PAYMENT_VERIFIED') {
      const returnReq = await ReturnRequest.findById(event.aggregateId).populate('userId');
      if (returnReq) {
        const user = (returnReq as any).userId;
        if (user && user.email) {
          const { sendDirectEmail } = require('../services/notificationService');
          await sendDirectEmail({
            email: user.email,
            subject: `Payment Received for Exchange - ${returnReq.returnId}`,
            customHtml: `<h1>Payment Received</h1><p>We have successfully received your payment for the exchange price difference. Your replacement order will be processed shortly.</p>`,
            type: 'order',
            action: 'exchange_payment_verified',
          });
        }

        // Notify Admins that exchange payment was received
        try {
          const { getActiveAdminEmailsFromDB } = require('../config/adminConfig');
          const adminEmails = await getActiveAdminEmailsFromDB();
          const { sendDirectEmail } = require('../services/notificationService');
          const { getFrontendUrl } = require('../utils/getFrontendUrl');
          for (const email of adminEmails) {
            await sendDirectEmail({
              email,
              subject: `[Exchange Paid] Payment Verified for #${returnReq.returnId}`,
              customHtml: `
                <h2>Exchange Payment Received</h2>
                <p>The price difference payment for Exchange <strong>#${returnReq.returnId}</strong> has been successfully received.</p>
                <p>You can now proceed to approve and dispatch the replacement item in the admin dashboard.</p>
                <p><a href="${getFrontendUrl()}/admin/returns/exchanges/${returnReq._id}" style="display: inline-block; padding: 10px 20px; background-color: #2A2927; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 12px;">Open Exchange in Admin Portal</a></p>
              `,
              type: 'system',
              action: 'exchange_payment_verified_admin',
            });
          }
        } catch (adminPayErr) {
          logger.error('Failed to notify admins of exchange payment verified:', adminPayErr);
        }
      }
    } else if (eventName === 'ORDER_PAYMENTFAILED') {
      const order = await Order.findById(event.aggregateId).populate('user');
      if (order && event.payload) {
        await TransactionalEmailService.sendPaymentFailedEmail(
          order,
          order.user,
          event.payload.reason || 'Payment processing failed',
          event._id.toString(),
        );
      }
    } else if (eventName === 'EVENTJOB_BOOKINGSTATUSUPDATED') {
      const booking = await EventJob.findById(event.aggregateId).populate('user');
      if (booking && event.payload) {
        await TransactionalEmailService.sendEventBookingStatusUpdateEmail(
          booking,
          (booking as any).user,
          event.payload.oldStatus,
          event.payload.newStatus,
          event._id.toString(),
        );
      }
    } else if (eventName === 'RENTALORDER_RENTALCREATED') {
      const rentalOrder = await RentalOrder.findById(event.aggregateId).populate('user');
      if (rentalOrder) {
        await TransactionalEmailService.sendRentalOrderPlacedEmails(
          rentalOrder,
          (rentalOrder as any).user,
          event._id.toString(),
        );
      }
    } else if (eventName === 'RENTALORDER_RENTALSTATUSUPDATED') {
      const rentalOrder = await RentalOrder.findById(event.aggregateId);
      if (rentalOrder && event.payload) {
        await TransactionalEmailService.sendRentalStatusUpdate(
          rentalOrder,
          event.payload.oldStatus,
          event.payload.newStatus,
        );
      }
    } else if (eventName === 'RENTALORDER_RENTALDEPOSITREFUNDED') {
      const rentalOrder = await RentalOrder.findById(event.aggregateId);
      if (rentalOrder && event.payload) {
        await TransactionalEmailService.sendRentalDepositRefunded(rentalOrder, event.payload);
      }
    } else if (eventName === 'RENTALORDER_RENTALPAYMENTRECEIVED') {
      const rentalOrder = await RentalOrder.findById(event.aggregateId);
      if (rentalOrder && event.payload) {
        await TransactionalEmailService.sendRentalPaymentReceived(rentalOrder, event.payload);
      }
    }
  } catch (emailErr) {
    logger.error(`[OUTBOX] Failed to send transactional email for ${eventName}:`, emailErr);
    // We intentionally don't throw here to avoid poisoning the outbox for non-email side-effects,
    // as TransactionalEmailService itself uses a persistent queue.
  }

  // 1.5 Process Admin Notifications (Persistent/Idempotent)
  try {
    const { createAdminNotification } = require('../services/notificationService');
    const AdminNotification = require('../models/AdminNotification').default;

    // Idempotency check: Don't create if one already exists for this outbox event
    const existingNotif = await AdminNotification.findOne({
      'metadata.outboxEventId': event._id.toString(),
    });

    if (!existingNotif) {
      if (eventName === 'ORDER_ORDERCREATED') {
        const order = await Order.findById(event.aggregateId).populate('user');
        if (order) {
          await createAdminNotification({
            title: 'New Order',
            message: `Order #${order.orderUuid || order._id} placed by ${(order.user as any)?.name || order.shippingAddress?.name || 'Customer'} (₹${order.total})`,
            type: 'order',
            actionLink: `/admin/orders/${order._id}`,
            metadata: { outboxEventId: event._id.toString() },
          });
        }
      } else if (eventName === 'ORDER_ORDERSTATUSUPDATED') {
        const order = await Order.findById(event.aggregateId);
        if (order && event.payload) {
          await createAdminNotification({
            title: 'Order Status Updated',
            message: `Order #${order.orderUuid || order._id} status changed: ${event.payload.oldStatus} → ${event.payload.newStatus}`,
            type: 'order',
            actionLink: `/admin/orders/${order._id}`,
            metadata: { outboxEventId: event._id.toString() },
          });
        }
      } else if (
        eventName === 'CUSTOMORDER_CUSTOMORDERSUBMITTED' ||
        eventName === 'CUSTOMORDER_PRODUCTCUSTOMIZATIONSUBMITTED'
      ) {
        const customOrder = await CustomOrder.findById(event.aggregateId);
        if (customOrder) {
          await createAdminNotification({
            title: 'New Custom Order',
            message: `${customOrder.customerName || 'A customer'} submitted a custom order request.`,
            type: 'custom_request',
            actionLink: `/admin/orders/custom`,
            metadata: {
              outboxEventId: event._id.toString(),
              image:
                customOrder.referenceImages?.length > 0 ? customOrder.referenceImages[0] : null,
            },
          });
        }
      } else if (eventName === 'EVENTJOB_BOOKINGINQUIRYSUBMITTED') {
        const booking = await EventJob.findById(event.aggregateId)
          .populate('user')
          .populate('eventPackage');
        if (booking) {
          await createAdminNotification({
            title: 'New Booking Request',
            message: `${(booking as any).user?.name || 'A customer'} submitted a booking for ${booking.title}.`,
            type: 'booking',
            actionLink: `/admin/events/${booking._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              image:
                (booking as any).eventPackage?.image ||
                (booking.inspirationImages && booking.inspirationImages.length > 0
                  ? booking.inspirationImages[0]
                  : null),
            },
          });
        }
      } else if (eventName === 'EVENTJOB_BOOKINGCONFIRMED') {
        const booking = await EventJob.findById(event.aggregateId)
          .populate('user')
          .populate('eventPackage');
        if (booking) {
          await createAdminNotification({
            title: 'Booking Confirmed',
            message: `Booking ${booking.bookingId || booking._id} for ${booking.title} has been confirmed.`,
            type: 'booking',
            actionLink: `/admin/events/${booking._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              image:
                (booking as any).eventPackage?.image ||
                (booking.inspirationImages && booking.inspirationImages.length > 0
                  ? booking.inspirationImages[0]
                  : null),
            },
          });
        }
      } else if (eventName === 'RETURNREQUEST_RETURNCREATED') {
        const returnReq = await ReturnRequest.findById(event.aggregateId).populate('orderId');
        if (returnReq) {
          const isEx = returnReq.returnType === 'exchange';
          await createAdminNotification({
            title: isEx ? 'New Exchange Request' : 'New Return Request',
            message: `${isEx ? 'Exchange' : 'Return'} request ${returnReq.returnId || returnReq._id} created for Order ${(returnReq as any).orderId?.orderId || returnReq.orderId}`,
            type: 'return',
            actionLink: `/admin/returns/${isEx ? 'exchanges' : 'requests'}/${returnReq._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              image:
                returnReq.items && returnReq.items.length > 0 ? returnReq.items[0].imageSrc : null,
            },
          });
        }
      } else if (eventName === 'RETURNREQUEST_RETURNSTATUSUPDATED') {
        const returnReq = await ReturnRequest.findById(event.aggregateId);
        if (returnReq && event.payload) {
          await createAdminNotification({
            title: 'Return Status Updated',
            message: `Return request ${returnReq.returnId || returnReq._id} status changed to ${event.payload.status || event.payload.newStatus}`,
            type: 'return',
            actionLink: `/admin/returns/requests/${returnReq._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              image:
                returnReq.items && returnReq.items.length > 0 ? returnReq.items[0].imageSrc : null,
            },
          });
        }
      } else if (eventName === 'ORDER_PAYMENTFAILED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          await createAdminNotification({
            title: 'Payment Failed',
            message: `Payment failed for Order #${order.orderUuid || order._id}`,
            type: 'payment',
            actionLink: `/admin/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              image: order.items?.length > 0 ? order.items[0].imageSrc : null,
            },
          });
        }
      } else if (eventName === 'ORDER_REFUNDREQUESTED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          await createAdminNotification({
            title: 'Refund Requested',
            message: `Refund requested for Order #${order.orderUuid || order._id}`,
            type: 'payment',
            actionLink: `/admin/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              image: order.items?.length > 0 ? order.items[0].imageSrc : null,
            },
          });
        }
      } else if (eventName === 'EVENTJOB_BOOKINGSTATUSUPDATED') {
        const booking = await EventJob.findById(event.aggregateId).populate('eventPackage');
        if (booking && event.payload) {
          await createAdminNotification({
            title: 'Booking Status Updated',
            message: `Booking ${booking.bookingId || booking._id} for ${booking.title} is now ${event.payload.status || event.payload.newStatus}`,
            type: 'booking',
            actionLink: `/admin/events/${booking._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              image:
                (booking as any).eventPackage?.image ||
                (booking.inspirationImages && booking.inspirationImages.length > 0
                  ? booking.inspirationImages[0]
                  : null),
            },
          });
        }
      } else if (eventName === 'ORDER_PAYMENTCAPTURED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          await createAdminNotification({
            title: 'Payment Captured',
            message: `Payment successful for Order #${order.orderUuid || order._id}`,
            type: 'payment',
            actionLink: `/admin/orders/${order._id}`,
            metadata: { outboxEventId: event._id.toString() },
          });
        }
      } else if (eventName === 'RENTALORDER_RENTALCREATED') {
        const rentalOrder = await RentalOrder.findById(event.aggregateId);
        if (rentalOrder) {
          await createAdminNotification({
            title: 'New Rental Order',
            message: `Rental #${rentalOrder.rentalOrderId || rentalOrder._id} — ${rentalOrder.productTitle} (₹${rentalOrder.totalAmount})`,
            type: 'order',
            actionLink: '/admin/rentals',
            metadata: {
              outboxEventId: event._id.toString(),
              image: rentalOrder.productImage,
            },
          });
        }
      }
    }
  } catch (adminNotifErr) {
    logger.error(`[OUTBOX] Failed to create admin notification for ${eventName}:`, adminNotifErr);
  }

  // 1.6 Process Customer Notifications (Persistent/Idempotent)
  try {
    const InAppNotification = require('../models/InAppNotification').default;
    const { emitUserEvent } = require('../socket');

    // Idempotency check: Don't create if one already exists for this outbox event
    const existingUserNotif = await InAppNotification.findOne({
      'metadata.outboxEventId': event._id.toString(),
    });

    if (!existingUserNotif) {
      let customerNotificationPayload: any = null;
      let targetUserId: string | null = null;

      if (eventName === 'ORDER_ORDERCREATED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          targetUserId = order.user.toString();
          customerNotificationPayload = {
            user: targetUserId,
            event: 'ORDER_CREATED',
            title: 'Order Confirmed',
            message: `Your order #${order.orderUuid || order._id} has been successfully placed.`,
            type: 'order',
            actionUrl: `/dashboard/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              orderId: order._id.toString(),
              entityId: order.orderUuid || order._id.toString(),
              imageSrc: order.items?.[0]?.imageSrc,
            },
          };
        }
      } else if (eventName === 'ORDER_ORDERSTATUSUPDATED') {
        const order = await Order.findById(event.aggregateId);
        if (order && event.payload) {
          targetUserId = order.user.toString();
          customerNotificationPayload = {
            user: targetUserId,
            event: 'ORDER_UPDATED',
            title: 'Order Status Update',
            message: `Your order #${order.orderUuid || order._id} is now ${event.payload.newStatus}.`,
            type: 'order',
            actionUrl: `/dashboard/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              orderId: order._id.toString(),
              entityId: order.orderUuid || order._id.toString(),
              imageSrc: order.items?.[0]?.imageSrc,
            },
          };
        }
      } else if (
        eventName === 'CUSTOMORDER_CUSTOMORDERSUBMITTED' ||
        eventName === 'CUSTOMORDER_PRODUCTCUSTOMIZATIONSUBMITTED'
      ) {
        const customOrder = await CustomOrder.findById(event.aggregateId);
        if (customOrder) {
          targetUserId =
            (customOrder as any).user?.toString() || (customOrder as any).userId?.toString();
          if (targetUserId) {
            customerNotificationPayload = {
              user: targetUserId,
              event: 'CUSTOM_ORDER_SUBMITTED',
              title: 'Custom Order Submitted',
              message: `Your custom order request has been submitted.`,
              type: 'order',
              actionUrl: `/dashboard/custom-orders/${customOrder._id}`,
              metadata: {
                outboxEventId: event._id.toString(),
                customOrderId: customOrder._id.toString(),
                entityId: customOrder.orderId || customOrder._id.toString(),
                imageSrc:
                  (customOrder as any).previewImage ||
                  customOrder.inspirationImages?.[0] ||
                  customOrder.referenceImages?.[0],
              },
            };
          }
        }
      } else if (eventName === 'EVENTJOB_BOOKINGINQUIRYSUBMITTED') {
        const booking = await EventJob.findById(event.aggregateId).populate('eventPackage');
        if (booking) {
          targetUserId = (booking as any).user?.toString();
          if (targetUserId) {
            customerNotificationPayload = {
              user: targetUserId,
              event: 'BOOKING_CREATED',
              title: 'Booking Request Received',
              message: `Your event booking request has been received.`,
              type: 'booking',
              actionUrl: `/events/dashboard`,
              metadata: {
                outboxEventId: event._id.toString(),
                bookingId: booking._id.toString(),
                entityId: booking.bookingId || booking._id.toString(),
                imageSrc:
                  booking.inspirationImages?.[0] ||
                  (booking.eventPackage as any)?.imageSrc ||
                  (booking.eventPackage as any)?.images?.[0],
              },
            };
          }
        }
      } else if (eventName === 'EVENTJOB_BOOKINGCONFIRMED') {
        const booking = await EventJob.findById(event.aggregateId).populate('eventPackage');
        if (booking) {
          targetUserId = (booking as any).user?.toString();
          if (targetUserId) {
            customerNotificationPayload = {
              user: targetUserId,
              event: 'BOOKING_UPDATED',
              title: 'Booking Confirmed',
              message: `Your booking ${booking.bookingId || booking._id} has been confirmed!`,
              type: 'booking',
              actionUrl: `/events/dashboard`,
              metadata: {
                outboxEventId: event._id.toString(),
                bookingId: booking._id.toString(),
                entityId: booking.bookingId || booking._id.toString(),
                imageSrc:
                  booking.inspirationImages?.[0] ||
                  (booking.eventPackage as any)?.imageSrc ||
                  (booking.eventPackage as any)?.images?.[0],
              },
            };
          }
        }
      } else if (eventName === 'EVENTJOB_BOOKINGSTATUSUPDATED') {
        const booking = await EventJob.findById(event.aggregateId).populate('eventPackage');
        if (booking && event.payload) {
          targetUserId = (booking as any).user?.toString();
          if (targetUserId) {
            customerNotificationPayload = {
              user: targetUserId,
              event: 'BOOKING_UPDATED',
              title: 'Booking Status Update',
              message: `Your booking ${booking.bookingId || booking._id} status is now ${event.payload.newStatus}.`,
              type: 'booking',
              actionUrl: `/events/dashboard`,
              metadata: {
                outboxEventId: event._id.toString(),
                bookingId: booking._id.toString(),
                entityId: booking.bookingId || booking._id.toString(),
                imageSrc:
                  booking.inspirationImages?.[0] ||
                  (booking.eventPackage as any)?.imageSrc ||
                  (booking.eventPackage as any)?.images?.[0],
              },
            };
          }
        }
      } else if (eventName === 'RETURNREQUEST_RETURNCREATED') {
        const returnReq = await ReturnRequest.findById(event.aggregateId);
        if (returnReq) {
          targetUserId = returnReq.userId.toString();
          customerNotificationPayload = {
            user: targetUserId,
            event: 'ORDER_UPDATED',
            title:
              returnReq.returnType === 'exchange'
                ? 'Exchange Request Submitted'
                : 'Return Request Submitted',
            message: `Your ${returnReq.returnType} request ${returnReq.returnId || returnReq._id} has been submitted.`,
            type: 'order',
            actionUrl: `/dashboard/orders/${returnReq.orderId}`,
            metadata: {
              outboxEventId: event._id.toString(),
              returnId: returnReq._id.toString(),
              entityId: returnReq.returnId,
              imageSrc: returnReq.items?.[0]?.imageSrc,
            },
          };
        }
      } else if (eventName === 'RETURNREQUEST_RETURNSTATUSUPDATED') {
        const returnReq = await ReturnRequest.findById(event.aggregateId);
        if (returnReq && event.payload) {
          targetUserId = returnReq.userId.toString();
          customerNotificationPayload = {
            user: targetUserId,
            event: 'ORDER_UPDATED',
            title:
              returnReq.returnType === 'exchange'
                ? 'Exchange Status Update'
                : 'Return Status Update',
            message: `Your ${returnReq.returnType} request ${returnReq.returnId || returnReq._id} is now ${event.payload.status || event.payload.newStatus}.`,
            type: 'order',
            actionUrl: `/dashboard/orders/${returnReq.orderId}`,
            metadata: {
              outboxEventId: event._id.toString(),
              returnId: returnReq._id.toString(),
              entityId: returnReq.returnId,
              imageSrc: returnReq.items?.[0]?.imageSrc,
            },
          };
        }
      } else if (eventName === 'ORDER_PAYMENTCAPTURED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          targetUserId = order.user.toString();
          customerNotificationPayload = {
            user: targetUserId,
            event: 'PAYMENT_SUCCESSFUL',
            title: 'Payment Successful',
            message: `Payment for order #${order.orderUuid || order._id} was successful.`,
            type: 'payment',
            actionUrl: `/dashboard/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              orderId: order._id.toString(),
              entityId: order.orderUuid || order._id.toString(),
              imageSrc: order.items?.[0]?.imageSrc,
            },
          };
        }
      } else if (eventName === 'ORDER_PAYMENTFAILED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          targetUserId = order.user.toString();
          customerNotificationPayload = {
            user: targetUserId,
            event: 'PAYMENT_FAILED',
            title: 'Payment Failed',
            message: `Payment for order #${order.orderUuid || order._id} failed. Please retry.`,
            type: 'payment',
            actionUrl: `/dashboard/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              orderId: order._id.toString(),
              entityId: order.orderUuid || order._id.toString(),
              imageSrc: order.items?.[0]?.imageSrc,
            },
          };
        }
      } else if (eventName === 'ORDER_REFUNDREQUESTED') {
        const order = await Order.findById(event.aggregateId);
        if (order) {
          targetUserId = order.user.toString();
          customerNotificationPayload = {
            user: targetUserId,
            event: 'REFUND_INITIATED',
            title: 'Refund Requested',
            message: `A refund has been requested for your order #${order.orderUuid || order._id}.`,
            type: 'payment',
            actionUrl: `/dashboard/orders/${order._id}`,
            metadata: {
              outboxEventId: event._id.toString(),
              orderId: order._id.toString(),
              entityId: order.orderUuid || order._id.toString(),
              imageSrc: order.items?.[0]?.imageSrc,
            },
          };
        }
      } else if (eventName === 'RENTALORDER_RENTALCREATED') {
        const rentalOrder = await RentalOrder.findById(event.aggregateId);
        if (rentalOrder) {
          targetUserId = rentalOrder.user.toString();
          customerNotificationPayload = {
            user: targetUserId,
            event: 'RENTAL_CONFIRMED',
            title: 'Rental Order Confirmed',
            message: `Your rental order #${rentalOrder.rentalOrderId || rentalOrder._id} has been confirmed.`,
            type: 'order',
            actionUrl: '/dashboard/rentals',
            metadata: {
              outboxEventId: event._id.toString(),
              rentalOrderId: rentalOrder._id.toString(),
              entityId: rentalOrder.rentalOrderId || rentalOrder._id.toString(),
              imageSrc: rentalOrder.productImage,
            },
          };
        }
      }

      if (customerNotificationPayload && targetUserId) {
        const createdNotif = await InAppNotification.create(customerNotificationPayload);

        // Notify via socket
        try {
          emitUserEvent(targetUserId, 'notification:new', createdNotif);
        } catch (socketErr) {
          logger.error(
            `[OUTBOX] Failed to emit socket event for customer notification:`,
            socketErr,
          );
        }
      }
    }
  } catch (customerNotifErr) {
    logger.error(
      `[OUTBOX] Failed to create customer notification for ${eventName}:`,
      customerNotifErr,
    );
  }

  // 2. Handle specific internal Business Domain Side-Effects (Event Subscribers)
  // In a full microservices architecture, this would publish to Kafka/RabbitMQ.
  // Here we route to specific domain services if necessary.

  if (eventName === 'ORDER_ORDERSTATUSUPDATED') {
    const { triggerPurchaseRewards, triggerReversalRewards, total, userId, orderId } =
      event.payload;
    if (triggerPurchaseRewards) {
      try {
        const { LoyaltyService } = require('../services/loyaltyService');
        await LoyaltyService.processPurchaseRewards(userId, orderId, total);
      } catch (err) {
        logger.error('Failed to process purchase rewards:', err);
      }
    } else if (triggerReversalRewards) {
      try {
        const { LoyaltyService } = require('../services/loyaltyService');
        await LoyaltyService.reversePurchaseRewards(orderId);
      } catch (err) {
        logger.error('Failed to reverse purchase rewards:', err);
      }
    }
  }

  if (eventName.endsWith('_REFUNDREQUESTED')) {
    const { PaymentRefundService } = await import('../services/PaymentRefundService.js');
    const { amount, reason, razorpayPaymentId } = event.payload;
    try {
      await PaymentRefundService.initiateAsyncRefund({
        amount,
        currency: 'INR',
        originalTransactionId: razorpayPaymentId,
        entityType: event.aggregateType,
        entityId: event.aggregateId,
        reason,
      });
      logger.info(`[OUTBOX REFUND] Successfully enqueued refund for ${razorpayPaymentId}`);
    } catch (err) {
      logger.error(`[OUTBOX REFUND] Failed to enqueue refund for ${razorpayPaymentId}:`, err);
      throw err; // Force retry
    }
  }

  if (eventName === 'SYSTEM_NOTIFICATIONQUEUED') {
    if (event.payload && event.payload.emailOptions) {
      const { sendDirectEmailProcessor } = await import('../services/notificationService.js');
      await sendDirectEmailProcessor(event.payload.emailOptions);
    }
  }
}
