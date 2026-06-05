import logger from '../config/logger';
import OutboxEvent from '../models/OutboxEvent';
import { withCronLock } from '../utils/cronLock';
import { getAdminEmails } from '../config/adminConfig';
import Order from '../models/Order';
import User from '../models/User';
import { OrderNotificationService } from '../services/orders/OrderNotificationService';
import EventBooking from '../models/EventBooking';
import RentalOrder from '../models/RentalOrder';
import * as Sentry from '@sentry/node';
import { LoyaltyService } from '../services/loyaltyService';
import { notificationQueue } from '../jobs/queues';
import { EventBookingMailService } from '../services/eventBookingMailService';
import { CustomOrderMailService } from '../services/customOrderMailService';

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
    const events = await OutboxEvent.find({ status: 'PENDING' }).sort({ createdAt: 1 }).limit(50);

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

async function processEvent(event: any): Promise<void> {
  const adminEmails = getAdminEmails();
  const { sendDirectEmail } = require('../services/notificationService');

  switch (`${event.aggregateType}:${event.eventType}`) {
    // ─── ORDER EVENTS ───────────────────────────────────────────────
    case 'Order:OrderCreated': {
      const order = await Order.findById(event.aggregateId);
      const user = await User.findById(event.payload.userId);

      if (order && user) {
        await OrderNotificationService.dispatchOrderConfirmation(order, user, adminEmails);
      }
      break;
    }

    case 'Order:PaymentFailed': {
      const order = await Order.findById(event.aggregateId);
      if (order) {
        const user = await User.findById(order.user);
        if (user?.email) {
          await sendDirectEmail({
            email: user.email,
            subject: 'Payment Failed — Your Order Was Not Placed',
            customHtml: `<p>Hi ${user.name || 'there'},</p><p>Unfortunately, your payment could not be verified for your recent order attempt. If money was deducted, it will be automatically refunded within 5-7 business days.</p><p>If you believe this is an error, please contact our support team.</p>`,
            type: 'order',
            action: 'payment_failed',
          });
        }
        // Admin alert
        for (const email of adminEmails) {
          await sendDirectEmail({
            email,
            subject: `[ALERT] Payment Failed — Order ${order._id}`,
            customHtml: `<p>Payment verification failed for order ${order._id}.</p><p>Amount: ₹${order.total}</p><p>User: ${user?.email || 'unknown'}</p><p>Razorpay Order ID: ${order.razorpayOrderId}</p>`,
            type: 'system',
            action: 'admin_payment_failed_alert',
          });
        }
      }
      break;
    }

    case 'Order:PaymentDisputed': {
      const order = await Order.findById(event.aggregateId);
      for (const email of adminEmails) {
        await sendDirectEmail({
          email,
          subject: `[CRITICAL] Payment Dispute — Order ${event.aggregateId}`,
          customHtml: `<p><strong>A payment dispute has been raised.</strong></p><p>Order ID: ${event.aggregateId}</p><p>Dispute State: ${event.payload.disputeState}</p><p>Amount: ₹${order?.total || 'unknown'}</p><p>Action required: Review in Razorpay Dashboard immediately.</p>`,
          type: 'system',
          action: 'admin_payment_dispute_alert',
        });
      }
      break;
    }

    case 'Order:OrderDelivered': {
      const order = await Order.findById(event.aggregateId);
      if (order) {
        const user = await User.findById(order.user);
        if (user?.email) {
          await sendDirectEmail({
            email: user.email,
            subject: `Your Order Has Been Delivered! — ${order._id}`,
            customHtml: `<p>Hi ${user.name || 'there'},</p><p>Your order <strong>${order._id}</strong> has been successfully delivered. We hope you love it!</p><p>You have earned loyalty points for this purchase which have been credited to your account.</p><p>If you have any issues, please contact our support team.</p>`,
            type: 'order',
            action: 'order_delivered',
          });
        }
      }
      break;
    }

    case 'Order:OrderStatusUpdated': {
      const {
        triggerPurchaseRewards,
        triggerReversalRewards,
        newStatus,
        note,
        total,
        userId,
        orderId,
      } = event.payload;

      // Handle rewards safely outside of transaction
      if (triggerPurchaseRewards) {
        try {
          await LoyaltyService.processPurchaseRewards(userId, orderId, total);
        } catch (rewardsErr) {
          logger.error('Failed to process purchase rewards on delivery:', rewardsErr);
        }
      } else if (triggerReversalRewards) {
        try {
          await LoyaltyService.reversePurchaseRewards(orderId);
        } catch (reversalErr) {
          logger.error('Failed to reverse purchase rewards on status transition:', reversalErr);
        }
      }

      // Handle admin notification queue safely outside of transaction
      try {
        await notificationQueue.add('adminNotification', {
          title: `Order Status: ${newStatus}`,
          message: `Order #${orderId} has been updated to ${newStatus}. ${note || ''}`,
          type: 'order',
          actionLink: `/admin/orders/${orderId}`,
        });
      } catch (notifErr) {
        logger.error('Failed to create admin notification for order status change:', notifErr);
      }
      break;
    }

    // ─── EVENT BOOKING EVENTS ───────────────────────────────────────
    case 'EventBooking:BookingInquirySubmitted': {
      const booking = await EventBooking.findById(event.aggregateId).populate('user');
      if (booking) {
        const user = booking.user as any;
        const eventDateStr = new Date(booking.date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        } as const);

        await notificationQueue.add('adminNotification', {
          title: 'New Luxury Event Booking Inquiry',
          message: `${user.name || 'A customer'} submitted a new event booking inquiry ("${booking.title}") for ${eventDateStr}.`,
          type: 'custom_request',
          actionLink: `/admin/bookings`,
          metadata: { bookingId: booking._id.toString() },
        });

        // Use the elegant mail service instead of basic HTML
        await EventBookingMailService.sendSubmissionEmails(booking, user);
      }
      break;
    }

    case 'EventBooking:BookingConfirmed': {
      const booking = await EventBooking.findById(event.aggregateId).populate('user');
      if (booking) {
        const user = booking.user as any;
        if (user?.email) {
          const { sendDirectEmail } = require('../services/notificationService');
          await sendDirectEmail({
            email: user.email,
            subject: `🎉 Booking Confirmed — ${booking.title}`,
            customHtml: `<p>Hi ${user.name || 'there'},</p><p>Your event booking <strong>${booking.title}</strong> on ${new Date(booking.date).toLocaleDateString('en-IN')} has been confirmed!</p><p>Deposit Paid: ₹${booking.pricing.depositAmount}</p><p>Pending Balance: ₹${booking.pricing.pendingBalance}</p><p>Our team will be in touch shortly to discuss your event details.</p>`,
            type: 'order',
            action: 'booking_confirmed',
          });
        }
        // Admin notification
        for (const email of adminEmails) {
          const { sendDirectEmail } = require('../services/notificationService');
          await sendDirectEmail({
            email,
            subject: `[NEW BOOKING] ${booking.title} — ${new Date(booking.date).toLocaleDateString('en-IN')}`,
            customHtml: `<p>New event booking confirmed:</p><p>Booking ID: ${booking.bookingId}</p><p>Event: ${booking.title} (${booking.eventType})</p><p>Date: ${new Date(booking.date).toLocaleDateString('en-IN')}</p><p>Guests: ${booking.guestCount}</p><p>Total: ₹${booking.pricing.totalPrice}</p><p>Deposit Paid: ₹${booking.pricing.depositAmount}</p>`,
            type: 'system',
            action: 'admin_new_booking_alert',
          });
        }
      }
      break;
    }

    case 'EventBooking:PaymentFailed': {
      const booking = await EventBooking.findById(event.aggregateId).populate('user');
      if (booking) {
        const user = booking.user as any;
        if (user?.email) {
          await sendDirectEmail({
            email: user.email,
            subject: 'Payment Failed — Event Booking Not Confirmed',
            customHtml: `<p>Hi ${user.name || 'there'},</p><p>Unfortunately, the payment for your event booking could not be processed. Please try again or contact support.</p>`,
            type: 'order',
            action: 'booking_payment_failed',
          });
        }
      }
      break;
    }

    case 'EventBooking:BookingCancelled': {
      const booking = await EventBooking.findById(event.aggregateId).populate('user');
      if (booking) {
        const user = booking.user as any;
        if (user?.email) {
          await sendDirectEmail({
            email: user.email,
            subject: `Event Booking Cancelled — ${booking.title}`,
            customHtml: `<p>Hi ${user.name || 'there'},</p><p>Your event booking <strong>${booking.title}</strong> has been cancelled.</p><p>Reason: ${booking.cancellationReason || 'User Request'}</p><p>If you are eligible for a refund, it will be processed shortly.</p>`,
            type: 'order',
            action: 'booking_cancelled',
          });
        }
        for (const email of adminEmails) {
          await sendDirectEmail({
            email,
            subject: `[BOOKING CANCELLED] ${booking.title} — ${booking.bookingId || booking._id}`,
            customHtml: `<p>A booking was cancelled:</p><p>Booking ID: ${booking.bookingId || booking._id}</p><p>Event: ${booking.title}</p><p>Reason: ${booking.cancellationReason || 'unknown'}</p>`,
            type: 'system',
            action: 'admin_booking_cancelled_alert',
          });
        }
      }
      break;
    }

    // ─── RENTAL EVENTS ──────────────────────────────────────────────
    case 'RentalOrder:RentalCreated': {
      const rental = await RentalOrder.findById(event.aggregateId).populate('user');
      if (rental) {
        const user = rental.user as any;
        const paymentType = event.payload.type === 'cod' ? 'Cash on Delivery' : 'Online Payment';
        if (user?.email) {
          await sendDirectEmail({
            email: user.email,
            subject: `Rental Confirmed — ${rental.productTitle}`,
            customHtml: `<p>Hi ${user.name || 'there'},</p><p>Your rental order for <strong>${rental.productTitle}</strong> has been confirmed!</p><p>Rental Period: ${new Date(rental.rentalStartDate).toLocaleDateString('en-IN')} → ${new Date(rental.rentalEndDate).toLocaleDateString('en-IN')}</p><p>Total: ₹${rental.totalAmount} (${paymentType})</p><p>Security Deposit: ₹${rental.securityDeposit}</p>`,
            type: 'order',
            action: 'rental_confirmed',
          });
        }
        // Admin notification
        for (const email of adminEmails) {
          await sendDirectEmail({
            email,
            subject: `[NEW RENTAL] ${rental.productTitle} — ${rental.rentalOrderId}`,
            customHtml: `<p>New rental order:</p><p>Order: ${rental.rentalOrderId}</p><p>Product: ${rental.productTitle}</p><p>Period: ${new Date(rental.rentalStartDate).toLocaleDateString('en-IN')} → ${new Date(rental.rentalEndDate).toLocaleDateString('en-IN')}</p><p>Total: ₹${rental.totalAmount} (${paymentType})</p>`,
            type: 'system',
            action: 'admin_new_rental_alert',
          });
        }
      }
      break;
    }

    case 'RentalOrder:RentalPaymentFailed': {
      const rental = await RentalOrder.findById(event.aggregateId).populate('user');
      if (rental) {
        const user = rental.user as any;
        if (user?.email) {
          await sendDirectEmail({
            email: user.email,
            subject: 'Payment Failed — Rental Order Not Confirmed',
            customHtml: `<p>Hi ${user.name || 'there'},</p><p>Unfortunately, the payment for your rental of <strong>${rental.productTitle}</strong> could not be processed. Please try again.</p>`,
            type: 'order',
            action: 'rental_payment_failed',
          });
        }
      }
      break;
    }

    case 'RentalOrder:RentalCancelled': {
      const rental = await RentalOrder.findById(event.aggregateId).populate('user');
      if (rental) {
        const user = rental.user as any;
        if (user?.email) {
          await sendDirectEmail({
            email: user.email,
            subject: `Rental Order Cancelled — ${rental.productTitle}`,
            customHtml: `<p>Hi ${user.name || 'there'},</p><p>Your rental order for <strong>${rental.productTitle}</strong> has been cancelled.</p><p>If you are eligible for a refund, it will be processed shortly.</p>`,
            type: 'order',
            action: 'rental_cancelled',
          });
        }
        for (const email of adminEmails) {
          await sendDirectEmail({
            email,
            subject: `[RENTAL CANCELLED] ${rental.productTitle} — ${rental.rentalOrderId || rental._id}`,
            customHtml: `<p>A rental order was cancelled:</p><p>Rental ID: ${rental.rentalOrderId || rental._id}</p><p>Product: ${rental.productTitle}</p>`,
            type: 'system',
            action: 'admin_rental_cancelled_alert',
          });
        }
      }
      break;
    }

    // ─── REFUND EVENTS ──────────────────────────────────────────────
    case 'RentalOrder:RentalDepositRefunded': {
      const { orderId, userId, depositAmount, refundAmount, deductions } = event.payload;
      const user = await User.findById(userId);
      if (user?.email) {
        await sendDirectEmail({
          email: user.email,
          subject: `Security Deposit Refunded - Rental #${orderId}`,
          customHtml: `<p>Hi ${user.name || 'there'},</p>
          <p>Your security deposit for rental <strong>#${orderId}</strong> has been processed.</p>
          <p>Deposit Amount: ₹${depositAmount}<br/>
          Deductions: ₹${depositAmount - refundAmount}<br/>
          <strong>Refund Amount: ₹${refundAmount}</strong></p>
          ${deductions?.length ? '<p>Deductions breakdown:</p><ul>' + deductions.map((d: any) => `<li>${d.reason}: ₹${d.amount}</li>`).join('') + '</ul>' : ''}
          <p>The refund should reflect in your original payment method in 5-7 business days.</p>`,
          type: 'rental',
          action: 'rental_deposit_refund',
        });
      }
      break;
    }

    case 'RentalOrder:RentalDepositForfeited': {
      const { orderId, userId, depositAmount, deductions } = event.payload;
      const user = await User.findById(userId);
      if (user?.email) {
        await sendDirectEmail({
          email: user.email,
          subject: `Security Deposit Update - Rental #${orderId}`,
          customHtml: `<p>Hi ${user.name || 'there'},</p>
          <p>Your security deposit (₹${depositAmount}) for rental <strong>#${orderId}</strong> has been fully forfeited due to the following deductions:</p>
          ${deductions?.length ? '<ul>' + deductions.map((d: any) => `<li>${d.reason}: ₹${d.amount}</li>`).join('') + '</ul>' : ''}
          <p>If you have any questions, please contact our support team.</p>`,
          type: 'rental',
          action: 'rental_deposit_forfeit',
        });
      }
      break;
    }

    case 'Refund:RefundFailed': {
      Sentry.captureMessage(`Refund failed for entity ${event.aggregateId}`, {
        level: 'error',
        tags: { critical: 'refund_failure' },
        extra: { aggregateId: event.aggregateId, payload: event.payload },
      });
      for (const email of adminEmails) {
        await sendDirectEmail({
          email,
          subject: `[CRITICAL] Refund Failed — ${event.aggregateId}`,
          customHtml: `<p><strong>A refund has failed and requires manual intervention.</strong></p><p>Entity: ${event.payload?.entityType || 'unknown'}</p><p>Entity ID: ${event.payload?.entityId || event.aggregateId}</p><p>Amount: ₹${event.payload?.amount || 'unknown'}</p><p>Error: ${event.payload?.error || 'unknown'}</p>`,
          type: 'system',
          action: 'admin_refund_failed_critical',
        });
      }
      break;
    }

    // ─── SYSTEM EVENTS ──────────────────────────────────────────────
    case 'System:NotificationQueued': {
      // Generic async email handler
      if (event.payload && event.payload.emailOptions) {
        const { sendDirectEmailProcessor } = require('../services/notificationService');
        await sendDirectEmailProcessor(event.payload.emailOptions);
      }
      break;
    }

    // ─── CUSTOM ORDER EVENTS ──────────────────────────────────────────────
    case 'CustomOrder:CustomOrderSubmitted': {
      const CustomOrder = require('../models/CustomOrder').default;
      const order = await CustomOrder.findById(event.aggregateId);
      if (order) {
        await CustomOrderMailService.sendSubmissionEmails(order);
      }
      break;
    }

    default:
      logger.warn(`[OUTBOX] Unhandled event type: ${event.aggregateType}:${event.eventType}`);
      break;
  }
}
