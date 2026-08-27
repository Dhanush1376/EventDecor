import { getLuxuryEmailWrapper } from './emailTemplates';
import { getFrontendUrl } from '../getFrontendUrl';
import { getBackendUrl } from '../getBackendUrl';

// --- Shared Components ---

const formatCurrency = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const escapeHtml = (unsafe: any) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const button = (text: string, url: string) => `
  <div style="margin: 32px 0; text-align: center;">
    <a href="${url}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 6px; display: inline-block;">
      ${text}
    </a>
  </div>
`;

const textLink = (text: string, url: string) => `
  <a href="${url}" style="color: #4f46e5; text-decoration: underline; font-size: 14px; font-weight: 500;">
    ${text}
  </a>
`;

const dataTable = (rows: { label: string; value: string }[]) => {
  const rowsHtml = rows
    .map(
      (r) => `
    <tr>
      <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%;">${r.label}</td>
      <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${r.value}</td>
    </tr>
  `,
    )
    .join('');

  return `
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        ${rowsHtml}
      </table>
    </div>
  `;
};

const itemsTable = (items: any[]) => {
  const itemsHtml = items
    .map((item) => {
      const itemImage = item.imageSrc
        ? `<img src="${escapeHtml(item.imageSrc)}" alt="${escapeHtml(item.title || item.name)}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" />`
        : `<div style="width: 48px; height: 48px; background-color: #f3f4f6; border-radius: 4px; border: 1px solid #e5e7eb;"></div>`;

      return `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 0; width: 60px;">
        ${itemImage}
      </td>
      <td style="padding: 12px 0; font-size: 14px; color: #374151;">
        <strong style="color: #111827;">${escapeHtml(item.title || item.name || 'Item')}</strong><br/>
        <span style="color: #6b7280; font-size: 12px;">Qty: ${item.quantity || 1} × ${formatCurrency(item.price)}</span>
        ${item.variant ? `<br/><span style="color: #6b7280; font-size: 12px;">Variant: ${escapeHtml(item.variant)}</span>` : ''}
      </td>
      <td style="padding: 12px 0; font-size: 14px; text-align: right; color: #111827; font-family: monospace; font-weight: 500;">
        ${formatCurrency(item.price * (item.quantity || 1))}
      </td>
    </tr>
  `;
    })
    .join('');

  return `
    <div style="margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
            <th colspan="2" style="padding-bottom: 8px; font-size: 12px; color: #6b7280; text-transform: uppercase;">Item Description</th>
            <th style="padding-bottom: 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>
  `;
};

const totalsSummary = (
  subtotal: number,
  shipping: number,
  tax: number,
  total: number,
  discount: number = 0,
) => `
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right; width: 70%;">Subtotal:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(subtotal)}</td>
    </tr>
    ${
      discount > 0
        ? `
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #059669; text-align: right;">Discount:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #059669; text-align: right; font-family: monospace;">-${formatCurrency(discount)}</td>
    </tr>
    `
        : ''
    }
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right;">Shipping:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(shipping)}</td>
    </tr>
    ${
      tax > 0
        ? `
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right;">Tax:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(tax)}</td>
    </tr>
    `
        : ''
    }
    <tr style="border-top: 2px solid #e5e7eb;">
      <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 700; color: #111827; text-align: right;">Grand Total:</td>
      <td style="padding: 12px 0 0 0; font-size: 18px; font-weight: 700; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(total)}</td>
    </tr>
  </table>
`;

const addressBlock = (title: string, address: any) => {
  if (!address) return '';
  return `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #111827; font-size: 16px; margin-bottom: 12px;">${title}</h3>
      <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">
        ${escapeHtml(address.name)}<br/>
        ${escapeHtml(address.address)}<br/>
        ${address.locality ? escapeHtml(address.locality) + '<br/>' : ''}
        ${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.pincode)}<br/>
        ${escapeHtml(address.country)}<br/>
        Phone: ${escapeHtml(address.phone)}
      </p>
    </div>
  `;
};

const statusTimelineBlock = (history: any[]) => {
  if (!history || history.length === 0) return '';

  const timelineHtml = history
    .map((item, index) => {
      const isLast = index === history.length - 1;
      const date = item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN') : '';
      return `
      <div style="display: flex; margin-bottom: ${isLast ? '0' : '16px'};">
        <div style="margin-right: 16px; display: flex; flex-direction: column; align-items: center;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${isLast ? '#4f46e5' : '#d1d5db'};"></div>
          ${!isLast ? '<div style="width: 2px; flex-grow: 1; background-color: #e5e7eb; margin-top: 4px;"></div>' : ''}
        </div>
        <div>
          <div style="font-weight: ${isLast ? '600' : '500'}; color: ${isLast ? '#111827' : '#6b7280'}; font-size: 14px;">${escapeHtml(item.status)}</div>
          <div style="color: #9ca3af; font-size: 12px; margin-top: 2px;">${escapeHtml(date)}</div>
          ${item.note && isLast ? `<div style="color: #4b5563; font-size: 13px; margin-top: 4px; background-color: #f3f4f6; padding: 8px; border-radius: 4px;">${escapeHtml(item.note)}</div>` : ''}
        </div>
      </div>
    `;
    })
    .join('');

  return `
    <div style="margin-bottom: 32px; padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h3 style="color: #111827; font-size: 16px; margin-top: 0; margin-bottom: 16px;">Order History</h3>
      ${timelineHtml}
    </div>
  `;
};

// --- Order Templates ---

export const buildOrderConfirmationCustomerEmail = (order: any, user: any) => {
  const orderId = order.orderUuid || order.orderNumber || order._id;
  const preheader = `We've received your order #${orderId}`;

  // Create a link to the invoice if it's generated
  const invoiceLink = `<div style="text-align: center; margin-bottom: 24px;">${textLink('Download Invoice PDF', `${getBackendUrl()}/api/v1/documents/invoice/${order._id}`)}</div>`;

  const body = `
    <h2>Thank you for your order, ${escapeHtml(user?.name || order.shippingAddress?.name || 'Customer')}!</h2>
    <p>We've received your order <strong>#${orderId}</strong> and are getting it ready for shipment.</p>
    
    <h3 style="margin-top: 32px; color: #111827;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(order.subtotal, order.shippingFee || order.courierCharges || 0, order.tax?.totalTax || 0, order.total, order.discount || 0)}
    
    <div style="display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 32px;">
      <div style="flex: 1; min-width: 250px;">
        ${addressBlock('Shipping Address', order.shippingAddress)}
      </div>
      <div style="flex: 1; min-width: 250px;">
        <h3 style="color: #111827; font-size: 16px; margin-bottom: 12px;">Payment Details</h3>
        <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">
          Method: ${escapeHtml(order.paymentMethod || 'Razorpay')}<br/>
          Status: <strong>${escapeHtml(order.paymentStatus || 'Pending')}</strong>
        </p>
      </div>
    </div>
    
    ${invoiceLink}
    
    ${button('Track Your Order', `${getFrontendUrl()}/dashboard/orders`)}
  `;
  return {
    subject: `Order Confirmation — #${orderId}`,
    html: getLuxuryEmailWrapper('Order Confirmed', body, undefined, preheader),
  };
};

export const buildOrderConfirmationAdminEmail = (order: any) => {
  const orderId = order.orderUuid || order.orderNumber || order._id;

  const body = `
    <h2>New Order Received: #${orderId}</h2>
    <p>A new order has been placed on the store.</p>
    
    ${dataTable([
      { label: 'Customer', value: escapeHtml(order.shippingAddress?.name || 'Unknown') },
      { label: 'Email', value: escapeHtml(order.shippingAddress?.email || 'Unknown') },
      { label: 'Phone', value: escapeHtml(order.shippingAddress?.phone || 'Unknown') },
      { label: 'Total Value', value: formatCurrency(order.total) },
      {
        label: 'Payment',
        value: `${escapeHtml(order.paymentMethod)} (${escapeHtml(order.paymentStatus)})`,
      },
      { label: 'Order ID', value: escapeHtml(orderId) },
      { label: 'Database ID', value: escapeHtml(order._id) },
    ])}
    
    <h3 style="color: #111827;">Items Ordered</h3>
    ${itemsTable(order.items)}
    
    ${addressBlock('Shipping Address', order.shippingAddress)}
    
    ${button('View Order in Admin', `${getFrontendUrl()}/admin/orders/${order._id}`)}
  `;
  return {
    subject: `[NEW ORDER] #${orderId} - ${formatCurrency(order.total)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildOrderStatusChangeEmail = (order: any, oldStatus: string, newStatus: string) => {
  const orderId = order.orderUuid || order.orderNumber || order._id;
  const preheader = `Your order #${orderId} is now ${newStatus}`;
  const invoiceLink = `<div style="text-align: center; margin-bottom: 24px;">${textLink('Download Invoice PDF', `${getBackendUrl()}/api/v1/documents/invoice/${order._id}`)}</div>`;
  const body = `
    <h2>Order Status Update</h2>
    <p>Dear ${escapeHtml(order.shippingAddress?.name || 'Customer')},</p>
    <p>The status of your order <strong>#${escapeHtml(orderId)}</strong> has been updated to <strong>${escapeHtml(newStatus)}</strong>.</p>
    
    ${dataTable([
      { label: 'Previous Status', value: escapeHtml(oldStatus) },
      { label: 'New Status', value: escapeHtml(newStatus) },
      ...(order.trackingNumber
        ? [{ label: 'Tracking Number', value: escapeHtml(order.trackingNumber) }]
        : []),
      ...(order.courierPartner
        ? [{ label: 'Courier', value: escapeHtml(order.courierPartner) }]
        : []),
    ])}
    
    <h3 style="margin-top: 32px; color: #111827;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(order.subtotal, order.shippingFee || order.courierCharges || 0, order.tax?.totalTax || 0, order.total, order.discount || 0)}
    
    ${order.trackingNumber ? button('Track Shipment', `${getFrontendUrl()}/tracking?order=${orderId}`) : ''}
    
    ${invoiceLink}
    
    ${button('View Order Details', `${getFrontendUrl()}/dashboard/orders`)}
  `;
  return {
    subject: `Your Order #${orderId} is now ${newStatus}`,
    html: getLuxuryEmailWrapper('Order Status Update', body, undefined, preheader),
  };
};

export const buildPaymentFailedEmail = (order: any, reason: string) => {
  const orderId = order.orderUuid || order.orderNumber || order._id;
  const preheader = `Payment failed for order #${orderId}`;
  const body = `
    <h2 style="color: #dc2626;">Payment Failed</h2>
    <p>We were unable to process the payment for your order <strong>#${orderId}</strong>.</p>
    
    ${dataTable([
      { label: 'Reason', value: escapeHtml(reason) },
      { label: 'Order Value', value: formatCurrency(order.total || 0) },
    ])}
    
    <p>Please try completing the payment again or contact support if the issue persists.</p>
    
    ${button('Retry Payment', `${getFrontendUrl()}/checkout/payment-retry/${order._id}`)}
  `;
  return {
    subject: `Payment Failed - Order #${orderId}`,
    html: getLuxuryEmailWrapper('Payment Alert', body, undefined, preheader),
  };
};

// --- Custom Order Templates ---

export const buildCustomOrderCustomerEmail = (order: any) => {
  const orderId = order.orderUuid || order.customOrderId || order._id;
  const preheader = `We've received your custom design request.`;
  const body = `
    <h2>Your Custom Design Request Received</h2>
    <p>Dear ${escapeHtml(order.customerName || 'Valued Guest')},</p>
    <p>Thank you for trusting Siri Arts & Crafts. Our design team is reviewing your requirements for <strong>#${escapeHtml(orderId)}</strong> and will reach out shortly.</p>
    
    ${dataTable([
      { label: 'Occasion', value: escapeHtml(order.occasion || 'N/A') },
      { label: 'Category', value: escapeHtml(order.productType || 'N/A') },
      { label: 'Target Budget', value: formatCurrency(order.budget) },
    ])}
    
    ${button('View Request Dashboard', `${getFrontendUrl()}/dashboard/custom-orders`)}
  `;
  return {
    subject: `Custom Design Request Received — #${orderId}`,
    html: getLuxuryEmailWrapper('Custom Order Acknowledgment', body, undefined, preheader),
  };
};

export const buildCustomOrderAdminEmail = (order: any) => {
  const orderId = order.orderUuid || order.customOrderId || order._id;
  const body = `
    <h2>New Custom Order Request: #${orderId}</h2>
    <p>A new custom design request has been submitted.</p>
    
    ${dataTable([
      { label: 'Customer', value: escapeHtml(order.customerName || 'Unknown') },
      { label: 'Email', value: escapeHtml(order.customerEmail || 'Unknown') },
      { label: 'Phone', value: escapeHtml(order.customerPhone || 'N/A') },
      { label: 'Occasion', value: escapeHtml(order.occasion || 'N/A') },
      { label: 'Budget', value: formatCurrency(order.budget) },
      {
        label: 'Event Date',
        value: escapeHtml(
          order.eventDate ? new Date(order.eventDate).toLocaleDateString() : 'Flexible',
        ),
      },
    ])}
    
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 16px;">
      <p style="margin: 0; white-space: pre-wrap; font-style: italic;">"${escapeHtml(order.customRequirements || 'No special requirements provided.')}"</p>
    </div>
    
    ${button('Manage Request', `${getFrontendUrl()}/admin/custom-orders/${order._id}`)}
  `;
  return {
    subject: `[CUSTOM ORDER] New Request #${orderId} from ${escapeHtml(order.customerName)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildCustomOrderStatusChangeEmail = (order: any, previousStatus: string) => {
  const orderId = order.orderUuid || order.customOrderId || order._id;
  const preheader = `Status update for your custom order: ${order.status}`;
  const body = `
    <h2>Status Update</h2>
    <p>Dear ${escapeHtml(order.customerName)},</p>
    <p>The status of your custom order <strong>#${escapeHtml(orderId)}</strong> has been updated to <strong>${escapeHtml(order.status)}</strong>.</p>
    
    ${dataTable([
      { label: 'Previous Status', value: escapeHtml(previousStatus) },
      { label: 'New Status', value: escapeHtml(order.status) },
    ])}
    
    ${button('View Details', `${getFrontendUrl()}/dashboard/custom-orders`)}
  `;
  return {
    subject: `Custom Order #${orderId} is now ${escapeHtml(order.status)}`,
    html: getLuxuryEmailWrapper('Custom Order Update', body, undefined, preheader),
  };
};

// --- Inquiry Templates ---

export const buildInquiryCustomerEmail = (inquiry: any) => {
  const body = `
    <h2>We Received Your Inquiry</h2>
    <p>Dear ${escapeHtml(inquiry.name)},</p>
    <p>Thank you for reaching out to Siri Arts & Crafts regarding "${escapeHtml(inquiry.subject)}". We have received your message and our team will get back to you within 24-48 hours.</p>
    <p>For urgent matters, you can reach us via our support line.</p>
  `;
  return {
    subject: `We Received Your Inquiry - Siri Arts & Crafts`,
    html: getLuxuryEmailWrapper('Inquiry Acknowledgment', body),
  };
};

export const buildInquiryAdminEmail = (inquiry: any) => {
  const body = `
    <h2>New Inquiry Received</h2>
    ${dataTable([
      { label: 'Name', value: escapeHtml(inquiry.name) },
      { label: 'Email', value: escapeHtml(inquiry.email) },
      { label: 'Subject', value: escapeHtml(inquiry.subject) },
    ])}
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 16px;">
      <p style="margin: 0; white-space: pre-wrap; font-size: 14px;">${escapeHtml(inquiry.message)}</p>
    </div>
  `;
  return {
    subject: `[INQUIRY] ${escapeHtml(inquiry.subject)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

// --- Event Booking Templates ---

export const buildEventBookingCustomerEmail = (booking: any, user: any) => {
  const customerName = user?.name || booking.user?.name || 'Valued Guest';
  const bookingId = booking.bookingId || booking._id;
  const eventDateStr = booking.date
    ? new Date(booking.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'To be confirmed';

  const rows: { label: string; value: string }[] = [
    { label: 'Booking ID', value: escapeHtml(bookingId) },
    { label: 'Event Title', value: escapeHtml(booking.title || 'Event Booking') },
    { label: 'Event Type', value: escapeHtml(booking.eventType || 'N/A') },
    { label: 'Date', value: escapeHtml(eventDateStr) },
  ];
  if (booking.venue?.name) rows.push({ label: 'Venue', value: escapeHtml(booking.venue.name) });
  if (booking.venue?.address)
    rows.push({ label: 'Address', value: escapeHtml(booking.venue.address) });

  const preheader = `Your event booking request #${bookingId} has been received.`;
  const body = `
    <h2>Your Event Booking is Received</h2>
    <p>Dear ${escapeHtml(customerName)},</p>
    <p>Thank you for choosing Siri Arts & Crafts. Your event booking request <strong>#${escapeHtml(bookingId)}</strong> has been successfully submitted. Our team is reviewing your requirements and will get back to you shortly.</p>

    <h3 style="color: #111827;">Booking Details</h3>
    ${dataTable(rows)}

    ${button('View Your Bookings', `${getFrontendUrl()}/dashboard/events`)}
  `;
  return {
    subject: `Event Booking Request Received — #${bookingId}`,
    html: getLuxuryEmailWrapper('Booking Confirmed', body, undefined, preheader),
  };
};

export const buildEventBookingAdminEmail = (booking: any, user: any) => {
  const customerName = user?.name || booking.user?.name || 'Unknown';
  const customerEmail = user?.email || booking.user?.email || 'Unknown';
  const bookingId = booking.bookingId || booking._id;
  const eventDateStr = booking.date
    ? new Date(booking.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not specified';

  const rows: { label: string; value: string }[] = [
    { label: 'Booking ID', value: escapeHtml(bookingId) },
    { label: 'Customer', value: escapeHtml(customerName) },
    { label: 'Email', value: escapeHtml(customerEmail) },
    { label: 'Event Title', value: escapeHtml(booking.title || 'Event Booking') },
    { label: 'Event Type', value: escapeHtml(booking.eventType || 'N/A') },
    { label: 'Date', value: escapeHtml(eventDateStr) },
  ];
  if (booking.venue?.name) rows.push({ label: 'Venue', value: escapeHtml(booking.venue.name) });
  if (booking.venue?.address)
    rows.push({ label: 'Address', value: escapeHtml(booking.venue.address) });
  if (booking.venue?.city) rows.push({ label: 'City', value: escapeHtml(booking.venue.city) });

  const body = `
    <h2>New Event Booking Request: #${bookingId}</h2>
    <p>A new event booking inquiry has been submitted on the platform.</p>

    ${dataTable(rows)}

    ${button('Manage Booking', `${getFrontendUrl()}/admin/bookings/${booking._id}`)}
  `;
  return {
    subject: `[NEW BOOKING] #${bookingId} from ${escapeHtml(customerName)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

// --- Return/Exchange Templates ---

export const buildReturnCreatedCustomerEmail = (returnRequest: any, order: any, user: any) => {
  const customerName = user?.name || 'Valued Customer';
  const isExchange = returnRequest.returnType === 'exchange';
  const requestId = returnRequest.returnId || returnRequest._id;

  const rows: { label: string; value: string }[] = [
    { label: 'Request ID', value: escapeHtml(requestId) },
    { label: 'Type', value: isExchange ? 'Exchange' : 'Return' },
    { label: 'Items', value: `${returnRequest.items?.length || 0} item(s)` },
    { label: 'Status', value: escapeHtml(returnRequest.status || 'Submitted') },
  ];

  const preheader = `Your ${isExchange ? 'exchange' : 'return'} request #${requestId} has been submitted.`;
  const body = `
    <h2>${isExchange ? 'Exchange' : 'Return'} Request Submitted</h2>
    <p>Dear ${escapeHtml(customerName)},</p>
    <p>We've received your ${isExchange ? 'exchange' : 'return'} request <strong>#${escapeHtml(requestId)}</strong> and our team will review it shortly.</p>

    ${dataTable(rows)}

    ${
      order
        ? `
    <h3 style="margin-top: 32px; color: #111827;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(
      order.subtotal,
      order.shippingFee || order.courierCharges || 0,
      order.tax?.totalTax || 0,
      order.total,
      order.discount || 0,
    )}
    `
        : ''
    }

    ${button('Track Your Request', `${getFrontendUrl()}/dashboard/returns`)}
  `;
  return {
    subject: `${isExchange ? 'Exchange' : 'Return'} Request Received — #${escapeHtml(requestId)}`,
    html: getLuxuryEmailWrapper(
      `${isExchange ? 'Exchange' : 'Return'} Request`,
      body,
      undefined,
      preheader,
    ),
  };
};

export const buildReturnStatusUpdateEmail = (
  returnRequest: any,
  order: any,
  user: any,
  previousStatus: string,
  newStatus: string,
) => {
  const customerName = user?.name || 'Valued Customer';
  const isExchange = returnRequest.returnType === 'exchange';
  const requestId = returnRequest.returnId || returnRequest._id;

  const rows: { label: string; value: string }[] = [
    { label: 'Request ID', value: escapeHtml(requestId) },
    { label: 'Previous Status', value: escapeHtml(previousStatus) },
    { label: 'New Status', value: escapeHtml(newStatus) },
  ];

  const preheader = `Status update for your ${isExchange ? 'exchange' : 'return'} request #${requestId}.`;
  const body = `
    <h2>${isExchange ? 'Exchange' : 'Return'} Status Update</h2>
    <p>Dear ${escapeHtml(customerName)},</p>
    <p>The status of your ${isExchange ? 'exchange' : 'return'} request <strong>#${escapeHtml(requestId)}</strong> has been updated to <strong>${escapeHtml(newStatus)}</strong>.</p>

    ${dataTable(rows)}

    ${
      order
        ? `
    <h3 style="margin-top: 32px; color: #111827;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(
      order.subtotal,
      order.shippingFee || order.courierCharges || 0,
      order.tax?.totalTax || 0,
      order.total,
      order.discount || 0,
    )}
    `
        : ''
    }

    ${button('View Details', `${getFrontendUrl()}/dashboard/returns`)}
  `;
  return {
    subject: `Your ${isExchange ? 'Exchange' : 'Return'} Request #${escapeHtml(requestId)} is now ${escapeHtml(newStatus)}`,
    html: getLuxuryEmailWrapper(
      `${isExchange ? 'Exchange' : 'Return'} Update`,
      body,
      undefined,
      preheader,
    ),
  };
};
