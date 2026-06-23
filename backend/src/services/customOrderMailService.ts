import { sendDirectEmail } from './notificationService';
import logger from '../config/logger';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@siriartsandcrafts.com';
import { getFrontendUrl } from '../utils/getFrontendUrl';

// HTML escape utility to prevent XSS in email templates
const escapeHtml = (unsafe: string) => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export class CustomOrderMailService {
  /**
   * 1. Send submission emails when a customer lodges a new custom request
   */
  static async sendSubmissionEmails(order: any) {
    const frontendUrl = getFrontendUrl();
    const trackingLink = `${frontendUrl}/custom-orders`;

    // A. TO CUSTOMER: Elegant Luxury Welcome & Acknowledgment
    try {
      await sendDirectEmail({
        email: order.customerEmail,
        subject: `Your Bespoke Decor Request has been Lodged! ✦ Siri Arts & Crafts`,
        customHtml: `
          <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">Your Design Request is Received</h2>
          
          <p style="margin: 0 0 24px 0;">
            Dear ${order.customerName || 'Valued Guest'},<br/><br/>
            Thank you for trusting Siri Arts & Crafts with your landmark occasion. We have received your creative blueprint and details. Our designers are currently curating custom recommendations tailored to your request.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #0f172a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Order Details</h3>
            <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 120px;">Occasion:</td>
                <td style="padding: 6px 0; font-weight: bold;">${order.occasion}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Category:</td>
                <td style="padding: 6px 0; font-weight: bold;">${order.productType}</td>
              </tr>
              ${
                order.eventDate
                  ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Event Date:</td>
                <td style="padding: 6px 0; font-weight: bold;">${new Date(order.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>`
                  : ''
              }
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Venue City:</td>
                <td style="padding: 6px 0; font-weight: bold;">${order.city}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Target Budget:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">₹${Number(order.budget).toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${trackingLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
              View Order & Live Chat
            </a>
          </div>
        `,
        type: 'order',
        action: 'custom_order_submission',
      });
    } catch (err) {
      logger.error('Failed to dispatch submission confirmation email to customer:', err);
    }

    // B. TO ADMIN: Creative Request Notification Alert
    try {
      await sendDirectEmail({
        email: ADMIN_EMAIL,
        subject: `🚨 [NEW DESIGN REQUEST] ${order.customerName} - ${order.occasion} (${order.city})`,
        customHtml: `
          <div style="border-left: 4px solid #0f172a; padding-left: 16px; margin-bottom: 24px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; display: block;">Administrative Dispatch</span>
            <h2 style="margin: 4px 0 0 0; font-size: 18px; color: #0f172a; font-weight: 600;">New Custom Order Lodged</h2>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 13.5px; color: #334155;">
            <p style="margin: 0 0 8px 0;"><strong>Client Name:</strong> ${order.customerName}</p>
            <p style="margin: 0 0 8px 0;"><strong>Email Address:</strong> ${order.customerEmail}</p>
            <p style="margin: 0 0 8px 0;"><strong>WhatsApp/Phone:</strong> ${order.customerPhone || 'Not Specified'}</p>
            <p style="margin: 0 0 8px 0;"><strong>Event Occasion:</strong> ${order.occasion}</p>
            <p style="margin: 0 0 8px 0;"><strong>Product/Decor:</strong> ${order.productType}</p>
            <p style="margin: 0 0 8px 0;"><strong>Event Date:</strong> ${order.eventDate ? new Date(order.eventDate).toLocaleDateString('en-IN') : 'Flexible'}</p>
            <p style="margin: 0 0 8px 0;"><strong>Location City:</strong> ${order.city}</p>
            <p style="margin: 0 0 8px 0;"><strong>Estimated Budget:</strong> ₹${Number(order.budget).toLocaleString('en-IN')}</p>
            <p style="margin: 0;"><strong>Consultation Mode:</strong> ${order.bookingType}</p>
          </div>

          ${
            order.customRequirements
              ? `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 13px; background-color: #ffffff; color: #334155;">
            <h4 style="margin: 0 0 8px 0; color: #0f172a; font-weight: 600;">Special Client Requirements:</h4>
            <p style="margin: 0; line-height: 1.6; font-style: italic;">"${escapeHtml(order.customRequirements)}"</p>
          </div>`
              : ''
          }

          <div style="text-align: center;">
            <a href="${frontendUrl}/admin/inquiries" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
              Open Admin Portal
            </a>
          </div>
        `,
        type: 'order',
        action: 'admin_custom_order_lodged',
      });
    } catch (err) {
      logger.error('Failed to dispatch alert email to admin:', err);
    }
  }

  /**
   * 2. Send quotation compiled invoice details to customer
   */
  static async sendQuotationEmail(order: any) {
    const frontendUrl = getFrontendUrl();
    const reviewLink = `${frontendUrl}/custom-orders`;
    const quote = order.quotation;

    if (!quote || quote.status !== 'sent') return;

    try {
      const itemsHtml = quote.items
        .map(
          (item: any, idx: number) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; font-size: 13px; color: #334155;">
            <span style="font-family: monospace; color: #64748b; margin-right: 5px;">${String(idx + 1).padStart(2, '0')}</span>
            ${item.description}
          </td>
          <td style="padding: 10px 0; font-size: 13px; text-align: right; font-family: monospace; font-weight: bold; color: #0f172a;">
            ₹${Number(item.amount).toLocaleString('en-IN')}
          </td>
        </tr>
      `,
        )
        .join('');

      await sendDirectEmail({
        email: order.customerEmail,
        subject: `Your Itemized Decor Estimate is Ready! ✦ Siri Arts & Crafts [₹${quote.total.toLocaleString('en-IN')}]`,
        customHtml: `
          <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">Studio Curation Estimate</h2>
          
          <p style="margin: 0 0 24px 0;">
            Dear ${order.customerName},<br/><br/>
            Our design curators have carefully scoped and estimated your setup request. Please find your itemized invoice statement details below for approval.
          </p>

          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; display: block; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Itemized Invoice</span>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="text-align: left;">
                  <th style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600;">Description</th>
                  <th style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                ${
                  quote.tax
                    ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-size: 12px; color: #64748b;">GST / Surcharges</td>
                  <td style="padding: 10px 0; font-size: 12px; text-align: right; font-family: monospace; color: #334155;">₹${Number(quote.tax).toLocaleString('en-IN')}</td>
                </tr>`
                    : ''
                }
                ${
                  quote.shipping
                    ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-size: 12px; color: #64748b;">Shipping, Setup & Labor</td>
                  <td style="padding: 10px 0; font-size: 12px; text-align: right; font-family: monospace; color: #334155;">₹${Number(quote.shipping).toLocaleString('en-IN')}</td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="padding: 15px 0 0 0; font-size: 14px; font-weight: bold; color: #0f172a;">Grand Total</td>
                  <td style="padding: 15px 0 0 0; font-size: 16px; font-weight: bold; text-align: right; color: #0f172a; font-family: monospace;">₹${Number(quote.total).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            ${
              quote.notes
                ? `
            <div style="margin-top: 20px; padding: 12px 15px; background-color: #f8fafc; border-radius: 6px; font-size: 11.5px; line-height: 1.6; color: #334155; border-left: 3px solid #0f172a;">
              <strong>Payment Notes / Special Terms:</strong><br/>
              ${quote.notes}
            </div>`
                : ''
            }
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${reviewLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
              Review & Respond
            </a>
          </div>
        `,
        type: 'order',
        action: 'custom_order_quotation_dispatched',
      });
    } catch (err) {
      logger.error('Failed to dispatch estimate invoice email to customer:', err);
    }
  }

  /**
   * 3. Alert Admin when customer approves or requests modifications on the quote
   */
  static async sendQuotationResponseEmail(order: any, response: 'approved' | 'rejected') {
    const frontendUrl = getFrontendUrl();

    try {
      await sendDirectEmail({
        email: ADMIN_EMAIL,
        subject: `⚡ [QUOTE ${response.toUpperCase()}] ${order.customerName} responded to quotation`,
        customHtml: `
          <div style="border-left: 4px solid ${response === 'approved' ? '#10b981' : '#ef4444'}; padding-left: 16px; margin-bottom: 24px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; display: block;">Administrative Dispatch</span>
            <h2 style="margin: 4px 0 0 0; font-size: 18px; color: #0f172a; font-weight: 600;">
              Quotation Has Been ${response.toUpperCase()}
            </h2>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 13.5px; color: #334155;">
            <p style="margin: 0 0 8px 0;"><strong>Client Name:</strong> ${order.customerName}</p>
            <p style="margin: 0 0 8px 0;"><strong>Email Address:</strong> ${order.customerEmail}</p>
            <p style="margin: 0 0 8px 0;"><strong>Occasion:</strong> ${order.occasion}</p>
            <p style="margin: 0 0 8px 0;"><strong>Invoice Value:</strong> ₹${Number(order.quotation?.total).toLocaleString('en-IN')}</p>
            <p style="margin: 0;"><strong>Status Response:</strong> <span style="color: ${response === 'approved' ? '#10b981' : '#ef4444'}; font-weight: bold; text-transform: uppercase;">${response}</span></p>
          </div>

          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 13px; background-color: #ffffff; color: #334155;">
            <h4 style="margin: 0 0 8px 0; color: #0f172a; font-weight: 600;">Customer Workspace Update:</h4>
            <p style="margin: 0; line-height: 1.6; font-style: italic;">
              ${
                response === 'approved'
                  ? '"I have APPROVED the provided estimate. Ready to proceed with scheduling and deposit transactions!"'
                  : '"I have requested modifications on the quotation. Let\'s adjust the scope items."'
              }
            </p>
          </div>

          <div style="text-align: center;">
            <a href="${frontendUrl}/admin/inquiries" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
              Manage in Admin Portal
            </a>
          </div>
        `,
        type: 'order',
        action: `admin_custom_quotation_${response}`,
      });
    } catch (err) {
      logger.error('Failed to dispatch quotation response alert email to admin:', err);
    }
  }

  /**
   * 4. Notification for live chat messages posted by customer or admin
   */
  static async sendChatMessageEmail(
    order: any,
    senderName: string,
    senderRole: 'admin' | 'customer',
    text: string,
  ) {
    const frontendUrl = getFrontendUrl();

    // Determine recipient
    const recipientEmail = senderRole === 'admin' ? order.customerEmail : ADMIN_EMAIL;
    const trackingLink =
      senderRole === 'admin' ? `${frontendUrl}/custom-orders` : `${frontendUrl}/admin/inquiries`;

    try {
      await sendDirectEmail({
        email: recipientEmail,
        subject: `New Workspace Message from ${senderName}! ✦ Siri Arts & Crafts`,
        customHtml: `
          <h3 style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">New Message Received</h3>
          
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 8px;">From ${escapeHtml(senderName)} (${senderRole === 'admin' ? 'Curator Team' : 'Customer'})</span>
            <p style="color: #334155; font-size: 13.5px; line-height: 1.6; margin: 0; font-style: italic;">
              "${escapeHtml(text)}"
            </p>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 24px; color: #334155;">
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 6px;">Workspace Context</span>
            <p style="color: #334155; font-size: 12px; margin: 0;">
              <strong>Order ID:</strong> ${order.orderId || order._id}<br/>
              <strong>Related Product:</strong> ${escapeHtml(order.productSnapshot?.title || order.productType || 'Custom Request')}
            </p>
          </div>

          <div style="text-align: center;">
            <a href="${trackingLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
              Open Chat Workspace
            </a>
          </div>
        `,
        type: 'order',
        action: 'custom_order_chat_update',
      });
    } catch (err) {
      logger.error('Failed to dispatch chat message notification email:', err);
    }
  }

  /**
   * 5. Send status change email
   */
  static async sendStatusChangeEmail(order: any, previousStatus: string) {
    const frontendUrl = getFrontendUrl();
    const trackingLink = `${frontendUrl}/custom-orders`;

    try {
      await sendDirectEmail({
        email: order.customerEmail,
        subject: `Order Status Update: ${order.status} ✦ Siri Arts & Crafts`,
        customHtml: `
          <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">Status Update</h2>
          <p>
            Dear ${escapeHtml(order.customerName)},<br/><br/>
            The status of your custom order <strong>${escapeHtml(order.orderId)}</strong> has been updated from <em>${escapeHtml(previousStatus)}</em> to <strong>${escapeHtml(order.status)}</strong>.
          </p>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${trackingLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
              View Details
            </a>
          </div>
        `,
        type: 'order',
        action: 'custom_order_status_update',
      });
    } catch (err) {
      logger.error('Failed to dispatch status change email:', err);
    }
  }
}
