import { sendDirectEmail } from './notificationService';
import logger from '../config/logger';
import { getAdminEmails } from '../config/adminConfig';

const getFrontendUrl = () => {
  return process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:5173';
};

export class EventBookingMailService {
  /**
   * Send submission confirmation email to customer & detailed notifications to admins
   */
  static async sendSubmissionEmails(booking: any, user: any) {
    const frontendUrl = getFrontendUrl();
    const trackingLink = `${frontendUrl}/dashboard`;
    const adminEmails = getAdminEmails();

    const customerEmail = user?.email || booking.user?.email || '';
    const customerName = user?.name || booking.user?.name || 'Valued Guest';
    const customerPhone = user?.phone || booking.user?.phone || 'Not Provided';

    const eventDateStr = new Date(booking.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const addonsList = (booking.selectedAddons || []).map((a: any) => `<li>${a.name} (+₹${Number(a.price).toLocaleString('en-IN')})</li>`).join('');

    const imagesHtml = (booking.inspirationImages || []).map((img: string) => `
      <div style="margin: 10px; display: inline-block;">
        <img src="${img}" style="max-width: 150px; border-radius: 8px; border: 1px solid #efeeeb;" alt="Inspiration Image" />
      </div>
    `).join('');

    // A. TO CUSTOMER: Elegant confirmation email
    try {
      await sendDirectEmail({
        email: customerEmail,
        subject: `Your Landmark Occasion Blueprint is Lodged! ✦ Siri Arts & Crafts`,
        customHtml: `
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 45px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 30px; text-align: center;">
              <div style="font-size: 26px; color: #735c00; margin-bottom: 10px; font-weight: 300;">✦</div>
              <h1 style="color: #735c00; font-size: 24px; font-weight: 300; letter-spacing: 4px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
              <div style="width: 50px; height: 1px; background-color: #735c00; margin: 10px auto 0 auto; opacity: 0.25;"></div>
            </div>
            
            <h2 style="font-size: 18px; font-weight: 400; color: #2d2b29; margin-bottom: 20px; text-align: center; font-family: 'Didot', 'Georgia', serif;">Your Event Booking is Received</h2>
            
            <p style="color: #7f7663; font-size: 13.5px; line-height: 1.8; font-weight: 300; font-family: 'Inter', sans-serif; margin-bottom: 25px;">
              Dear ${customerName},<br/><br/>
              Thank you for choosing Siri Arts & Crafts. Your luxury event design and setup inquiry has been successfully logged! Our senior designers and coordinators are actively reviewing your floorplans, venue parameters, and Pinterest inspiration boards to construct a bespoke proposal.
            </p>

            <div style="background-color: #fbfaf8; border: 1px solid #d0c5af; border-radius: 12px; padding: 22px; margin-bottom: 30px; font-family: 'Inter', sans-serif;">
              <h3 style="color: #735c00; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px 0; border-bottom: 1px solid rgba(115,92,0,0.1); padding-bottom: 8px;">Reservation Specifications</h3>
              <table style="width: 100%; font-size: 13px; color: #2d2b29; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #7f7663; width: 130px;">Booking ID:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #735c00;">${booking.bookingId || 'SR-BK-PENDING'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #7f7663;">Event Title:</td>
                  <td style="padding: 6px 0; font-weight: bold;">${booking.title}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #7f7663;">Event Type:</td>
                  <td style="padding: 6px 0; font-weight: bold; text-transform: capitalize;">${booking.eventType}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #7f7663;">Date & Time:</td>
                  <td style="padding: 6px 0; font-weight: bold;">${eventDateStr} (${booking.timing?.start} - ${booking.timing?.end})</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #7f7663;">Venue Name:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #735c00;">${booking.venue?.name || 'Traditional Venue'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #7f7663;">Venue Address:</td>
                  <td style="padding: 6px 0; font-weight: bold;">${booking.venue?.address}</td>
                </tr>
                ${booking.venue?.city ? `<tr><td style="padding: 6px 0; color: #7f7663;">City / Town:</td><td style="padding: 6px 0; font-weight: bold;">${booking.venue.city} (${booking.venue.state || ''})</td></tr>` : ''}
                ${booking.venue?.pincode ? `<tr><td style="padding: 6px 0; color: #7f7663;">Pincode/ZIP:</td><td style="padding: 6px 0; font-weight: bold;">${booking.venue.pincode}</td></tr>` : ''}
                ${booking.venue?.latitude && booking.venue?.longitude ? `<tr><td style="padding: 6px 0; color: #7f7663;">GPS Stamp:</td><td style="padding: 6px 0; font-weight: bold; font-family: monospace;">${Number(booking.venue.latitude).toFixed(6)}, ${Number(booking.venue.longitude).toFixed(6)}</td></tr>` : ''}
                ${booking.venue?.googleMapsLink ? `<tr><td style="padding: 6px 0; color: #7f7663;">Interactive Map:</td><td style="padding: 6px 0; font-weight: bold;"><a href="${booking.venue.googleMapsLink}" style="color: #735c00; text-decoration: underline;">Open Google Maps Navigation</a></td></tr>` : ''}
                <tr>
                  <td style="padding: 6px 0; color: #7f7663;">Venue Style:</td>
                  <td style="padding: 6px 0; font-weight: bold;">${booking.venue?.isOutdoor ? 'Outdoor Celebration' : 'Indoor Ceremony'}</td>
                </tr>

                ${booking.customization?.themeColor ? `
                <tr>
                  <td style="padding: 6px 0; color: #7f7663;">Theme Palette:</td>
                  <td style="padding: 6px 0; font-weight: bold;">${booking.customization.themeColor}</td>
                </tr>` : ''}
              </table>
            </div>

            ${addonsList ? `
            <div style="background-color: #fbfaf8; border: 1px solid #efeeeb; border-radius: 12px; padding: 22px; margin-bottom: 30px; font-family: 'Inter', sans-serif;">
              <h4 style="color: #735c00; font-size: 11px; font-weight: 600; text-transform: uppercase; margin: 0 0 10px 0;">Selected Custom Add-ons</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #2d2b29; line-height: 1.6;">
                ${addonsList}
              </ul>
            </div>` : ''}

            ${imagesHtml ? `
            <div style="margin-bottom: 30px; text-align: center;">
              <h4 style="color: #735c00; font-size: 11px; font-weight: 600; text-transform: uppercase; margin: 0 0 10px 0; font-family: 'Inter', sans-serif;">Uploaded Inspiration Visuals</h4>
              ${imagesHtml}
            </div>` : ''}

            <div style="text-align: center; margin-bottom: 35px;">
              <a href="${trackingLink}" style="display: inline-block; background-color: #2d2b29; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; font-family: 'Inter', sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.15); transition: all 0.3s;">
                View Event Workspace
              </a>
            </div>

            <div style="border-top: 1px solid #efeeeb; padding-top: 20px; text-align: center; font-family: 'Inter', sans-serif;">
              <p style="color: #a39c8c; font-size: 11px; line-height: 1.6; margin: 0;">
                Siri Arts & Crafts Studio • Handcrafted Traditional Luxury<br/>
                For real-time assistance, collaborate directly in your event studio workspace chat!
              </p>
            </div>
          </div>
        `,
        type: 'order',
        action: 'event_booking_submission',
      });
    } catch (err) {
      logger.error('Failed to send submission email to customer:', err);
    }

    // B. TO ADMINS: Send highly detailed email to all administrators
    for (const email of adminEmails) {
      try {
        await sendDirectEmail({
          email,
          subject: `🚨 [NEW EVENT BOOKING] ${customerName} - ${booking.title} (${booking.bookingId || 'PENDING'})`,
          customHtml: `
            <div style="background-color: #fcfcfc; font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; padding: 35px 25px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1a202c;">
              <div style="border-left: 4px solid #735c00; padding-left: 15px; margin-bottom: 20px;">
                <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #718096; display: block;">Administrative Dispatch</span>
                <h2 style="margin: 5px 0 0 0; font-size: 18px; color: #2d3748;">New Event Booking Inquiry Lodged</h2>
              </div>

              <div style="background-color: #f7fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px; font-size: 13.5px;">
                <p style="margin: 0 0 8px 0;"><strong>Booking ID:</strong> ${booking.bookingId || 'PENDING'}</p>
                <p style="margin: 0 0 8px 0;"><strong>Customer Name:</strong> ${customerName}</p>
                <p style="margin: 0 0 8px 0;"><strong>Email Address:</strong> ${customerEmail}</p>
                <p style="margin: 0 0 8px 0;"><strong>Contact Phone:</strong> ${customerPhone}</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;"/>
                <p style="margin: 0 0 8px 0;"><strong>Event Title:</strong> ${booking.title}</p>
                <p style="margin: 0 0 8px 0;"><strong>Event Type:</strong> ${booking.eventType}</p>
                <p style="margin: 0 0 8px 0;"><strong>Date & Time:</strong> ${eventDateStr} (${booking.timing?.start} - ${booking.timing?.end})</p>
                <p style="margin: 0 0 8px 0;"><strong>Venue Name:</strong> ${booking.venue?.name || 'Traditional Venue'}</p>
                <p style="margin: 0 0 8px 0;"><strong>Venue Address:</strong> ${booking.venue?.address} (${booking.venue?.isOutdoor ? 'Outdoor' : 'Indoor'})</p>
                ${booking.venue?.city ? `<p style="margin: 0 0 8px 0;"><strong>City:</strong> ${booking.venue.city} (${booking.venue.state || ''})</p>` : ''}
                ${booking.venue?.pincode ? `<p style="margin: 0 0 8px 0;"><strong>Pincode:</strong> ${booking.venue.pincode}</p>` : ''}
                ${booking.venue?.latitude && booking.venue?.longitude ? `<p style="margin: 0 0 8px 0;"><strong>GPS Stamp:</strong> ${booking.venue.latitude}, ${booking.venue.longitude}</p>` : ''}
                ${booking.venue?.googleMapsLink ? `<p style="margin: 0 0 8px 0;"><strong>Navigation Anchor:</strong> <a href="${booking.venue.googleMapsLink}" style="color: #735c00; font-weight: bold; text-decoration: underline;">Open Google Maps</a></p>` : ''}
              </div>

              <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; font-size: 13.5px;">
                <h4 style="margin: 0 0 8px 0; color: #4a5568;">Design Swatches & Layout Preferences</h4>
                <p style="margin: 0 0 6px 0;"><strong>Theme Color Swatches:</strong> ${booking.customization?.themeColor || 'Default'}</p>
                <p style="margin: 0 0 6px 0;"><strong>Floral Garlands:</strong> ${booking.customization?.floralPreference || 'Default'}</p>
                <p style="margin: 0 0 6px 0;"><strong>Lighting Ambience:</strong> ${booking.customization?.lightingPreference || 'Default'}</p>
                <p style="margin: 0 0 6px 0;"><strong>Stage Dimension:</strong> ${booking.customization?.stageSize || 'Default'}</p>
                ${booking.customization?.additionalRequests ? `<p style="margin: 8px 0 0 0; color: #718096; font-style: italic;">"Additional Requests: ${booking.customization.additionalRequests}"</p>` : ''}
              </div>

              ${addonsList ? `
              <div style="background-color: #f7fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px; font-size: 13px;">
                <h4 style="margin: 0 0 8px 0; color: #4a5568;">Selected Add-ons Checklist:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #4a5568;">
                  ${addonsList}
                </ul>
              </div>` : ''}

              ${imagesHtml ? `
              <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center;">
                <h4 style="margin: 0 0 8px 0; color: #4a5568; text-align: left;">Inspiration / Moodboard Reference Uploads:</h4>
                ${imagesHtml}
              </div>` : ''}

              <div style="text-align: center; margin-top: 25px;">
                <a href="${frontendUrl}/admin/bookings" style="display: inline-block; background-color: #735c00; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                  Open Admin Bookings Panel
                </a>
              </div>
            </div>
          `,
          type: 'order',
          action: 'admin_event_booking_lodged',
        });
      } catch (err) {
        logger.error(`Failed to send event booking dispatch email to admin (${email}):`, err);
      }
    }
  }

  /**
   * Send status transition update notification
   */
  static async sendStatusUpdateEmail(booking: any, oldStatus: string, newStatus: string) {
    const frontendUrl = getFrontendUrl();
    const trackingLink = `${frontendUrl}/dashboard`;
    const customerEmail = booking.user?.email || '';
    const customerName = booking.user?.name || 'Valued Guest';

    if (!customerEmail) return;

    try {
      await sendDirectEmail({
        email: customerEmail,
        subject: `Your Event Booking Status has Been Updated! ✦ Siri Arts & Crafts`,
        customHtml: `
          <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 45px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); box-sizing: border-box;">
            <div style="margin-bottom: 30px; text-align: center;">
              <div style="font-size: 26px; color: #735c00; margin-bottom: 10px; font-weight: 300;">✦</div>
              <h1 style="color: #735c00; font-size: 24px; font-weight: 300; letter-spacing: 4px; margin: 0; text-transform: uppercase;">Siri Arts</h1>
              <div style="width: 50px; height: 1px; background-color: #735c00; margin: 10px auto 0 auto; opacity: 0.25;"></div>
            </div>
            
            <h2 style="font-size: 18px; font-weight: 400; color: #2d2b29; margin-bottom: 20px; text-align: center; font-family: 'Didot', 'Georgia', serif;">Event Workspace Timeline Update</h2>
            
            <p style="color: #7f7663; font-size: 13.5px; line-height: 1.8; font-weight: 300; font-family: 'Inter', sans-serif; margin-bottom: 25px;">
              Dear ${customerName},<br/><br/>
              Your event booking <strong>"${booking.title}"</strong> (ID: ${booking.bookingId || 'PENDING'}) has transitioned on our production timeline.
            </p>

            <div style="background-color: #fbfaf8; border: 1px solid #d0c5af; border-radius: 12px; padding: 22px; margin-bottom: 30px; font-family: 'Inter', sans-serif; text-align: center;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #7f7663; display: block; margin-bottom: 8px;">Timeline Shift</span>
              <div style="display: inline-block; padding: 8px 16px; background-color: #efeeeb; border-radius: 20px; font-size: 12px; color: #7f7663; text-decoration: line-through; margin-right: 8px;">
                ${oldStatus.toUpperCase().replace(/_/g, ' ')}
              </div>
              <span style="font-size: 14px; color: #735c00; vertical-align: middle; font-weight: bold;">➔</span>
              <div style="display: inline-block; padding: 8px 16px; background-color: #735c00; border-radius: 20px; font-size: 12px; color: #ffffff; font-weight: bold; margin-left: 8px;">
                ${newStatus.toUpperCase().replace(/_/g, ' ')}
              </div>
            </div>

            <p style="color: #7f7663; font-size: 13px; line-height: 1.8; font-weight: 300; font-family: 'Inter', sans-serif; margin-bottom: 25px; text-align: center;">
              Log into your designer workspace dashboard to view layout checklists, chat live with your assigned artisans, and review itemized invoice quotes.
            </p>

            <div style="text-align: center; margin-bottom: 35px;">
              <a href="${trackingLink}" style="display: inline-block; background-color: #2d2b29; color: #ffffff; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; font-family: 'Inter', sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                Open Live Workspace
              </a>
            </div>

            <div style="border-top: 1px solid #efeeeb; padding-top: 20px; text-align: center; font-family: 'Inter', sans-serif;">
              <p style="color: #a39c8c; font-size: 11px; line-height: 1.6; margin: 0;">
                Siri Arts & Crafts Studio • Handcrafted Traditional Luxury<br/>
                This is an automated operational dispatch. Contact your curator in the workspace chat for adjustments.
              </p>
            </div>
          </div>
        `,
        type: 'order',
        action: 'event_booking_status_updated',
      });
    } catch (err) {
      logger.error('Failed to send status update email to customer:', err);
    }
  }
}
