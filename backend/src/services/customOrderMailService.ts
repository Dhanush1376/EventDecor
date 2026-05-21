import { sendDirectEmail } from './notificationService';
import logger from '../config/logger';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'dhanujanu1315@gmail.com';
const getFrontendUrl = () => {
  return process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:5173';
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
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 45px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 30px; text-align: center;">
              <div style="font-size: 26px; color: #735c00; margin-bottom: 10px; font-weight: 300;">✦</div>
              <h1 style="color: #735c00; font-size: 24px; font-weight: 300; letter-spacing: 4px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
              <div style="width: 50px; height: 1px; background-color: #735c00; margin: 10px auto 0 auto; opacity: 0.25;"></div>
            </div>
            
            <h2 style="font-size: 18px; font-weight: 400; color: #2d2b29; margin-bottom: 20px; text-align: center; font-family: 'Didot', 'Georgia', serif;">Your Luxury Design Request is Received</h2>
            
            <p style="color: #7f7663; font-size: 13.5px; line-height: 1.8; font-weight: 300; font-family: 'Inter', sans-serif; margin-bottom: 25px;">
              Dear ${order.customerName || 'Valued Guest'},<br/><br/>
              Thank you for trusting Siri Arts & Crafts with your landmark occasion. We have received your creative blueprint and details. Our designers are currently curating custom recommendations tailored to your request.
            </p>

            <div style="background-color: #fbfaf8; border: 1px solid #d0c5af; border-radius: 12px; padding: 22px; margin-bottom: 30px; font-family: 'Inter', sans-serif;">
              <h3 style="color: #735c00; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px 0; border-bottom: 1px solid rgba(115,92,0,0.1); padding-bottom: 8px;">Order Details</h3>
              <table style="width: 100%; font-size: 13px; color: #2d2b29; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #7f7663; width: 120px;">Occasion:</td>
                  <td style="padding: 6px 0; font-weight: bold;">${order.occasion}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #7f7663;">Category:</td>
                  <td style="padding: 6px 0; font-weight: bold;">${order.productType}</td>
                </tr>
                ${order.eventDate ? `
                <tr>
                  <td style="padding: 6px 0; color: #7f7663;">Event Date:</td>
                  <td style="padding: 6px 0; font-weight: bold;">${new Date(order.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 6px 0; color: #7f7663;">Venue City:</td>
                  <td style="padding: 6px 0; font-weight: bold;">${order.city}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #7f7663;">Target Budget:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #735c00;">₹${Number(order.budget).toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin-bottom: 35px;">
              <a href="${trackingLink}" style="display: inline-block; background-color: #2d2b29; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; font-family: 'Inter', sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.15); transition: all 0.3s;">
                View Order & Live Chat
              </a>
            </div>

            <div style="border-top: 1px solid #efeeeb; padding-top: 20px; text-align: center; font-family: 'Inter', sans-serif;">
              <p style="color: #a39c8c; font-size: 11px; line-height: 1.6; margin: 0;">
                Siri Arts & Crafts Studio • Handcrafted Traditional Luxury<br/>
                For real-time support, reach out to your curator inside the chat portal.
              </p>
            </div>
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
          <div style="background-color: #fcfcfc; font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; padding: 35px 25px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1a202c;">
            <div style="border-left: 4px solid #d4af37; padding-left: 15px; margin-bottom: 20px;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #718096; display: block;">Administrative Dispatch</span>
              <h2 style="margin: 5px 0 0 0; font-size: 18px; color: #2d3748;">New Custom Order Lodged</h2>
            </div>

            <div style="background-color: #f7fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px; font-size: 13.5px;">
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

            ${order.customRequirements ? `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; font-size: 13px; background-color: #ffffff;">
              <h4 style="margin: 0 0 8px 0; color: #4a5568;">Special Client Requirements:</h4>
              <p style="margin: 0; color: #4a5568; line-height: 1.6; font-style: italic;">"${order.customRequirements}"</p>
            </div>` : ''}

            <div style="text-align: center; margin-bottom: 20px;">
              <a href="${frontendUrl}/admin/inquiries" style="display: inline-block; background-color: #d4af37; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 6px rgba(212,175,55,0.2);">
                Open Admin Portal Drawer
              </a>
            </div>
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
      const itemsHtml = quote.items.map((item: any, idx: number) => `
        <tr style="border-bottom: 1px solid #efeeeb;">
          <td style="padding: 10px 0; font-size: 13px; color: #2d2b29;">
            <span style="font-family: monospace; color: #7f7663; margin-right: 5px;">${String(idx + 1).padStart(2, '0')}</span>
            ${item.description}
          </td>
          <td style="padding: 10px 0; font-size: 13px; text-align: right; font-family: monospace; font-weight: bold; color: #2d2b29;">
            ₹${Number(item.amount).toLocaleString('en-IN')}
          </td>
        </tr>
      `).join('');

      await sendDirectEmail({
        email: order.customerEmail,
        subject: `Your Itemized Decor Estimate is Ready! ✦ Siri Arts & Crafts [₹${quote.total.toLocaleString('en-IN')}]`,
        customHtml: `
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 45px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 30px; text-align: center;">
              <div style="font-size: 26px; color: #735c00; margin-bottom: 10px; font-weight: 300;">✦</div>
              <h1 style="color: #735c00; font-size: 24px; font-weight: 300; letter-spacing: 4px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
              <div style="width: 50px; height: 1px; background-color: #735c00; margin: 10px auto 0 auto; opacity: 0.25;"></div>
            </div>
            
            <h2 style="font-size: 18px; font-weight: 400; color: #2d2b29; margin-bottom: 25px; text-align: center;">Studio Curation Estimate</h2>
            
            <p style="color: #7f7663; font-size: 13.5px; line-height: 1.8; font-weight: 300; font-family: 'Inter', sans-serif; margin-bottom: 25px;">
              Dear ${order.customerName},<br/><br/>
              Our design curators have carefully scoped and estimated your setup request. Please find your itemized invoice statement details below for approval.
            </p>

            <div style="background-color: #ffffff; border: 1px solid #efeeeb; border-radius: 12px; padding: 20px 25px; margin-bottom: 30px; font-family: 'Inter', sans-serif;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #735c00; tracking-spacing: 2px;">Itemized Invoice</span>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="border-bottom: 1px solid #735c00; text-align: left;">
                    <th style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #7f7663; font-weight: bold;">Description</th>
                    <th style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #7f7663; font-weight: bold; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  ${quote.tax ? `
                  <tr style="border-bottom: 1px solid #efeeeb;">
                    <td style="padding: 10px 0; font-size: 12px; color: #7f7663;">GST / Surcharges</td>
                    <td style="padding: 10px 0; font-size: 12px; text-align: right; font-family: monospace; color: #2d2b29;">₹${Number(quote.tax).toLocaleString('en-IN')}</td>
                  </tr>` : ''}
                  ${quote.shipping ? `
                  <tr style="border-bottom: 1px solid #efeeeb;">
                    <td style="padding: 10px 0; font-size: 12px; color: #7f7663;">Shipping, Setup & Labor</td>
                    <td style="padding: 10px 0; font-size: 12px; text-align: right; font-family: monospace; color: #2d2b29;">₹${Number(quote.shipping).toLocaleString('en-IN')}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 15px 0 0 0; font-size: 14px; font-weight: bold; color: #2d2b29;">Grand Total</td>
                    <td style="padding: 15px 0 0 0; font-size: 15.5px; font-weight: bold; text-align: right; color: #735c00; font-family: monospace;">₹${Number(quote.total).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              ${quote.notes ? `
              <div style="margin-top: 20px; padding: 12px 15px; background-color: #faf9f6; border-radius: 8px; font-size: 11.5px; line-height: 1.6; color: #685c57; border-left: 2px solid #735c00;">
                <strong>Payment Notes / Special Terms:</strong><br/>
                ${quote.notes}
              </div>` : ''}
            </div>

            <div style="text-align: center; margin-bottom: 35px;">
              <a href="${reviewLink}" style="display: inline-block; background-color: #735c00; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; font-family: 'Inter', sans-serif; box-shadow: 0 4px 12px rgba(115,92,0,0.25);">
                Review & Respond
              </a>
            </div>

            <div style="border-top: 1px solid #efeeeb; padding-top: 20px; text-align: center; font-family: 'Inter', sans-serif;">
              <p style="color: #a39c8c; font-size: 11px; line-height: 1.6; margin: 0;">
                Siri Arts & Crafts Studio • Traditional Elegance Redefined<br/>
                Approve the estimate inside your tracking panel to initiate structural scheduling!
              </p>
            </div>
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
          <div style="background-color: #fcfcfc; font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; padding: 35px 25px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1a202c;">
            <div style="border-left: 4px solid ${response === 'approved' ? '#48bb78' : '#e53e3e'}; padding-left: 15px; margin-bottom: 20px;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #718096; display: block;">Administrative Dispatch</span>
              <h2 style="margin: 5px 0 0 0; font-size: 18px; color: #2d3748;">
                Quotation Has Been ${response.toUpperCase()}
              </h2>
            </div>

            <div style="background-color: #f7fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px; font-size: 13.5px;">
              <p style="margin: 0 0 8px 0;"><strong>Client Name:</strong> ${order.customerName}</p>
              <p style="margin: 0 0 8px 0;"><strong>Email Address:</strong> ${order.customerEmail}</p>
              <p style="margin: 0 0 8px 0;"><strong>Occasion:</strong> ${order.occasion}</p>
              <p style="margin: 0 0 8px 0;"><strong>Invoice Value:</strong> ₹${Number(order.quotation?.total).toLocaleString('en-IN')}</p>
              <p style="margin: 0;"><strong>Status Response:</strong> <span style="color: ${response === 'approved' ? '#48bb78' : '#e53e3e'}; font-weight: bold; text-transform: uppercase;">${response}</span></p>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; font-size: 13px; background-color: #ffffff;">
              <h4 style="margin: 0 0 8px 0; color: #4a5568;">Customer Workspace Update:</h4>
              <p style="margin: 0; color: #4a5568; line-height: 1.6; font-style: italic;">
                ${response === 'approved' 
                  ? '"I have APPROVED the provided estimate. Ready to proceed with scheduling and deposit transactions!"' 
                  : '"I have requested modifications on the quotation. Let\'s adjust the scope items."'}
              </p>
            </div>

            <div style="text-align: center;">
              <a href="${frontendUrl}/admin/inquiries" style="display: inline-block; background-color: #2d3748; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                Manage in Admin Portal
              </a>
            </div>
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
  static async sendChatMessageEmail(order: any, senderName: string, senderRole: 'admin' | 'customer', text: string) {
    const frontendUrl = getFrontendUrl();
    
    // Determine recipient
    const recipientEmail = senderRole === 'admin' ? order.customerEmail : ADMIN_EMAIL;
    const trackingLink = senderRole === 'admin' ? `${frontendUrl}/custom-orders` : `${frontendUrl}/admin/inquiries`;

    try {
      await sendDirectEmail({
        email: recipientEmail,
        subject: `New Workspace Message from ${senderName}! ✦ Siri Arts & Crafts`,
        customHtml: `
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 40px 25px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 25px; text-align: center;">
              <div style="font-size: 24px; color: #735c00; margin-bottom: 8px; font-weight: 300;">✦</div>
              <h1 style="color: #735c00; font-size: 22px; font-weight: 300; letter-spacing: 4px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
              <div style="width: 40px; height: 1px; background-color: #735c00; margin: 8px auto 0 auto; opacity: 0.25;"></div>
            </div>
            
            <h3 style="font-size: 16px; font-weight: 400; color: #2d2b29; margin-bottom: 20px; text-align: center; font-family: 'Didot', 'Georgia', serif;">New Message Received</h3>
            
            <div style="background-color: #ffffff; border: 1px solid #efeeeb; border-radius: 12px; padding: 20px; margin-bottom: 25px; font-family: 'Inter', sans-serif;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #735c00; display: block; margin-bottom: 8px;">From ${senderName} (${senderRole === 'admin' ? 'Curator Team' : 'Customer'})</span>
              <p style="color: #2d2b29; font-size: 13.5px; line-height: 1.6; margin: 0; font-style: italic;">
                "${text}"
              </p>
            </div>

            <div style="text-align: center;">
              <a href="${trackingLink}" style="display: inline-block; background-color: #2d2b29; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; font-family: 'Inter', sans-serif;">
                Open Chat Workspace
              </a>
            </div>
          </div>
        `,
        type: 'order',
        action: 'custom_order_chat_update',
      });
    } catch (err) {
      logger.error('Failed to dispatch chat message notification email:', err);
    }
  }
}
