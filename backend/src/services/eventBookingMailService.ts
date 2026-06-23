import { sendDirectEmail } from './notificationService';
import logger from '../config/logger';
import { getAdminEmails } from '../config/adminConfig';

import { getFrontendUrl } from '../utils/getFrontendUrl';

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

    const addonsList = (booking.selectedAddons || [])
      .map((a: any) => `<li>${a.name} (+₹${Number(a.price).toLocaleString('en-IN')})</li>`)
      .join('');

    const imagesHtml = (booking.inspirationImages || [])
      .map(
        (img: string) => `
      <div style="margin: 10px; display: inline-block;">
        <img src="${img}" style="max-width: 150px; border-radius: 8px; border: 1px solid #efeeeb;" alt="Inspiration Image" />
      </div>
    `,
      )
      .join(''); // A. TO CUSTOMER: Elegant confirmation email
    try {
      await sendDirectEmail({
        email: customerEmail,
        subject: `Your Landmark Occasion Blueprint is Lodged! ✦ Siri Arts & Crafts`,
        customHtml: `
          <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">Your Event Booking is Received</h2>
          
          <p style="margin: 0 0 24px 0;">
            Dear ${customerName},<br/><br/>
            Thank you for choosing Siri Arts & Crafts. Your luxury event design and setup inquiry has been successfully logged! Our senior designers and coordinators are actively reviewing your floorplans, venue parameters, and Pinterest inspiration boards to construct a bespoke proposal.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #0f172a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Reservation Specifications</h3>
            <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 130px;">Booking ID:</td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${booking.bookingId || 'SR-BK-PENDING'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Event Title:</td>
                <td style="padding: 6px 0; font-weight: bold;">${booking.title}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Event Type:</td>
                <td style="padding: 6px 0; font-weight: bold; text-transform: capitalize;">${booking.eventType}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Date & Time:</td>
                <td style="padding: 6px 0; font-weight: bold;">${eventDateStr} (${booking.timing?.start} - ${booking.timing?.end})</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Venue Name:</td>
                <td style="padding: 6px 0; font-weight: bold;">${booking.venue?.name || 'Traditional Venue'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Venue Address:</td>
                <td style="padding: 6px 0; font-weight: bold;">${booking.venue?.address}</td>
              </tr>
              ${booking.venue?.city ? `<tr><td style="padding: 6px 0; color: #64748b;">City / Town:</td><td style="padding: 6px 0; font-weight: bold;">${booking.venue.city} (${booking.venue.state || ''})</td></tr>` : ''}
              ${booking.venue?.pincode ? `<tr><td style="padding: 6px 0; color: #64748b;">Pincode/ZIP:</td><td style="padding: 6px 0; font-weight: bold;">${booking.venue.pincode}</td></tr>` : ''}
              ${booking.venue?.latitude && booking.venue?.longitude ? `<tr><td style="padding: 6px 0; color: #64748b;">GPS Stamp:</td><td style="padding: 6px 0; font-weight: bold; font-family: monospace;">${Number(booking.venue.latitude).toFixed(6)}, ${Number(booking.venue.longitude).toFixed(6)}</td></tr>` : ''}
              ${booking.venue?.googleMapsLink ? `<tr><td style="padding: 6px 0; color: #64748b;">Interactive Map:</td><td style="padding: 6px 0; font-weight: bold;"><a href="${booking.venue.googleMapsLink}" style="color: #0f172a; text-decoration: underline;">Open Google Maps Navigation</a></td></tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Venue Style:</td>
                <td style="padding: 6px 0; font-weight: bold;">${booking.venue?.isOutdoor ? 'Outdoor Celebration' : 'Indoor Ceremony'}</td>
              </tr>
              ${
                booking.customization?.themeColor
                  ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Theme Palette:</td>
                <td style="padding: 6px 0; font-weight: bold;">${booking.customization.themeColor}</td>
              </tr>`
                  : ''
              }
            </table>
          </div>

          ${
            addonsList
              ? `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h4 style="color: #0f172a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px 0;">Selected Custom Add-ons</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
              ${addonsList}
            </ul>
          </div>`
              : ''
          }

          ${
            imagesHtml
              ? `
          <div style="margin-bottom: 24px;">
            <h4 style="color: #0f172a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px 0; text-align: left;">Uploaded Inspiration Visuals</h4>
            ${imagesHtml}
          </div>`
              : ''
          }

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${trackingLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
              View Event Workspace
            </a>
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
            <div style="border-left: 4px solid #0f172a; padding-left: 16px; margin-bottom: 24px;">
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; display: block;">Administrative Dispatch</span>
              <h2 style="margin: 4px 0 0 0; font-size: 18px; color: #0f172a; font-weight: 600;">New Event Booking Inquiry Lodged</h2>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 13.5px; color: #334155;">
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
              ${booking.venue?.googleMapsLink ? `<p style="margin: 0 0 8px 0;"><strong>Navigation Anchor:</strong> <a href="${booking.venue.googleMapsLink}" style="color: #0f172a; font-weight: bold; text-decoration: underline;">Open Google Maps</a></p>` : ''}
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 13.5px; color: #334155;">
              <h4 style="margin: 0 0 8px 0; color: #0f172a; font-weight: 600;">Design Swatches & Layout Preferences</h4>
              <p style="margin: 0 0 6px 0;"><strong>Theme Color Swatches:</strong> ${booking.customization?.themeColor || 'Default'}</p>
              <p style="margin: 0 0 6px 0;"><strong>Floral Garlands:</strong> ${booking.customization?.floralPreference || 'Default'}</p>
              <p style="margin: 0 0 6px 0;"><strong>Lighting Ambience:</strong> ${booking.customization?.lightingPreference || 'Default'}</p>
              <p style="margin: 0 0 6px 0;"><strong>Stage Dimension:</strong> ${booking.customization?.stageSize || 'Default'}</p>
              ${booking.customization?.additionalRequests ? `<p style="margin: 8px 0 0 0; color: #64748b; font-style: italic;">"Additional Requests: ${booking.customization.additionalRequests}"</p>` : ''}
            </div>

            ${
              addonsList
                ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 13px; color: #334155;">
              <h4 style="margin: 0 0 8px 0; color: #0f172a; font-weight: 600;">Selected Add-ons Checklist:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #334155;">
                ${addonsList}
              </ul>
            </div>`
                : ''
            }

            ${
              imagesHtml
                ? `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center; color: #334155;">
              <h4 style="margin: 0 0 8px 0; color: #0f172a; text-align: left; font-weight: 600;">Inspiration / Moodboard Reference Uploads:</h4>
              ${imagesHtml}
            </div>`
                : ''
            }

            <div style="text-align: center; margin-top: 24px;">
              <a href="${frontendUrl}/admin/bookings" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
                Open Admin Bookings Panel
              </a>
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
          <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">Event Workspace Timeline Update</h2>
          
          <p style="margin: 0 0 24px 0;">
            Dear ${customerName},<br/><br/>
            Your event booking <strong>"${booking.title}"</strong> (ID: ${booking.bookingId || 'PENDING'}) has transitioned on our production timeline.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px; margin-bottom: 24px; text-align: center;">
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 8px;">Timeline Shift</span>
            <div style="display: inline-block; padding: 8px 16px; background-color: #e2e8f0; border-radius: 20px; font-size: 12px; color: #64748b; text-decoration: line-through; margin-right: 8px;">
              ${oldStatus.toUpperCase().replace(/_/g, ' ')}
            </div>
            <span style="font-size: 14px; color: #0f172a; vertical-align: middle; font-weight: bold;">➔</span>
            <div style="display: inline-block; padding: 8px 16px; background-color: #0f172a; border-radius: 20px; font-size: 12px; color: #ffffff; font-weight: bold; margin-left: 8px;">
              ${newStatus.toUpperCase().replace(/_/g, ' ')}
            </div>
          </div>

          <p style="margin: 0 0 24px 0;">
            Log into your designer workspace dashboard to view layout checklists, chat live with your assigned artisans, and review itemized invoice quotes.
          </p>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${trackingLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
              Open Live Workspace
            </a>
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
