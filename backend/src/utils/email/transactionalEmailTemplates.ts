import {
  getLuxuryEmailWrapper,
  formatCurrency,
  escapeHtml,
  dataTable,
  button,
  getPrimaryEntityName,
} from './emailTemplates';
import { getBackendUrl } from '../getBackendUrl';
import { getFrontendUrl } from '../getFrontendUrl';

const resolveImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const backend = getBackendUrl();
  const isLocal = backend.includes('localhost');
  // For local testing, use a placeholder so the layout isn't broken with a blank box,
  // since Gmail proxies can't access localhost.
  if (isLocal) {
    return 'https://placehold.co/100x100/f3f4f6/374151?text=Event+Decor';
  }

  return url.startsWith('/') ? `${backend}${url}` : `${backend}/${url}`;
};

const itemsTable = (items: any[]) => {
  const itemsHtml = items
    .map((item) => {
      const itemImage = item.imageSrc
        ? `<img src="${escapeHtml(resolveImageUrl(item.imageSrc))}" alt="${escapeHtml(item.title || item.name)}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" />`
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
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right; width: 65%;">Subtotal:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace; width: 35%;">${formatCurrency(subtotal)}</td>
    </tr>
    ${
      discount > 0
        ? `
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #059669; text-align: right; width: 65%;">Discount:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #059669; text-align: right; font-family: monospace; width: 35%;">-${formatCurrency(discount)}</td>
    </tr>
    `
        : ''
    }
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right; width: 65%;">Shipping:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace; width: 35%;">${formatCurrency(shipping)}</td>
    </tr>
    ${
      tax > 0
        ? `
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right; width: 65%;">Tax:</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace; width: 35%;">${formatCurrency(tax)}</td>
    </tr>
    `
        : ''
    }
    <tr style="border-top: 2px solid #e5e7eb;">
      <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 700; color: #111827; text-align: right; width: 65%;">Grand Total:</td>
      <td style="padding: 12px 0 0 0; font-size: 18px; font-weight: 700; color: #111827; text-align: right; font-family: monospace; width: 35%;">${formatCurrency(total)}</td>
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

// --- Event Booking Reusable Components ---

export const formatBookingStatus = (statusStr: string) => {
  if (!statusStr) return 'Unknown';
  return statusStr
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const buildStatusBadge = (status: string) => {
  let bgColor = '#e2e8f0'; // slate-200
  let textColor = '#475569'; // slate-600

  const s = status.toLowerCase();
  if (['confirmed', 'completed', 'paid'].includes(s)) {
    bgColor = '#dcfce7'; // green-100
    textColor = '#166534'; // green-800
  } else if (
    [
      'payment_pending',
      'pending_payment',
      'payment_processing',
      'advance_payment',
      'partial',
    ].includes(s)
  ) {
    bgColor = '#fef9c3'; // yellow-100
    textColor = '#854d0e'; // yellow-800
  } else if (['cancelled', 'failed', 'refunded'].includes(s)) {
    bgColor = '#fee2e2'; // red-100
    textColor = '#991b1b'; // red-800
  } else if (['team_assigned', 'setup_in_progress', 'execution'].includes(s)) {
    bgColor = '#dbeafe'; // blue-100
    textColor = '#1e40af'; // blue-800
  }

  return `<span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: ${bgColor}; color: ${textColor}; text-transform: uppercase; letter-spacing: 0.05em;">${formatBookingStatus(status)}</span>`;
};

export const buildBookingReferenceCard = (bookingId: string, status: string) => `
  <div style="margin-bottom: 32px;">
    ${dataTable([
      {
        label: 'Booking ID',
        value: `<span style="font-family: monospace; font-weight: 600; color: #111827;">${escapeHtml(bookingId)}</span>`,
      },
      { label: 'Status', value: buildStatusBadge(status) },
    ])}
  </div>
`;

export const buildEventPackageItemsTable = (booking: any) => {
  const items = [];

  // Main Package
  if (booking.eventPackage || booking.title) {
    const pkgImage =
      booking.eventPackage?.image ||
      booking.eventPackage?.imageSrc ||
      booking.eventPackage?.images?.[0] ||
      booking.inspirationImages?.[0] ||
      '';

    items.push({
      imageSrc: pkgImage,
      title: booking.eventPackage?.title || booking.title || booking.eventType || 'Event Package',
      quantity: 1,
      price: booking.pricing?.rentalFee || booking.pricing?.totalPrice || 0,
      variant: booking.customization?.themeColor || '',
    });
  }

  // Addons
  if (booking.selectedAddons && booking.selectedAddons.length > 0) {
    booking.selectedAddons.forEach((addon: any) => {
      items.push({
        title: addon.name || 'Add-on',
        quantity: addon.quantity || 1,
        price: addon.price || 0,
        imageSrc: '',
      });
    });
  }

  if (items.length === 0) return '';

  return `
    <h3 style="margin-top: 32px; color: #111827; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Package Details</h3>
    ${itemsTable(items)}
  `;
};

export const buildEventDetailsCard = (booking: any) => {
  const rows = [];

  if (booking.title || booking.eventType) {
    rows.push({ label: 'Event', value: escapeHtml(booking.title || booking.eventType) });
  }

  if (booking.date) {
    rows.push({
      label: 'Date',
      value: new Date(booking.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    });
  }

  if (booking.timing && booking.timing.start && booking.timing.end) {
    rows.push({
      label: 'Time',
      value: `${escapeHtml(booking.timing.start)} - ${escapeHtml(booking.timing.end)}`,
    });
  }

  if (booking.venue && (booking.venue.name || booking.venue.address || booking.venue.city)) {
    const venueParts = [booking.venue.name, booking.venue.city || booking.venue.address].filter(
      Boolean,
    );
    rows.push({ label: 'Location', value: escapeHtml(venueParts.join(', ')) });
  }

  if (booking.eventPackage && booking.eventPackage.title) {
    rows.push({ label: 'Package', value: escapeHtml(booking.eventPackage.title) });
  }

  return `
    <h3 style="color: #111827; margin-bottom: 16px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Event Details</h3>
    ${dataTable(rows)}
  `;
};

export const buildBookingPaymentSummary = (pricing: any) => {
  if (!pricing) return '';

  let html = `<h3 style="color: #111827; margin-top: 32px; margin-bottom: 16px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Payment Summary</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">`;

  if (pricing.rentalFee) {
    html += `<tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: left; width: 70%;">Event Amount</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(pricing.rentalFee)}</td>
    </tr>`;
  }

  if (pricing.setupCharges) {
    html += `<tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: left;">Setup Charges</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(pricing.setupCharges)}</td>
    </tr>`;
  }

  if (pricing.addOnCharges) {
    html += `<tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: left;">Add-on Charges</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(pricing.addOnCharges)}</td>
    </tr>`;
  }

  if (pricing.travelExpenseTotal || pricing.transportationCost) {
    const travel = pricing.travelExpenseTotal || pricing.transportationCost;
    html += `<tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: left;">Travel Charges</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(travel)}</td>
    </tr>`;
  }

  html += `
    <tr style="border-top: 1px solid #e5e7eb;">
      <td style="padding: 12px 0 6px 0; font-size: 15px; font-weight: 600; color: #111827; text-align: left;">Total</td>
      <td style="padding: 12px 0 6px 0; font-size: 15px; font-weight: 600; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(pricing.totalPrice || 0)}</td>
    </tr>`;

  if (pricing.depositAmount) {
    html += `<tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: left;">Deposit Amount</td>
      <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(pricing.depositAmount)}</td>
    </tr>`;
  }

  const paidAmount = (pricing.totalPrice || 0) - (pricing.pendingBalance || 0);
  if (paidAmount > 0) {
    html += `<tr>
      <td style="padding: 6px 0; font-size: 14px; color: #059669; font-weight: 600; text-align: left;">Paid</td>
      <td style="padding: 6px 0; font-size: 14px; color: #059669; font-weight: 600; text-align: right; font-family: monospace;">${formatCurrency(paidAmount)}</td>
    </tr>`;
  }

  if (pricing.pendingBalance > 0) {
    html += `<tr>
      <td style="padding: 6px 0; font-size: 14px; color: #dc2626; font-weight: 600; text-align: left;">Pending Balance</td>
      <td style="padding: 6px 0; font-size: 14px; color: #dc2626; font-weight: 600; text-align: right; font-family: monospace;">${formatCurrency(pricing.pendingBalance)}</td>
    </tr>`;
  }

  html += `</table>`;
  return html;
};

export const buildNextStepsSection = (stepsHtml: string) => `
  <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin-top: 32px; margin-bottom: 32px;">
    <h3 style="color: #1e3a8a; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">What Happens Next</h3>
    <div style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0;">
      ${stepsHtml}
    </div>
  </div>
`;

export const buildSupportSection = () => `
  <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
    <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Need Help?</h3>
    <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0;">
      If you have any questions or need to make changes to your booking, please reply directly to this email or call us at <strong>9866006648</strong> / <strong>9324546303</strong>.
    </p>
  </div>
`;

// --- Order Templates ---

export const buildOrderConfirmationCustomerEmail = (order: any, user: any) => {
  const displayId =
    order.invoice?.number ||
    order.invoiceNumber ||
    (order._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : 'N/A');
  const primaryItem = getPrimaryEntityName(order.items);
  const headingText = primaryItem
    ? `Your ${escapeHtml(primaryItem)} Order Is Confirmed`
    : 'Your Order Is Confirmed';
  const preheader = primaryItem
    ? `We've received your order for ${primaryItem}.`
    : `We've received your order.`;

  const body = `
    <h2>${headingText}</h2>
    <p>Dear ${escapeHtml(user?.name || order.shippingAddress?.name || 'Customer')},</p>
    <p>We've received your order and are getting it ready for shipment.</p>
    
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
          Status: <strong>${escapeHtml(order.paymentStatus || 'Pending')}</strong><br/>
          Invoice Reference: <strong>${escapeHtml(displayId)}</strong>
        </p>
      </div>
    </div>
  `;
  return {
    subject: primaryItem
      ? displayId && displayId !== 'N/A'
        ? `Order Confirmed: ${primaryItem} (${displayId})`
        : `Order Confirmed: ${primaryItem}`
      : `Order Confirmed — ${displayId}`,
    html: getLuxuryEmailWrapper('Order Confirmed', body, undefined, preheader),
  };
};

export const buildOrderConfirmationAdminEmail = (order: any) => {
  const itemTitle =
    order.items && order.items.length > 0
      ? order.items[0].title ||
        order.items[0].name ||
        order.items[0].showcaseTitle ||
        order.items[0].productTitle ||
        'Product'
      : 'Order';
  const moreCount =
    order.items && order.items.length > 1 ? ` (+${order.items.length - 1} more)` : '';
  const productName = `${itemTitle}${moreCount}`;
  const customerName = order.shippingAddress?.name || order.user?.name || 'A customer';
  const invoiceNumber =
    order.invoice?.number ||
    order.invoiceNumber ||
    (order._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : 'Pending');

  const body = `
    <h2>New Order: ${escapeHtml(productName)}</h2>
    <p style="color: #4b5563; font-size: 14px; margin-top: -8px; margin-bottom: 20px;">
      Invoice Reference: <strong style="color: #111827;">${escapeHtml(invoiceNumber)}</strong>
    </p>
    <p>A new order has been placed on the store.</p>
    
    ${dataTable([
      { label: 'Product / Item', value: `<strong>${escapeHtml(productName)}</strong>` },
      { label: 'Customer', value: escapeHtml(customerName) },
      {
        label: 'Email',
        value: escapeHtml(order.shippingAddress?.email || order.user?.email || 'Unknown'),
      },
      {
        label: 'Phone',
        value: escapeHtml(order.shippingAddress?.phone || order.user?.phone || 'Unknown'),
      },
      { label: 'Total Value', value: formatCurrency(order.total) },
      {
        label: 'Payment',
        value: `${escapeHtml(order.paymentMethod || 'N/A')} (${escapeHtml(order.paymentStatus || 'Pending')})`,
      },
      { label: 'Invoice No', value: escapeHtml(invoiceNumber) },
    ])}
    
    <h3 style="color: #111827;">Items Ordered</h3>
    ${itemsTable(order.items)}
    
    ${addressBlock('Shipping Address', order.shippingAddress)}
    
  `;

  return {
    subject: `[New Order] ${productName} placed by ${customerName}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildOrderStatusChangeEmail = (order: any, oldStatus: string, newStatus: string) => {
  const primaryItem = getPrimaryEntityName(order.items) || 'Order';
  const displayRef =
    order.invoice?.number ||
    order.invoiceNumber ||
    order.orderUuid ||
    (order._id ? `ORD-${String(order._id).slice(-8).toUpperCase()}` : '');

  const preheader = `The status of your ${primaryItem} has been updated to ${newStatus}.`;
  const headingText = `Your ${escapeHtml(primaryItem)} is now ${escapeHtml(newStatus)}`;

  const body = `
    <h2>${headingText}</h2>
    <p>Dear ${escapeHtml(order.shippingAddress?.name || 'Customer')},</p>
    <p>The status of your order has been updated to <strong>${escapeHtml(newStatus)}</strong>.</p>
    
    ${dataTable([
      { label: 'Product / Item', value: `<strong>${escapeHtml(primaryItem)}</strong>` },
      { label: 'Previous Status', value: escapeHtml(oldStatus) },
      { label: 'New Status', value: `<strong>${escapeHtml(newStatus)}</strong>` },
      ...(order.invoiceNumber
        ? [{ label: 'Invoice No', value: escapeHtml(order.invoiceNumber) }]
        : []),
      ...(displayRef ? [{ label: 'Reference No', value: escapeHtml(displayRef) }] : []),
    ])}
    
    <h3 style="margin-top: 32px; color: #111827;">Order Summary</h3>
    ${itemsTable(order.items)}
    ${totalsSummary(order.subtotal, order.shippingFee || order.courierCharges || 0, order.tax?.totalTax || 0, order.total, order.discount || 0)}
  `;
  return {
    subject: `Your ${primaryItem} is now ${newStatus}`,
    html: getLuxuryEmailWrapper('Order Status Update', body, undefined, preheader),
  };
};

export const buildPaymentFailedEmail = (order: any, reason: string) => {
  const primaryItem = getPrimaryEntityName(order.items) || 'Order';
  const displayRef =
    order.invoice?.number ||
    order.invoiceNumber ||
    order.orderUuid ||
    (order._id ? `ORD-${String(order._id).slice(-8).toUpperCase()}` : '');

  const preheader = `Payment failed for your ${primaryItem}`;
  const headingText = `Payment Failed for Your ${escapeHtml(primaryItem)}`;

  const body = `
    <h2 style="color: #dc2626;">${headingText}</h2>
    <p>Dear ${escapeHtml(order.shippingAddress?.name || 'Customer')},</p>
    <p>We were unable to process the payment for your order.</p>
    
    ${dataTable([
      { label: 'Product / Item', value: `<strong>${escapeHtml(primaryItem)}</strong>` },
      { label: 'Reason', value: escapeHtml(reason) },
      { label: 'Order Value', value: formatCurrency(order.total || 0) },
      ...(displayRef ? [{ label: 'Reference No', value: escapeHtml(displayRef) }] : []),
    ])}
    
    <p>Please try completing the payment again or contact support if the issue persists.</p>
    
  `;
  return {
    subject: `Payment Failed: ${primaryItem}`,
    html: getLuxuryEmailWrapper('Payment Alert', body, undefined, preheader),
  };
};

// --- Custom Order Templates ---

export const buildCustomOrderCustomerEmail = (order: any) => {
  const customName = order.productType || order.occasion || 'Custom Design';
  const displayRef =
    order.customOrderId ||
    order.orderUuid ||
    (order._id ? `REQ-${String(order._id).slice(-8).toUpperCase()}` : '');

  const preheader = `We've received your custom design request for ${customName}.`;
  const headingText = `Your ${escapeHtml(customName)} Request is Received`;

  const body = `
    <h2>${headingText}</h2>
    <p>Dear ${escapeHtml(order.customerName || 'Valued Guest')},</p>
    <p>Thank you for trusting Siri Arts & Crafts. Our design team is reviewing your requirements and will reach out shortly.</p>
    
    ${dataTable([
      { label: 'Custom Design', value: `<strong>${escapeHtml(customName)}</strong>` },
      { label: 'Occasion', value: escapeHtml(order.occasion || 'N/A') },
      { label: 'Category', value: escapeHtml(order.productType || 'N/A') },
      { label: 'Target Budget', value: formatCurrency(order.budget) },
      ...(displayRef ? [{ label: 'Reference No', value: escapeHtml(displayRef) }] : []),
    ])}
    
  `;
  return {
    subject: `Custom Design Request Received: ${customName}`,
    html: getLuxuryEmailWrapper('Custom Order Acknowledgment', body, undefined, preheader),
  };
};

export const buildCustomOrderAdminEmail = (order: any) => {
  const customName = order.productType || order.occasion || 'Custom Design';
  const customerName = escapeHtml(order.customerName || 'Unknown');
  const displayRef =
    order.customOrderId ||
    order.orderUuid ||
    (order._id ? `REQ-${String(order._id).slice(-8).toUpperCase()}` : '');

  const body = `
    <h2>New Custom Order Request: ${escapeHtml(customName)}</h2>
    <p>A new custom design request has been submitted.</p>
    
    ${dataTable([
      { label: 'Custom Design', value: `<strong>${escapeHtml(customName)}</strong>` },
      { label: 'Customer', value: customerName },
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
      ...(displayRef ? [{ label: 'Reference No', value: escapeHtml(displayRef) }] : []),
    ])}
    
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 16px;">
      <p style="margin: 0; white-space: pre-wrap; font-style: italic;">"${escapeHtml(order.customRequirements || 'No special requirements provided.')}"</p>
    </div>
    
  `;
  return {
    subject: `[CUSTOM ORDER] New Request: ${customName} from ${customerName}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildCustomOrderStatusChangeEmail = (order: any, previousStatus: string) => {
  const customName = order.productType || order.occasion || 'Custom Design';
  const displayRef =
    order.customOrderId ||
    order.orderUuid ||
    (order._id ? `REQ-${String(order._id).slice(-8).toUpperCase()}` : '');

  const preheader = `Status update for your ${customName}: ${order.status}`;
  const headingText = `Your ${escapeHtml(customName)} is now ${escapeHtml(order.status)}`;

  const body = `
    <h2>${headingText}</h2>
    <p>Dear ${escapeHtml(order.customerName || 'Customer')},</p>
    <p>The status of your custom order has been updated to <strong>${escapeHtml(order.status)}</strong>.</p>
    
    ${dataTable([
      { label: 'Custom Design', value: `<strong>${escapeHtml(customName)}</strong>` },
      { label: 'Previous Status', value: escapeHtml(previousStatus) },
      { label: 'New Status', value: `<strong>${escapeHtml(order.status)}</strong>` },
      ...(displayRef ? [{ label: 'Reference No', value: escapeHtml(displayRef) }] : []),
    ])}
    
  `;
  return {
    subject: `Your ${customName} is now ${escapeHtml(order.status)}`,
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

export const buildEventBookingInquiryEmail = (booking: any, user: any) => {
  const customerName = user?.name || booking.user?.name || 'Valued Guest';
  const bookingId = booking.bookingId || booking._id;
  const bookingTitle = booking.title || 'Event Booking';

  const preheader = `Your event booking request for ${bookingTitle} has been received.`;

  const nextStepsHtml = `
    <ul style="margin: 0; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Our team is reviewing your event details.</li>
      <li style="margin-bottom: 8px;">We will contact you if we need any additional information.</li>
      <li>You will receive an update once your booking request is confirmed.</li>
    </ul>
  `;

  const body = `
    <h2>Booking Request Received</h2>
    <p>Dear ${escapeHtml(customerName)},</p>
    <p>Thank you for choosing Siri Arts & Crafts. Your event booking request has been successfully submitted. Our team will review your requirements and get back to you shortly.</p>
    
    ${buildBookingReferenceCard(bookingId, booking.status || 'inquiry')}
    ${buildEventDetailsCard(booking)}
    ${buildEventPackageItemsTable(booking)}
    ${buildBookingPaymentSummary(booking.pricing)}
    ${buildNextStepsSection(nextStepsHtml)}
    ${buildSupportSection()}
  `;

  return {
    subject: bookingId
      ? `Booking Request Received: ${escapeHtml(bookingTitle)} (${bookingId})`
      : `Booking Request Received: ${escapeHtml(bookingTitle)}`,
    html: getLuxuryEmailWrapper('Inquiry Received', body, undefined, preheader),
  };
};

export const buildEventBookingConfirmedEmail = (booking: any, user: any) => {
  const customerName = user?.name || booking.user?.name || 'Valued Guest';
  const bookingId = booking.bookingId || booking._id;
  const bookingTitle = booking.title || 'Event Booking';

  const preheader = `Your event booking for ${bookingTitle} is confirmed!`;

  const nextStepsHtml = `
    <ul style="margin: 0; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Your date has been successfully reserved in our calendar.</li>
      <li style="margin-bottom: 8px;">Our artisans will begin preparing for your event.</li>
      <li>Log in to your dashboard to chat with your assigned team and review layout checklists.</li>
    </ul>
  `;

  const body = `
    <h2>Your Booking Is Confirmed!</h2>
    <p>Dear ${escapeHtml(customerName)},</p>
    <p>We are thrilled to let you know that your booking is fully confirmed. We've received your payment and have reserved the date for your special event.</p>
    
    ${buildBookingReferenceCard(bookingId, booking.status || 'confirmed')}
    ${buildEventDetailsCard(booking)}
    ${buildEventPackageItemsTable(booking)}
    ${buildBookingPaymentSummary(booking.pricing)}
    ${buildNextStepsSection(nextStepsHtml)}
    ${buildSupportSection()}
  `;

  return {
    subject: bookingId
      ? `Your Event Booking Is Confirmed: ${escapeHtml(bookingTitle)} (${bookingId})`
      : `Your Event Booking Is Confirmed: ${escapeHtml(bookingTitle)}`,
    html: getLuxuryEmailWrapper('Booking Confirmed', body, undefined, preheader),
  };
};

export const buildEventBookingAdminEmail = (booking: any, user: any) => {
  const customerName = user?.name || booking.user?.name || 'Unknown';
  const bookingId = booking.bookingId || booking._id;

  const body = `
    <h2>New Event Booking Request</h2>
    <p>A new event booking inquiry has been submitted by ${escapeHtml(customerName)}.</p>
    
    ${buildBookingReferenceCard(bookingId, booking.status || 'inquiry')}
    ${buildEventDetailsCard(booking)}
    ${buildEventPackageItemsTable(booking)}
    ${buildBookingPaymentSummary(booking.pricing)}
    
  `;

  return {
    subject: `[NEW BOOKING] ${escapeHtml(booking.title || 'Event Booking')} from ${escapeHtml(customerName)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

// --- Return/Exchange Templates ---

export const buildReturnCreatedCustomerEmail = (returnRequest: any, order: any, user: any) => {
  const customerName = user?.name || 'Valued Customer';
  const isExchange = returnRequest.returnType === 'exchange';
  const requestId = returnRequest.returnId || returnRequest._id;
  const primaryItem = getPrimaryEntityName(returnRequest.items);

  const rows: { label: string; value: string }[] = [
    ...(primaryItem
      ? [{ label: 'Item(s)', value: `<strong>${escapeHtml(primaryItem)}</strong>` }]
      : []),
    { label: 'Type', value: isExchange ? 'Exchange' : 'Return' },
    { label: 'Total Items', value: `${returnRequest.items?.length || 0} item(s)` },
    { label: 'Status', value: escapeHtml(returnRequest.status || 'Submitted') },
    { label: 'Reference No', value: escapeHtml(requestId) },
  ];

  const preheader = `Your ${isExchange ? 'exchange' : 'return'} request for ${primaryItem || 'your item'} has been submitted.`;

  const actionText = isExchange ? 'Exchange Request Received' : 'Return Request Received';
  const headingText = primaryItem
    ? `${escapeHtml(primaryItem)} — ${actionText}`
    : `Your ${actionText}`;

  const body = `
    <h2>${headingText}</h2>
    <p>Dear ${escapeHtml(customerName)},</p>
    <p>We've received your ${isExchange ? 'exchange' : 'return'} request and our team will review it shortly.</p>

    ${dataTable(rows)}

    ${
      returnRequest && returnRequest.items && returnRequest.items.length > 0
        ? `
    <h3 style="margin-top: 32px; color: #111827;">${isExchange ? 'Exchange' : 'Return'} Summary</h3>
    ${itemsTable(
      returnRequest.items.map((item: any) => ({
        imageSrc: item.imageSrc || item.productId?.imageSrc,
        title: item.title || item.productId?.title,
        quantity: item.returnQuantity,
        price: item.unitPrice,
        variant: item.variant,
      })),
    )}
    ${
      !isExchange &&
      (returnRequest.refundBreakdown?.grandTotal !== undefined ||
        returnRequest.refundAmount !== undefined)
        ? `
        <div style="text-align: right; padding-top: 16px; font-size: 16px; border-top: 2px solid #e5e7eb; margin-top: 16px;">
          <strong style="color: #111827;">Total Refund: </strong><span style="font-family: monospace; color: #111827; font-weight: 700;">${formatCurrency(returnRequest.refundBreakdown?.grandTotal ?? returnRequest.refundAmount ?? 0)}</span>
        </div>
        `
        : ''
    }
    `
        : ''
    }

  `;
  return {
    subject: `${isExchange ? 'Exchange' : 'Return'} Request Received: ${primaryItem || 'Your Item'}`,
    html: getLuxuryEmailWrapper(
      `${isExchange ? 'Exchange' : 'Return'} Request`,
      body,
      undefined,
      preheader,
    ),
  };
};

export const buildReturnCreatedAdminEmail = (
  returnRequest: any,
  order: any,
  user: any,
  exchange?: any,
) => {
  const isExchange = returnRequest.returnType === 'exchange';
  const requestId = returnRequest.returnId || returnRequest._id;
  const primaryItem = getPrimaryEntityName(returnRequest.items);
  const orderRef = order?.orderUuid || order?.orderNumber || returnRequest.orderId;
  const customerName = user?.name || order?.shippingAddress?.name || 'A customer';
  const customerEmail = user?.email || order?.shippingAddress?.email || 'N/A';
  const customerPhone = user?.phone || order?.shippingAddress?.phone || 'N/A';
  const frontendUrl = getFrontendUrl();
  const adminUrl = `${frontendUrl}/admin/returns/${isExchange ? 'exchanges' : 'requests'}/${returnRequest._id}`;

  const rows: { label: string; value: string }[] = [
    ...(primaryItem
      ? [{ label: 'Item(s)', value: `<strong>${escapeHtml(primaryItem)}</strong>` }]
      : []),
    {
      label: 'Type',
      value: `<span style="font-weight: 700; color: ${isExchange ? '#b45309' : '#4338ca'}; text-transform: uppercase;">${isExchange ? 'Exchange Request' : 'Return Request'}</span>`,
    },
    {
      label: 'Order Reference',
      value: `<span style="font-family: monospace; font-weight: 600;">#${escapeHtml(orderRef)}</span>`,
    },
    {
      label: 'Customer',
      value: `${escapeHtml(customerName)} (${escapeHtml(customerEmail)}${customerPhone !== 'N/A' ? ` • ${escapeHtml(customerPhone)}` : ''})`,
    },
    {
      label: 'Current Status',
      value: `<span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: #fef3c7; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em;">${escapeHtml(returnRequest.status || 'Submitted')}</span>`,
    },
    {
      label: 'Request Ref',
      value: `<strong style="font-family: monospace; color: #111827;">${escapeHtml(requestId)}</strong>`,
    },
  ];

  if (returnRequest.refundMethod) {
    rows.push({
      label: 'Refund Mode',
      value: escapeHtml(
        returnRequest.refundMethod === 'wallet'
          ? 'Store Wallet'
          : returnRequest.refundMethod.toUpperCase(),
      ),
    });
  }

  const effectiveUpiId = returnRequest.upiId || exchange?.upiId;
  if (effectiveUpiId) {
    rows.push({
      label: 'Refund UPI ID',
      value: `<strong style="font-family: monospace; color: #047857; font-size: 14px;">${escapeHtml(effectiveUpiId)}</strong>`,
    });
  }

  if (isExchange && exchange) {
    rows.push({
      label: 'Exchange Type',
      value:
        exchange.exchangeType === 'different_product' ? 'Different Product' : 'Same Item / Variant',
    });
    if (exchange.priceDifference !== undefined && exchange.priceDifference !== 0) {
      const diffFormatted =
        exchange.priceDifference > 0
          ? `+${formatCurrency(exchange.priceDifference)} (Customer to Pay)`
          : `-${formatCurrency(Math.abs(exchange.priceDifference))} (Refund Due)`;
      rows.push({
        label: 'Price Difference',
        value: `<strong style="color: #111827;">${diffFormatted}</strong>`,
      });
    }
  }

  const preheader = `[Admin] New ${isExchange ? 'exchange' : 'return'} request #${requestId} submitted by ${customerName}.`;

  const body = `
    <div style="border-left: 4px solid #D4AF37; padding-left: 16px; margin-bottom: 24px;">
      <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #b45309; display: block;">Administrative Dispatch</span>
      <h2 style="margin: 4px 0 0 0; font-size: 20px; color: #111827; font-weight: 700;">
        New ${isExchange ? 'Exchange' : 'Return'} Request Lodged
      </h2>
    </div>

    <p style="color: #4b5563; font-size: 14px; margin-bottom: 24px; line-height: 1.6;">
      A customer has submitted a new ${isExchange ? 'exchange' : 'return'} request that requires administrative review and processing.
    </p>

    ${dataTable(rows)}

    ${
      returnRequest.items && returnRequest.items.length > 0
        ? `
      <h3 style="margin-top: 32px; color: #111827; font-size: 15px; font-weight: 700;">Item(s) to ${isExchange ? 'Exchange' : 'Return'}</h3>
      ${itemsTable(
        returnRequest.items.map((item: any) => ({
          imageSrc: item.imageSrc || item.productId?.imageSrc,
          title: item.title || item.productId?.title,
          quantity: item.returnQuantity,
          price: item.unitPrice,
          variant: item.variant,
        })),
      )}
      `
        : ''
    }

    ${
      isExchange && exchange?.replacementItem
        ? `
      <h3 style="margin-top: 24px; color: #111827; font-size: 15px; font-weight: 700;">Replacement Item Requested</h3>
      ${itemsTable([
        {
          imageSrc: exchange.replacementItem.imageSrc,
          title: exchange.replacementItem.title,
          quantity: exchange.replacementItem.quantity || 1,
          price: exchange.replacementItem.unitPrice || 0,
          variant: exchange.replacementItem.variant,
        },
      ])}
      `
        : ''
    }

    ${
      !isExchange &&
      (returnRequest.refundBreakdown?.grandTotal !== undefined ||
        returnRequest.refundAmount !== undefined)
        ? `
      <div style="text-align: right; padding-top: 14px; font-size: 15px; border-top: 2px solid #e5e7eb; margin-top: 16px;">
        <strong style="color: #111827;">Total Refund Due: </strong><span style="font-family: monospace; color: #047857; font-weight: 700; font-size: 16px;">${formatCurrency(returnRequest.refundBreakdown?.grandTotal ?? returnRequest.refundAmount ?? 0)}</span>
      </div>
      `
        : ''
    }

    ${
      returnRequest.pickupAddress
        ? addressBlock('Pickup Address', returnRequest.pickupAddress)
        : order?.shippingAddress
          ? addressBlock('Original Shipping Address', order.shippingAddress)
          : ''
    }

    <div style="margin-top: 32px; text-align: center;">
      ${button(`Open in Admin Portal`, adminUrl)}
    </div>
  `;

  return {
    subject: `[${isExchange ? 'Exchange' : 'Return'} Request] #${escapeHtml(requestId)} from ${escapeHtml(customerName)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body, undefined, preheader),
  };
};

export const buildReturnStatusUpdateEmail = (
  returnRequest: any,
  order: any,
  user: any,
  previousStatus: string,
  newStatus: string,
  exchange?: any,
) => {
  const customerName = user?.name || 'Valued Customer';
  const isExchange = returnRequest.returnType === 'exchange';
  const requestId = returnRequest.returnId || returnRequest._id;
  const primaryItem = getPrimaryEntityName(returnRequest.items);

  const formatStatus = (statusStr: string) => {
    if (!statusStr) return '';
    return statusStr
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const rows: { label: string; value: string }[] = [
    ...(primaryItem
      ? [{ label: 'Item(s)', value: `<strong>${escapeHtml(primaryItem)}</strong>` }]
      : []),
    { label: 'Previous Status', value: formatStatus(previousStatus) },
    { label: 'New Status', value: `<strong>${formatStatus(newStatus)}</strong>` },
    { label: 'Reference No', value: escapeHtml(requestId) },
  ];

  if (isExchange && exchange && exchange.paymentStatus) {
    rows.push({
      label: 'Payment Status',
      value: exchange.paymentStatus.replace('_', ' ').toUpperCase(),
    });
  }

  const preheader = `Status update for your ${isExchange ? 'exchange' : 'return'} for ${primaryItem || 'your item'}: ${formatStatus(newStatus)}.`;

  const actionText = isExchange ? 'Exchange Update' : 'Return Update';
  const headingText = primaryItem
    ? `${escapeHtml(primaryItem)} — ${actionText}`
    : `Your ${actionText}`;

  const body = `
    <h2>${headingText}</h2>
    <p>Dear ${escapeHtml(customerName)},</p>
    <p>The status of your ${isExchange ? 'exchange' : 'return'} request has been updated to <strong>${formatStatus(newStatus)}</strong>.</p>
    
    ${
      isExchange &&
      exchange?.differenceAction === 'collect_payment' &&
      exchange.paymentStatus === 'payment_required' &&
      ['approved'].includes(newStatus)
        ? `
      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #b45309; font-weight: bold;">Action Required: Payment Needed</p>
        <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">
          An additional payment of <strong>₹${exchange.priceDifference}</strong> is required to proceed with your exchange. 
          Please visit your dashboard to complete the payment. Your pickup will be scheduled once payment is received.
        </p>
      </div>
      `
        : ''
    }

    ${dataTable(rows)}

    ${
      returnRequest && returnRequest.items && returnRequest.items.length > 0
        ? `
    <h3 style="margin-top: 32px; color: #111827;">${isExchange ? 'Exchange' : 'Return'} Summary</h3>
    ${itemsTable(
      returnRequest.items.map((item: any) => ({
        imageSrc: item.imageSrc || item.productId?.imageSrc,
        title: item.title || item.productId?.title,
        quantity: item.returnQuantity,
        price: item.unitPrice,
        variant: item.variant,
      })),
    )}
    ${
      !isExchange &&
      (returnRequest.refundBreakdown?.grandTotal !== undefined ||
        returnRequest.refundAmount !== undefined)
        ? `
        <div style="text-align: right; padding-top: 16px; font-size: 16px; border-top: 2px solid #e5e7eb; margin-top: 16px;">
          <strong style="color: #111827;">Total Refund: </strong><span style="font-family: monospace; color: #111827; font-weight: 700;">${formatCurrency(returnRequest.refundBreakdown?.grandTotal ?? returnRequest.refundAmount ?? 0)}</span>
        </div>
        `
        : ''
    }
    `
        : ''
    }

  `;
  return {
    subject: `Your ${isExchange ? 'Exchange' : 'Return'} for ${primaryItem || 'Item'} is now ${formatStatus(newStatus)}`,
    html: getLuxuryEmailWrapper(
      `${isExchange ? 'Exchange' : 'Return'} Update`,
      body,
      undefined,
      preheader,
    ),
  };
};

export const buildEventBookingStatusUpdateEmail = (
  booking: any,
  user: any,
  oldStatus: string,
  newStatus: string,
) => {
  const customerName = user?.name || booking.user?.name || 'Valued Guest';
  const bookingId = booking.bookingId || booking._id;
  const bookingTitle = booking.title || 'Event Booking';
  const preheader = `Update on your event booking: ${bookingTitle}`;

  const idPart = bookingId ? ` (${bookingId})` : '';
  let subject = `Booking Update: ${escapeHtml(bookingTitle)}${idPart}`;
  let title = 'Booking Status Update';
  let nextStepsHtml = `
    <ul style="margin: 0; padding-left: 20px;">
      <li>Log in to your dashboard to view the latest updates on your booking.</li>
    </ul>
  `;

  // Customizations based on newStatus
  const s = newStatus.toLowerCase();
  if (s === 'team_assigned') {
    subject = `Team Assigned — ${escapeHtml(bookingTitle)}${idPart}`;
    title = 'Team Assigned';
    nextStepsHtml = `
      <ul style="margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Our artisans have been assigned to your event.</li>
        <li>Log in to your dashboard to chat live with your team and review layout checklists.</li>
      </ul>
    `;
  } else if (s === 'setup_in_progress') {
    subject = `Setup Started — ${escapeHtml(bookingTitle)}${idPart}`;
    title = 'Setup In Progress';
    nextStepsHtml = `
      <ul style="margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Our team has started the setup process for your event!</li>
        <li>Track real-time progress via your live workspace dashboard.</li>
      </ul>
    `;
  } else if (s === 'execution') {
    subject = `Event In Progress — ${escapeHtml(bookingTitle)}${idPart}`;
    title = 'Event In Progress';
  } else if (s === 'completed') {
    subject = `Event Completed — ${escapeHtml(bookingTitle)}${idPart}`;
    title = 'Event Completed';
    nextStepsHtml = `
      <ul style="margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">We hope your event was a spectacular success!</li>
        <li>We'd love to hear your feedback on your dashboard.</li>
      </ul>
    `;
  } else if (s === 'cancelled' || s === 'failed') {
    subject = `Booking ${formatBookingStatus(s)} — ${escapeHtml(bookingTitle)}${idPart}`;
    title = `Booking ${formatBookingStatus(s)}`;
    nextStepsHtml = `
      <ul style="margin: 0; padding-left: 20px;">
        <li>Please contact support if you need any assistance or clarification regarding this cancellation.</li>
      </ul>
    `;
  } else if (s === 'payment_pending' || s === 'pending_payment') {
    subject = `Payment Pending — ${escapeHtml(bookingTitle)}${idPart}`;
    title = 'Payment Pending';
    nextStepsHtml = `
      <ul style="margin: 0; padding-left: 20px;">
        <li>Please complete your payment via your dashboard to secure your booking date.</li>
      </ul>
    `;
  }

  const body = `
    <h2>${title}</h2>
    
    <p>Dear ${escapeHtml(customerName)},</p>
    <p>There has been an update regarding your event booking <strong>"${escapeHtml(booking.title || 'Event Booking')}"</strong>.</p>
    
    ${buildBookingReferenceCard(bookingId, newStatus)}
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px; margin-bottom: 24px; text-align: center;">
      <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 8px;">Timeline Shift</span>
      <div style="display: inline-block; padding: 8px 16px; background-color: #e2e8f0; border-radius: 20px; font-size: 12px; color: #64748b; text-decoration: line-through; margin-right: 8px;">
        ${escapeHtml(oldStatus.toUpperCase().replace(/_/g, ' '))}
      </div>
      <span style="font-size: 14px; color: #0f172a; vertical-align: middle; font-weight: bold;">➔</span>
      <div style="display: inline-block; padding: 8px 16px; background-color: #0f172a; border-radius: 20px; font-size: 12px; color: #ffffff; font-weight: bold; margin-left: 8px;">
        ${escapeHtml(newStatus.toUpperCase().replace(/_/g, ' '))}
      </div>
    </div>
    
    ${buildNextStepsSection(nextStepsHtml)}
    ${buildSupportSection()}
  `;

  return {
    subject,
    html: getLuxuryEmailWrapper(title, body, undefined, preheader),
  };
};

// --- Rental Order Templates ---

const rentalItemCard = (rentalOrder: any) => {
  const itemImage = rentalOrder.productImage
    ? `<img src="${escapeHtml(resolveImageUrl(rentalOrder.productImage))}" alt="${escapeHtml(rentalOrder.productTitle)}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" />`
    : `<div style="width: 48px; height: 48px; background-color: #f3f4f6; border-radius: 4px; border: 1px solid #e5e7eb;"></div>`;

  const qty = rentalOrder.quantity || 1;
  const rentalPrice = rentalOrder.rentalRate?.rentalPrice || rentalOrder.rentalCharge || 0;
  const rentalDurationDays =
    rentalOrder.rentalRate?.rentalDurationDays || rentalOrder.durationDays || 0;

  return `
    <div style="margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
            <th colspan="2" style="padding-bottom: 8px; font-size: 12px; color: #6b7280; text-transform: uppercase;">Rental Item</th>
            <th style="padding-bottom: 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; text-align: right;">Rental Charge</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 0; width: 60px;">
              ${itemImage}
            </td>
            <td style="padding: 12px 0; font-size: 14px; color: #374151;">
              <strong style="color: #111827;">${escapeHtml(rentalOrder.productTitle || 'Rental Item')}</strong><br/>
              <span style="color: #6b7280; font-size: 12px;">Qty: ${qty}</span><br/>
              <span style="color: #6b7280; font-size: 12px;">${formatCurrency(rentalPrice)} for ${rentalDurationDays} day${rentalDurationDays !== 1 ? 's' : ''}</span>
            </td>
            <td style="padding: 12px 0; font-size: 14px; text-align: right; color: #111827; font-family: monospace; font-weight: 500;">
              ${formatCurrency(rentalOrder.rentalCharge)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

const rentalPeriodSection = (rentalOrder: any) => {
  const startDate = rentalOrder.rentalStartDate
    ? new Date(rentalOrder.rentalStartDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not Set';
  const endDate = rentalOrder.rentalEndDate
    ? new Date(rentalOrder.rentalEndDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not Set';
  const duration = rentalOrder.durationDays || 0;

  return `
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #111827; font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">Rental Period</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 40%;">Rental Start</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${escapeHtml(startDate)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Rental End</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${escapeHtml(endDate)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Duration</td>
          <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${duration} Day${duration !== 1 ? 's' : ''}</td>
        </tr>
      </table>
    </div>
  `;
};

const rentalTotalsSummary = (rentalOrder: any) => {
  const rentalCharge = rentalOrder.rentalCharge || 0;
  const securityDeposit = rentalOrder.securityDeposit || 0;
  const deliveryCharge = rentalOrder.deliveryCharge || 0;
  const tax = rentalOrder.tax || 0;
  const walletDeduction = rentalOrder.walletDeduction || 0;
  const totalAmount = rentalOrder.totalAmount || 0;

  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right; width: 70%;">Rental Charge:</td>
        <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(rentalCharge)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right;">Security Deposit <span style="font-size: 11px; color: #059669;">(Refundable)</span>:</td>
        <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(securityDeposit)}</td>
      </tr>
      ${
        deliveryCharge > 0
          ? `
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #6b7280; text-align: right;">Delivery Charge:</td>
        <td style="padding: 6px 0; font-size: 14px; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(deliveryCharge)}</td>
      </tr>
      `
          : ''
      }
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
      ${
        walletDeduction > 0
          ? `
      <tr>
        <td style="padding: 6px 0; font-size: 14px; color: #059669; text-align: right;">Wallet Deduction:</td>
        <td style="padding: 6px 0; font-size: 14px; color: #059669; text-align: right; font-family: monospace;">-${formatCurrency(walletDeduction)}</td>
      </tr>
      `
          : ''
      }
      <tr style="border-top: 2px solid #e5e7eb;">
        <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 700; color: #111827; text-align: right;">Grand Total:</td>
        <td style="padding: 12px 0 0 0; font-size: 18px; font-weight: 700; color: #111827; text-align: right; font-family: monospace;">${formatCurrency(totalAmount)}</td>
      </tr>
    </table>
  `;
};

export const buildRentalOrderCustomerEmail = (rentalOrder: any, user: any) => {
  const rentalTitle =
    rentalOrder.productTitle ||
    rentalOrder.showcaseTitle ||
    rentalOrder.title ||
    rentalOrder.name ||
    'Rental Item';
  const orderId =
    rentalOrder.rentalOrderId ||
    (rentalOrder._id ? `RNT-${String(rentalOrder._id).slice(-8).toUpperCase()}` : 'N/A');
  const preheader = `Your rental order for ${rentalTitle} is confirmed.`;

  const headingText = `Your ${escapeHtml(rentalTitle)} Rental Is Confirmed`;

  const customerName = escapeHtml(user?.name || rentalOrder.shippingAddress?.name || 'Customer');
  const frontendUrl = getFrontendUrl();

  const body = `
    <h2>${headingText}</h2>
    <p>Dear ${customerName},</p>
    <p>Your rental order has been confirmed. Here are the details of your rental.</p>

    <h3 style="margin-top: 32px; color: #111827;">Rental Summary</h3>
    ${rentalItemCard(rentalOrder)}
    ${rentalPeriodSection(rentalOrder)}
    ${rentalTotalsSummary(rentalOrder)}

    <div style="display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 32px;">
      <div style="flex: 1; min-width: 250px;">
        ${addressBlock('Delivery Address', rentalOrder.shippingAddress)}
      </div>
      <div style="flex: 1; min-width: 250px;">
        <h3 style="color: #111827; font-size: 16px; margin-bottom: 12px;">Payment Details</h3>
        <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">
          Method: ${escapeHtml(rentalOrder.paymentMethod || 'Razorpay')}<br/>
          Status: <strong>${escapeHtml(rentalOrder.paymentStatus || 'Pending')}</strong><br/>
          Rental Reference: <strong>${escapeHtml(orderId)}</strong>
        </p>
      </div>
    </div>

    ${buildNextStepsSection(`
      <ol style="margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 6px;">Your rental order has been confirmed and is being prepared.</li>
        <li style="margin-bottom: 6px;">The product will be delivered to your address before the rental start date.</li>
        <li style="margin-bottom: 6px;">Please keep the product in good condition during the rental period.</li>
        <li style="margin-bottom: 6px;">Return the product by the rental end date.</li>
        <li style="margin-bottom: 6px;">Your security deposit will be processed after inspection upon return.</li>
      </ol>
    `)}

    ${button('View My Rental Order', `${frontendUrl}/dashboard/rentals`)}

    ${buildSupportSection()}
  `;

  return {
    subject: `Rental Confirmed: ${rentalTitle}`,
    html: getLuxuryEmailWrapper('Rental Confirmed', body, undefined, preheader),
  };
};

export const buildRentalOrderAdminEmail = (rentalOrder: any) => {
  const productTitle =
    rentalOrder.productTitle ||
    rentalOrder.showcaseTitle ||
    rentalOrder.title ||
    rentalOrder.name ||
    'Rental Item';
  const customerName = rentalOrder.shippingAddress?.name || rentalOrder.user?.name || 'Customer';
  const rentalRef =
    rentalOrder.rentalOrderId ||
    (rentalOrder._id ? `RNT-${String(rentalOrder._id).slice(-8).toUpperCase()}` : 'N/A');

  const startDate = rentalOrder.startDate
    ? new Date(rentalOrder.startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';
  const endDate = rentalOrder.endDate
    ? new Date(rentalOrder.endDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  const body = `
    <h2>New Rental Order: ${escapeHtml(productTitle)}</h2>
    <p style="color: #4b5563; font-size: 14px; margin-top: -8px; margin-bottom: 20px;">
      Rental Reference: <strong style="color: #111827;">${escapeHtml(rentalRef)}</strong>
    </p>
    <p>A new rental order has been placed on the store.</p>

    ${dataTable([
      { label: 'Product / Item', value: `<strong>${escapeHtml(productTitle)}</strong>` },
      { label: 'Customer', value: escapeHtml(customerName) },
      {
        label: 'Email',
        value: escapeHtml(
          rentalOrder.shippingAddress?.email || rentalOrder.user?.email || 'Unknown',
        ),
      },
      {
        label: 'Phone',
        value: escapeHtml(
          rentalOrder.shippingAddress?.phone || rentalOrder.user?.phone || 'Unknown',
        ),
      },
      { label: 'Total Value', value: formatCurrency(rentalOrder.totalAmount) },
      {
        label: 'Payment',
        value: `${escapeHtml(rentalOrder.paymentMethod || 'N/A')} (${escapeHtml(rentalOrder.paymentStatus || 'N/A')})`,
      },
      { label: 'Rental Reference', value: escapeHtml(rentalRef) },
    ])}

    <h3 style="color: #111827;">Rented Product</h3>
    ${rentalItemCard(rentalOrder)}

    <h3 style="color: #111827;">Rental Details</h3>
    ${dataTable([
      { label: 'Rental Start', value: escapeHtml(startDate) },
      { label: 'Rental End', value: escapeHtml(endDate) },
      {
        label: 'Duration',
        value: `${rentalOrder.durationDays || 0} Day${(rentalOrder.durationDays || 0) !== 1 ? 's' : ''}`,
      },
      { label: 'Rental Charge', value: formatCurrency(rentalOrder.rentalCharge) },
      { label: 'Security Deposit', value: formatCurrency(rentalOrder.securityDeposit) },
      { label: 'Deposit Status', value: escapeHtml(rentalOrder.depositStatus || 'held') },
      { label: 'Delivery Charge', value: formatCurrency(rentalOrder.deliveryCharge || 0) },
      { label: 'Tax', value: formatCurrency(rentalOrder.tax || 0) },
      {
        label: 'Wallet Deduction',
        value: rentalOrder.walletDeduction
          ? `-${formatCurrency(rentalOrder.walletDeduction)}`
          : formatCurrency(0),
      },
      {
        label: 'Grand Total',
        value: `<strong>${formatCurrency(rentalOrder.totalAmount)}</strong>`,
      },
    ])}

    ${addressBlock('Delivery Address', rentalOrder.shippingAddress)}
    ${button('View Rental Order', `${getFrontendUrl()}/admin/rentals/detail/${rentalOrder._id}`)}
  `;

  return {
    subject: `[New Rental] ${escapeHtml(rentalOrder.productTitle || 'Rental Item')} rented by ${escapeHtml(customerName)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildRentalStatusChangeEmail = (
  rentalOrder: any,
  oldStatus: string,
  newStatus: string,
) => {
  const rentalTitle =
    rentalOrder.productTitle ||
    rentalOrder.showcaseTitle ||
    rentalOrder.title ||
    rentalOrder.name ||
    'Rental Item';
  const orderId =
    rentalOrder.rentalOrderId ||
    (rentalOrder._id ? `RNT-${String(rentalOrder._id).slice(-8).toUpperCase()}` : 'N/A');
  const customerName = escapeHtml(rentalOrder.shippingAddress?.name || 'Customer');
  const frontendUrl = getFrontendUrl();
  const title = escapeHtml(rentalTitle);

  const formattedStatus = newStatus.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const body = `
    <h2>Your ${title} is now ${formattedStatus}</h2>
    <p>Dear ${customerName},</p>
    <p>The status of your rental for <strong>${title}</strong> has been updated to <strong>${formattedStatus}</strong>.</p>
    
    ${dataTable([
      { label: 'Rental Item', value: `<strong>${title}</strong>` },
      { label: 'New Status', value: `<strong>${formattedStatus}</strong>` },
      { label: 'Reference No', value: escapeHtml(orderId) },
    ])}

    ${rentalPeriodSection(rentalOrder)}

    ${button('View My Rental', `${frontendUrl}/dashboard/rentals`)}
    ${buildSupportSection()}
  `;

  return {
    subject: `Your ${rentalTitle} Rental is now ${formattedStatus}`,
    html: getLuxuryEmailWrapper(
      'Rental Update',
      body,
      undefined,
      `Your rental for ${rentalTitle} is now ${formattedStatus}`,
    ),
  };
};

export const buildRentalDepositRefundedEmail = (rentalOrder: any, refundData: any) => {
  const rentalTitle =
    rentalOrder.productTitle ||
    rentalOrder.showcaseTitle ||
    rentalOrder.title ||
    rentalOrder.name ||
    'Rental Item';
  const orderId =
    rentalOrder.rentalOrderId ||
    (rentalOrder._id ? `RNT-${String(rentalOrder._id).slice(-8).toUpperCase()}` : 'N/A');
  const customerName = escapeHtml(rentalOrder.shippingAddress?.name || 'Customer');
  const title = escapeHtml(rentalTitle);

  const refundAmount = refundData.refundAmount || 0;
  const isForfeited = refundAmount === 0;

  const methodText =
    refundData.method === 'cash' ? 'Cash' : 'Razorpay — refunded to your original payment method';

  const body = `
    <h2>${isForfeited ? 'Security Deposit Update' : 'Security Deposit Refunded'}</h2>
    <p>Dear ${customerName},</p>
    <p>Your security deposit for <strong>${title}</strong> has been processed after inspection.</p>
    
    <h3 style="color: #111827; margin-top: 24px;">Refund Details</h3>
    ${dataTable([
      { label: 'Rental Item', value: `<strong>${title}</strong>` },
      { label: 'Deposit Held', value: formatCurrency(rentalOrder.securityDeposit) },
      { label: 'Deductions', value: formatCurrency(rentalOrder.securityDeposit - refundAmount) },
      { label: 'Refund Amount', value: `<strong>${formatCurrency(refundAmount)}</strong>` },
      ...(refundAmount > 0 ? [{ label: 'Refund Method', value: methodText }] : []),
      { label: 'Reference No', value: escapeHtml(orderId) },
    ])}
    
    ${buildSupportSection()}
  `;

  return {
    subject: `Security Deposit ${isForfeited ? 'Update' : 'Refunded'} for ${rentalTitle}`,
    html: getLuxuryEmailWrapper('Deposit Processed', body),
  };
};

export const buildRentalPaymentReceivedEmail = (rentalOrder: any, paymentData: any) => {
  const rentalTitle =
    rentalOrder.productTitle ||
    rentalOrder.showcaseTitle ||
    rentalOrder.title ||
    rentalOrder.name ||
    'Rental Item';
  const orderId =
    rentalOrder.rentalOrderId ||
    (rentalOrder._id ? `RNT-${String(rentalOrder._id).slice(-8).toUpperCase()}` : 'N/A');
  const customerName = escapeHtml(rentalOrder.shippingAddress?.name || 'Customer');
  const frontendUrl = getFrontendUrl();
  const title = escapeHtml(rentalTitle);

  const amountReceived = paymentData.amount || 0;
  const isPaid = rentalOrder.paymentStatus === 'paid';

  const body = `
    <h2>Payment Received for ${title}</h2>
    <p>Dear ${customerName},</p>
    <p>We have successfully received a payment of <strong>${formatCurrency(amountReceived)}</strong> toward your rental for ${title}.</p>
    
    ${isPaid ? `<p><strong>Your rental payment is now complete.</strong></p>` : ''}
    
    <h3 style="color: #111827; margin-top: 24px;">Payment Summary</h3>
    ${dataTable([
      { label: 'Rental Item', value: `<strong>${title}</strong>` },
      { label: 'Total Amount', value: formatCurrency(rentalOrder.totalAmount) },
      {
        label: 'Total Paid',
        value: formatCurrency(rentalOrder.amountPaid || rentalOrder.totalAmount),
      },
      {
        label: 'Remaining Due',
        value: `<strong>${formatCurrency(Math.max(0, rentalOrder.totalAmount - (rentalOrder.amountPaid || rentalOrder.totalAmount)))}</strong>`,
      },
      { label: 'Reference No', value: escapeHtml(orderId) },
    ])}

    ${button('View My Rental', `${frontendUrl}/dashboard/rentals`)}
    ${buildSupportSection()}
  `;

  return {
    subject: `${isPaid ? 'Rental Payment Complete' : 'Payment Received'} for ${rentalTitle}`,
    html: getLuxuryEmailWrapper('Payment Confirmation', body),
  };
};
