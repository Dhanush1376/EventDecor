import { getLuxuryEmailWrapper } from './emailTemplates';
import { getFrontendUrl } from '../getFrontendUrl';

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
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 0; font-size: 14px; color: #374151;">
        <strong style="color: #111827;">${escapeHtml(item.title || item.name || 'Item')}</strong><br/>
        <span style="color: #6b7280; font-size: 12px;">Qty: ${item.quantity || 1}</span>
      </td>
      <td style="padding: 12px 0; font-size: 14px; text-align: right; color: #111827; font-family: monospace; font-weight: 500;">
        ${formatCurrency(item.price * (item.quantity || 1))}
      </td>
    </tr>
  `,
    )
    .join('');

  return `
    <div style="margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
            <th style="padding-bottom: 8px; font-size: 12px; color: #6b7280; text-transform: uppercase;">Item Description</th>
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

// --- Order Templates ---

export const buildOrderConfirmationCustomerEmail = (order: any, user: any) => {
  const preheader = `We've received your order #\${order.orderId || order._id}`;
  const body = `
    <h2>Thank you for your order, ${escapeHtml(user?.name || order.shippingAddress?.name || 'Customer')}!</h2>
    <p>We've received your order <strong>#${order.orderId || order._id}</strong> and are getting it ready for shipment.</p>
    
    <h3 style="margin-top: 32px; color: #111827;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(order.subtotal, order.shippingFee || order.courierCharges || 0, order.tax?.totalTax || 0, order.total, order.discount || 0)}
    
    <h3 style="color: #111827;">Payment & Delivery</h3>
    ${dataTable([
      { label: 'Payment Method', value: escapeHtml(order.paymentMethod || 'Razorpay') },
      { label: 'Payment Status', value: escapeHtml(order.paymentStatus || 'Pending') },
      {
        label: 'Shipping To',
        value: escapeHtml(
          (order.shippingAddress?.city || '') + ', ' + (order.shippingAddress?.state || ''),
        ),
      },
    ])}
    
    ${button('Track Your Order', `\${getFrontendUrl()}/profile/orders`)}
  `;
  return {
    subject: `Order Confirmation - #\${order.orderId || order._id}`,
    html: getLuxuryEmailWrapper('Order Confirmed', body, undefined, preheader),
  };
};

export const buildOrderConfirmationAdminEmail = (order: any) => {
  const body = `
    <h2>New Order Received: #${order.orderId || order._id}</h2>
    <p>A new order has been placed on the store.</p>
    
    ${dataTable([
      { label: 'Customer', value: escapeHtml(order.shippingAddress?.name || 'Unknown') },
      { label: 'Email', value: escapeHtml(order.shippingAddress?.email || 'Unknown') },
      { label: 'Phone', value: escapeHtml(order.shippingAddress?.phone || 'Unknown') },
      { label: 'Total Value', value: formatCurrency(order.total) },
      {
        label: 'Payment',
        value: `\${escapeHtml(order.paymentMethod)} (\${escapeHtml(order.paymentStatus)})`,
      },
    ])}
    
    <h3 style="color: #111827;">Items Ordered</h3>
    ${itemsTable(order.items)}
    
    ${button('View Order in Admin', `\${getFrontendUrl()}/admin/orders/\${order._id}`)}
  `;
  return {
    subject: `[NEW ORDER] #\${order.orderId || order._id} - \${formatCurrency(order.total)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildOrderStatusChangeEmail = (order: any, oldStatus: string, newStatus: string) => {
  const preheader = `Status update for order #\${order.orderId || order._id}: \${newStatus}`;
  const body = `
    <h2>Order Status Update</h2>
    <p>The status of your order <strong>#${order.orderId || order._id}</strong> has been updated.</p>
    
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
    
    ${button('View Order', `\${getFrontendUrl()}/profile/orders`)}
  `;
  return {
    subject: `Order Update: \${newStatus} - #\${order.orderId || order._id}`,
    html: getLuxuryEmailWrapper('Order Status Update', body, undefined, preheader),
  };
};

export const buildPaymentFailedEmail = (order: any, reason: string) => {
  const preheader = `Payment failed for order #\${order.orderId || order._id}`;
  const body = `
    <h2 style="color: #dc2626;">Payment Failed</h2>
    <p>We were unable to process the payment for your order <strong>#${order.orderId || order._id}</strong>.</p>
    
    ${dataTable([
      { label: 'Reason', value: escapeHtml(reason) },
      { label: 'Order Value', value: formatCurrency(order.total || 0) },
    ])}
    
    <p>Please try completing the payment again or contact support if the issue persists.</p>
    
    ${button('Retry Payment', `\${getFrontendUrl()}/checkout/payment-retry/\${order._id}`)}
  `;
  return {
    subject: `Payment Failed - Order #\${order.orderId || order._id}`,
    html: getLuxuryEmailWrapper('Payment Alert', body, undefined, preheader),
  };
};

// --- Custom Order Templates ---

export const buildCustomOrderCustomerEmail = (order: any) => {
  const preheader = `We've received your custom design request.`;
  const body = `
    <h2>Your Custom Design Request Received</h2>
    <p>Dear ${escapeHtml(order.customerName || 'Valued Guest')},</p>
    <p>Thank you for trusting Siri Arts & Crafts. Our design team is reviewing your requirements and will reach out shortly.</p>
    
    ${dataTable([
      { label: 'Occasion', value: escapeHtml(order.occasion || 'N/A') },
      { label: 'Category', value: escapeHtml(order.productType || 'N/A') },
      { label: 'Target Budget', value: formatCurrency(order.budget) },
    ])}
    
    ${button('View Request Dashboard', `\${getFrontendUrl()}/custom-orders`)}
  `;
  return {
    subject: `Custom Design Request Received`,
    html: getLuxuryEmailWrapper('Custom Order Acknowledgment', body, undefined, preheader),
  };
};

export const buildCustomOrderAdminEmail = (order: any) => {
  const body = `
    <h2>New Custom Order Request</h2>
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
    
    <p style="margin-top: 20px; font-style: italic;">"${escapeHtml(order.customRequirements || 'No special requirements provided.')}"</p>
    
    ${button('Manage Request', `\${getFrontendUrl()}/admin/inquiries`)}
  `;
  return {
    subject: `[CUSTOM ORDER] New Request from \${escapeHtml(order.customerName)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildCustomOrderStatusChangeEmail = (order: any, previousStatus: string) => {
  const preheader = `Status update for your custom order: \${order.status}`;
  const body = `
    <h2>Status Update</h2>
    <p>Dear ${escapeHtml(order.customerName)},</p>
    <p>The status of your custom order <strong>${escapeHtml(order.orderId || order._id)}</strong> has been updated.</p>
    
    ${dataTable([
      { label: 'Previous Status', value: escapeHtml(previousStatus) },
      { label: 'New Status', value: escapeHtml(order.status) },
    ])}
    
    ${button('View Details', `\${getFrontendUrl()}/custom-orders`)}
  `;
  return {
    subject: `Status Update for Your Custom Order`,
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
    subject: `[INQUIRY] \${escapeHtml(inquiry.subject)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};
