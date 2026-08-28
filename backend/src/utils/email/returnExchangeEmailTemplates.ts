import {
  getLuxuryEmailWrapper,
  formatCurrency,
  escapeHtml,
  button,
  dataTable,
} from './emailTemplates';
import { getFrontendUrl } from '../getFrontendUrl';

const itemsTable = (items: any[]) => {
  const itemsHtml = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 0; width: 60px;">
        <img src="${escapeHtml(item.imageSrc)}" alt="Product" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px;" />
      </td>
      <td style="padding: 12px 12px; font-size: 14px; color: #374151;">
        <strong style="color: #111827;">${escapeHtml(item.title || item.name || 'Item')}</strong><br/>
        <span style="color: #6b7280; font-size: 12px;">Qty: ${item.returnQuantity || item.quantity || 1} ${item.variant ? '| ' + escapeHtml(item.variant) : ''}</span>
      </td>
      <td style="padding: 12px 0; font-size: 14px; text-align: right; color: #111827; font-family: monospace; font-weight: 500;">
        ${formatCurrency(item.unitPrice || item.price || 0)}
      </td>
    </tr>
  `,
    )
    .join('');

  return `
    <div style="margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>
  `;
};

// --- Customer Emails ---

export const buildReturnSubmittedCustomerEmail = (returnRequest: any, user: any) => {
  const preheader = `We've received your return request ${returnRequest.returnId}`;
  const body = `
    <h2>Return Request Received</h2>
    <p>Dear ${escapeHtml(user?.name || 'Customer')},</p>
    <p>We've received your return request <strong>${returnRequest.returnId}</strong>. Our team will review the request and keep you updated.</p>
    
    ${dataTable([
      { label: 'Status', value: 'Pending Review' },
      { label: 'Original Order', value: '#' + returnRequest.orderId.toString() },
    ])}
    
    <h3 style="color: #111827;">Items to Return</h3>
    ${itemsTable(returnRequest.items)}

    <h3 style="color: #111827;">What Happens Next?</h3>
    <ol style="color: #374151; font-size: 14px; line-height: 1.6; padding-left: 16px;">
      <li>Our team will review your return request.</li>
      <li>You'll receive an email once it has been approved or rejected.</li>
      <li>If approved, we will share pickup and refund instructions.</li>
    </ol>
    
    ${button('View Return Request', getFrontendUrl() + '/dashboard/returns/' + returnRequest._id)}
  `;
  return {
    subject: `Return Request Received - ${returnRequest.returnId}`,
    html: getLuxuryEmailWrapper('Return Request Received', body, undefined, preheader),
  };
};

export const buildReturnApprovedCustomerEmail = (returnRequest: any, user: any) => {
  const preheader = `Your return request ${returnRequest.returnId} has been approved.`;
  const pickupAddress = returnRequest.pickup?.address;
  let addressStr = 'Address on file';
  if (pickupAddress) {
    addressStr = escapeHtml(
      (pickupAddress.street || pickupAddress.address) +
        ', ' +
        pickupAddress.city +
        ', ' +
        pickupAddress.state +
        ' ' +
        (pickupAddress.zipCode || pickupAddress.pincode),
    );
  }

  const body = `
    <h2>Return Request Approved</h2>
    <p>Dear ${escapeHtml(user?.name || 'Customer')},</p>
    <p>Good news! Your return request <strong>${returnRequest.returnId}</strong> has been approved.</p>
    
    ${dataTable([
      { label: 'Status', value: 'Approved' },
      {
        label: 'Refund Method',
        value: returnRequest.refundMethod === 'wallet' ? 'Store Wallet' : 'Original Payment Method',
      },
    ])}
    
    <h3 style="color: #111827;">Approved Items</h3>
    ${itemsTable(returnRequest.items)}

    <h3 style="color: #111827;">Pickup Instructions</h3>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 14px; line-height: 1.6;">
      <strong>Pickup Address:</strong><br/>
      ${addressStr}
    </div>

    <h3 style="color: #111827;">What Happens Next?</h3>
    <ol style="color: #374151; font-size: 14px; line-height: 1.6; padding-left: 16px;">
      <li>Our courier partner will contact you for pickup.</li>
      <li>Please pack the items securely in their original packaging.</li>
      <li>Once the items are received and inspected, your refund will be processed.</li>
    </ol>
    
    ${button('View Return Details', getFrontendUrl() + '/dashboard/returns/' + returnRequest._id)}
  `;
  return {
    subject: `Return Request Approved - ${returnRequest.returnId}`,
    html: getLuxuryEmailWrapper('Return Request Approved', body, undefined, preheader),
  };
};

export const buildReturnRejectedCustomerEmail = (returnRequest: any, user: any) => {
  const preheader = `Update on your return request ${returnRequest.returnId}`;
  const body = `
    <h2>Update on Return Request</h2>
    <p>Dear ${escapeHtml(user?.name || 'Customer')},</p>
    <p>We've reviewed your return request <strong>${returnRequest.returnId}</strong>. Unfortunately, we are unable to approve it.</p>
    
    ${dataTable([
      { label: 'Status', value: 'Rejected' },
      {
        label: 'Reason',
        value: escapeHtml(returnRequest.approvalNotes || 'Does not meet return policy criteria'),
      },
    ])}
    
    <p style="font-size: 14px; color: #6b7280;">If you believe this is an error or would like to provide more information, you can reply to this email to contact our support team.</p>
    
    ${button('View Request Details', getFrontendUrl() + '/dashboard/returns/' + returnRequest._id)}
  `;
  return {
    subject: `Update on Return Request - ${returnRequest.returnId}`,
    html: getLuxuryEmailWrapper('Return Request Rejected', body, undefined, preheader),
  };
};

// --- Refund Emails ---

export const buildRefundInitiatedCustomerEmail = (returnRequest: any, user: any) => {
  const preheader = `Refund of ${formatCurrency(returnRequest.refundBreakdown?.grandTotal)} initiated for ${returnRequest.returnId}`;
  const body = `
    <h2>Refund Initiated</h2>
    <p>Dear ${escapeHtml(user?.name || 'Customer')},</p>
    <p>Your refund of <strong>${formatCurrency(returnRequest.refundBreakdown?.grandTotal)}</strong> for return request <strong>${returnRequest.returnId}</strong> has been initiated.</p>
    
    ${dataTable([
      { label: 'Amount', value: formatCurrency(returnRequest.refundBreakdown?.grandTotal) },
      {
        label: 'Destination',
        value: returnRequest.refundMethod === 'wallet' ? 'Store Wallet' : 'Original Payment Method',
      },
    ])}
    
    <p style="font-size: 14px; color: #6b7280;">Please note that it may take 3-5 business days for the amount to reflect in your account if processed to your original payment method. Wallet refunds are instant.</p>
    
    ${button('View Return Details', getFrontendUrl() + '/dashboard/returns/' + returnRequest._id)}
  `;
  return {
    subject: `Refund Initiated - ${returnRequest.returnId}`,
    html: getLuxuryEmailWrapper('Refund Initiated', body, undefined, preheader),
  };
};

export const buildRefundCompletedCustomerEmail = (returnRequest: any, user: any) => {
  const preheader = `Refund of ${formatCurrency(returnRequest.refundBreakdown?.grandTotal)} completed for ${returnRequest.returnId}`;
  const body = `
    <h2>Refund Completed</h2>
    <p>Dear ${escapeHtml(user?.name || 'Customer')},</p>
    <p>Your refund of <strong>${formatCurrency(returnRequest.refundBreakdown?.grandTotal)}</strong> for return request <strong>${returnRequest.returnId}</strong> has been successfully processed.</p>
    
    ${dataTable([
      { label: 'Amount', value: formatCurrency(returnRequest.refundBreakdown?.grandTotal) },
      {
        label: 'Destination',
        value: returnRequest.refundMethod === 'wallet' ? 'Store Wallet' : 'Original Payment Method',
      },
      { label: 'Status', value: 'Completed' },
    ])}
    
    ${button('View Return Details', getFrontendUrl() + '/dashboard/returns/' + returnRequest._id)}
  `;
  return {
    subject: `Refund Completed - ${returnRequest.returnId}`,
    html: getLuxuryEmailWrapper('Refund Completed', body, undefined, preheader),
  };
};

// --- Exchange Emails ---

export const buildExchangeSubmittedCustomerEmail = (
  returnRequest: any,
  exchangeDetails: any,
  user: any,
) => {
  const preheader = `We've received your exchange request ${returnRequest.returnId}`;
  const diffAction = exchangeDetails?.differenceAction || 'direct_exchange';

  let nextStepsHtml;
  if (diffAction === 'collect_payment') {
    nextStepsHtml = `
      <ol style="color: #374151; font-size: 14px; line-height: 1.6; padding-left: 16px;">
        <li>Complete the additional payment required for the replacement item.</li>
        <li>After payment verification, the request will be sent for review.</li>
        <li>You'll receive another email after our team approves or rejects it.</li>
      </ol>
    `;
  } else {
    nextStepsHtml = `
      <ol style="color: #374151; font-size: 14px; line-height: 1.6; padding-left: 16px;">
        <li>Your request has been received.</li>
        <li>Our team will review the exchange.</li>
        <li>You'll receive an email once it has been approved or rejected.</li>
      </ol>
    `;
  }

  const pickupAddress = returnRequest.pickup?.address;
  let addressStr = 'Address on file';
  if (pickupAddress) {
    addressStr = escapeHtml(
      (pickupAddress.street || pickupAddress.address) +
        ', ' +
        pickupAddress.city +
        ', ' +
        pickupAddress.state +
        ' ' +
        (pickupAddress.zipCode || pickupAddress.pincode),
    );
  }

  const body = `
    <h2>Exchange Request Received</h2>
    <p>Dear ${escapeHtml(user?.name || 'Customer')},</p>
    <p>We've received your exchange request <strong>${returnRequest.returnId}</strong>. ${diffAction === 'collect_payment' ? 'Additional payment is required before it can be submitted for review.' : 'Our team will review the request and keep you updated.'}</p>
    
    ${dataTable([
      {
        label: 'Status',
        value: diffAction === 'collect_payment' ? 'Payment Required' : 'Pending Review',
      },
      { label: 'Original Order', value: '#' + returnRequest.orderId.toString() },
    ])}
    
    <h3 style="color: #111827;">Item Being Exchanged</h3>
    ${itemsTable([exchangeDetails?.originalItem || returnRequest.items[0]])}
    
    <h3 style="color: #111827;">Replacement Requested</h3>
    ${exchangeDetails?.replacementItem ? itemsTable([exchangeDetails.replacementItem]) : ''}
    
    <h3 style="color: #111827;">Requested Pickup Address</h3>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 14px; line-height: 1.6;">
      ${addressStr}
    </div>

    <h3 style="color: #111827;">What Happens Next?</h3>
    ${nextStepsHtml}
    
    ${button(diffAction === 'collect_payment' ? 'Complete Payment' : 'View Exchange Request', getFrontendUrl() + '/dashboard/returns/' + returnRequest._id)}
  `;
  return {
    subject:
      diffAction === 'collect_payment'
        ? `Payment Required for Exchange Request - ${returnRequest.returnId}`
        : `Exchange Request Received - ${returnRequest.returnId}`,
    html: getLuxuryEmailWrapper('Exchange Request Received', body, undefined, preheader),
  };
};

export const buildExchangePaymentVerifiedEmail = (
  returnRequest: any,
  exchangeDetails: any,
  user: any,
) => {
  const preheader = `Payment verified for exchange request ${returnRequest.returnId}`;

  const body = `
    <h2>Exchange Payment Received</h2>
    <p>Dear ${escapeHtml(user?.name || 'Customer')},</p>
    <p>We've successfully verified your payment of ${formatCurrency(exchangeDetails?.priceDifference)} for exchange request <strong>${returnRequest.returnId}</strong>.</p>
    
    ${dataTable([
      { label: 'Status', value: 'Pending Review' },
      { label: 'Payment Status', value: 'Paid' },
      { label: 'Additional Amount', value: formatCurrency(exchangeDetails?.priceDifference) },
    ])}
    
    <h3 style="color: #111827;">What Happens Next?</h3>
    <ol style="color: #374151; font-size: 14px; line-height: 1.6; padding-left: 16px;">
      <li>Payment has been received.</li>
      <li>Our team will now review your exchange request.</li>
      <li>We'll email you after a decision is made.</li>
    </ol>
    
    ${button('View Exchange Request', getFrontendUrl() + '/dashboard/returns/' + returnRequest._id)}
  `;
  return {
    subject: `Payment Verified for Exchange Request - ${returnRequest.returnId}`,
    html: getLuxuryEmailWrapper('Payment Verified', body, undefined, preheader),
  };
};

export const buildExchangeApprovedCustomerEmail = (
  returnRequest: any,
  exchangeDetails: any,
  user: any,
) => {
  const preheader = `Your exchange request ${returnRequest.returnId} has been approved.`;
  const pickupAddress = returnRequest.pickup?.address;
  let addressStr = 'Address on file';
  if (pickupAddress) {
    addressStr = escapeHtml(
      (pickupAddress.street || pickupAddress.address) +
        ', ' +
        pickupAddress.city +
        ', ' +
        pickupAddress.state +
        ' ' +
        (pickupAddress.zipCode || pickupAddress.pincode),
    );
  }

  const body = `
    <h2>Exchange Request Approved</h2>
    <p>Dear ${escapeHtml(user?.name || 'Customer')},</p>
    <p>Good news! Your exchange request <strong>${returnRequest.returnId}</strong> has been approved.</p>
    
    ${dataTable([{ label: 'Status', value: 'Approved' }])}
    
    <h3 style="color: #111827;">Approved Replacement</h3>
    ${exchangeDetails?.replacementItem ? itemsTable([exchangeDetails.replacementItem]) : ''}

    <h3 style="color: #111827;">Pickup Instructions</h3>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px; font-size: 14px; line-height: 1.6;">
      <strong>Pickup Address:</strong><br/>
      ${addressStr}
    </div>

    <h3 style="color: #111827;">What Happens Next?</h3>
    <ol style="color: #374151; font-size: 14px; line-height: 1.6; padding-left: 16px;">
      <li>Our courier partner will contact you for pickup of the original item.</li>
      <li>Please pack the original items securely.</li>
      <li>Once the original item is received and inspected, your replacement will be dispatched.</li>
    </ol>
    
    ${button('View Exchange Details', getFrontendUrl() + '/dashboard/returns/' + returnRequest._id)}
  `;
  return {
    subject: `Exchange Request Approved - ${returnRequest.returnId}`,
    html: getLuxuryEmailWrapper('Exchange Request Approved', body, undefined, preheader),
  };
};

export const buildExchangeRejectedCustomerEmail = (returnRequest: any, user: any) => {
  const preheader = `Update on your exchange request ${returnRequest.returnId}`;
  const body = `
    <h2>Update on Exchange Request</h2>
    <p>Dear ${escapeHtml(user?.name || 'Customer')},</p>
    <p>We've reviewed your exchange request <strong>${returnRequest.returnId}</strong>. Unfortunately, we are unable to approve it.</p>
    
    ${dataTable([
      { label: 'Status', value: 'Rejected' },
      {
        label: 'Reason',
        value: escapeHtml(returnRequest.approvalNotes || 'Does not meet exchange policy criteria'),
      },
    ])}
    
    <p style="font-size: 14px; color: #6b7280;">If you paid any additional amount, it will be refunded. If you believe this is an error, you can reply to this email to contact our support team.</p>
    
    ${button('View Request Details', getFrontendUrl() + '/dashboard/returns/' + returnRequest._id)}
  `;
  return {
    subject: `Update on Exchange Request - ${returnRequest.returnId}`,
    html: getLuxuryEmailWrapper('Exchange Request Rejected', body, undefined, preheader),
  };
};

// --- Admin Emails ---

export const buildReturnAdminEmail = (returnRequest: any, user: any) => {
  const body = `
    <h2>New Return Request: ${returnRequest.returnId}</h2>
    <p>A new return request has been submitted by ${escapeHtml(user?.name)}.</p>
    
    ${dataTable([
      { label: 'Customer', value: escapeHtml(user?.name || 'Unknown') },
      { label: 'Email', value: escapeHtml(user?.email || 'Unknown') },
      { label: 'Phone', value: escapeHtml(user?.phone || 'Unknown') },
      { label: 'Order ID', value: escapeHtml(returnRequest.orderId.toString()) },
      { label: 'Value', value: formatCurrency(returnRequest.refundBreakdown?.grandTotal || 0) },
      { label: 'Status', value: 'Pending Admin Review' },
    ])}
    
    <h3 style="color: #111827;">Items to Return</h3>
    ${itemsTable(returnRequest.items)}
    
    ${button('Review Return Request', getFrontendUrl() + '/admin/returns/' + returnRequest._id)}
  `;
  return {
    subject: `[NEW RETURN] ${returnRequest.returnId} - ${formatCurrency(returnRequest.refundBreakdown?.grandTotal || 0)}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};

export const buildExchangeAdminEmail = (returnRequest: any, exchangeDetails: any, user: any) => {
  const diffAction = exchangeDetails?.differenceAction || 'direct_exchange';
  const paymentStatusText =
    diffAction === 'collect_payment'
      ? 'Payment Required'
      : diffAction === 'refund_difference'
        ? 'Refund Potential'
        : 'Direct Exchange';

  const body = `
    <h2>New Exchange Request: ${returnRequest.returnId}</h2>
    <p>A new exchange request has been submitted by ${escapeHtml(user?.name)}.</p>
    
    ${dataTable([
      { label: 'Customer', value: escapeHtml(user?.name || 'Unknown') },
      { label: 'Email', value: escapeHtml(user?.email || 'Unknown') },
      { label: 'Order ID', value: escapeHtml(returnRequest.orderId.toString()) },
      { label: 'Financial Adjustment', value: paymentStatusText },
      { label: 'Amount Difference', value: formatCurrency(exchangeDetails?.priceDifference || 0) },
      { label: 'Status', value: 'Pending Admin Review' },
    ])}
    
    <h3 style="color: #111827;">Original Item</h3>
    ${itemsTable([exchangeDetails?.originalItem || returnRequest.items[0]])}
    
    <h3 style="color: #111827;">Requested Replacement</h3>
    ${exchangeDetails?.replacementItem ? itemsTable([exchangeDetails.replacementItem]) : ''}
    
    ${button('Review Exchange Request', getFrontendUrl() + '/admin/returns/' + returnRequest._id)}
  `;
  return {
    subject: `[NEW EXCHANGE] ${returnRequest.returnId} - ${paymentStatusText}`,
    html: getLuxuryEmailWrapper('Admin Alert', body),
  };
};
