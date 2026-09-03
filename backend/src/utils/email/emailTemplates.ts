/**
 * Siri Arts & Crafts - Premium Heritage-style Transactional Email Templates
 * Fully responsive, warm luxury theme matching the website's handcrafted aesthetic.
 * Featuring dark/light mode support, elegant serif typography, and clear layouts.
 */

// --- Shared Utility Components ---

export const formatCurrency = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

export const escapeHtml = (unsafe: any) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const getPrimaryEntityName = (items: any[]): string | null => {
  if (!items || !Array.isArray(items) || items.length === 0) return null;
  if (items.length === 1)
    return items[0].title || items[0].name || items[0].productId?.title || null;
  return null;
};

export const button = (text: string, url: string) => `
  <div style="margin: 32px 0; text-align: center;">
    <a href="${url}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 6px; display: inline-block;">
      ${text}
    </a>
  </div>
`;

export const dataTable = (rows: { label: string; value: string }[]) => {
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

/**
 * Reusable heritage HTML wrapper featuring a warm luxury card layout, CSS resets,
 * elegant serif branding typography, dark mode rendering, and brand alignment.
 */
export const getLuxuryEmailWrapper = (
  subtitle: string,
  bodyContentHtml: string,
  footerTextHtml: string = 'This is an automated transmission from Siri Arts & Crafts. If you did not request this, please safely disregard this email or contact support.',
  preheaderText?: string,
): string => {
  // Logo removed in favor of text header

  const previewText = preheaderText || subtitle;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Siri Arts & Crafts</title>
  <style>
    /* Reset & Standard client overrides */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f9fafb; color: #111827; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; }

    /* Core Layout */
    .wrapper-table { background-color: #f9fafb; width: 100% !important; }
    .email-container { max-width: 600px; margin: 0 auto !important; width: 100% !important; }
    .main-card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 40px; }
    .brand-header { padding-bottom: 24px; border-bottom: 1px solid #f3f4f6; margin-bottom: 32px; text-align: center; }
    .brand-link { text-decoration: none; display: inline-block; }
    
    /* Clean text header, easily replaceable by logo image */
    .brand-name { font-size: 22px; font-weight: 600; color: #111827; display: block; margin: 0; letter-spacing: -0.5px; }
    
    .body-content { color: #374151; font-size: 15px; line-height: 1.6; text-align: left; }
    .body-content h2 { color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; }
    .body-content p { margin: 0 0 20px 0; }

    /* Common Components */
    .code-container { background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center; }
    .code-label { display: block; color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .code-display { margin: 0; letter-spacing: 6px; color: #111827; font-size: 36px; font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; text-align: center; }
    
    .button-wrapper { margin: 32px 0; text-align: center; }
    .cta-button { background-color: #111827; color: #ffffff !important; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 6px; display: inline-block; }
    
    .footer-divider { border-top: 1px solid #f3f4f6; margin-top: 32px; padding-top: 24px; text-align: center; }
    .footer-text { color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0 0 8px 0; }
    .footer-text a { color: #111827; text-decoration: underline; }

    /* Dark Mode styling */
    @media (prefers-color-scheme: dark) {
      body, .wrapper-table { background-color: #111827 !important; color: #f9fafb !important; }
      .main-card { background-color: #1f2937 !important; border-color: #374151 !important; }
      .brand-header { border-bottom-color: #374151 !important; }
      .brand-name { color: #ffffff !important; }
      .body-content { color: #d1d5db !important; }
      .body-content h2 { color: #ffffff !important; }
      .code-container { background-color: #374151 !important; border-color: #4b5563 !important; }
      .code-label { color: #9ca3af !important; }
      .code-display { color: #ffffff !important; }
      .cta-button { background-color: #ffffff !important; color: #111827 !important; }
      .footer-divider { border-top-color: #374151 !important; }
      .footer-text { color: #9ca3af !important; }
      .footer-text a { color: #ffffff !important; }
    }

    /* Mobile Adaptations */
    @media only screen and (max-width: 600px) {
      .main-card { padding: 24px 16px !important; }
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    ${previewText}
  </div>
  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="wrapper-table">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container">
          <tr>
            <td class="main-card">
              <div class="brand-header">
                <a href="https://siriartsandcrafts.com" target="_blank" class="brand-link" style="display: block; text-align: center;">
                  <h1 class="brand-name" style="color: #111827; margin: 0; font-size: 24px; text-decoration: none; font-weight: bold; text-align: center;">Siri Arts & Crafts</h1>
                </a>
              </div>
              <div class="body-content">
                ${bodyContentHtml}
              </div>
              <div class="footer-divider">
                <p class="footer-text">
                  ${footerTextHtml}
                </p>
                <p class="footer-text">
                  Siri Arts & Crafts<br/>
                  <a href="https://siriartsandcrafts.com" target="_blank">siriartsandcrafts.com</a>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Generates the premium OTP Authentication Email
 */
export const getOtpEmailTemplate = (otpCode: string, expiryMinutes: number = 5): string => {
  const preheader = `Use this code to verify your email. It expires in ${expiryMinutes} minutes.`;
  const body = `
    <h2>Security Verification</h2>
    <p>Please use the code below to securely access your Siri Arts & Crafts account.</p>
    <div class="code-container">
      <span class="code-label">Verification Code</span>
      <div class="code-display">${otpCode}</div>
    </div>
    <p style="color: #6b7280; font-size: 13px;">
      This code will expire in ${expiryMinutes} minutes. For security, never share this code with anyone.
    </p>
    <p style="color: #6b7280; font-size: 13px;">
      If you did not request this, you can safely ignore this email.
    </p>
  `;
  return getLuxuryEmailWrapper('Security Verification', body, undefined, preheader);
};

/**
 * Generates the premium Cash on Delivery Order Verification Email
 */
export const getCodOtpEmailTemplate = (otpCode: string, expiryMinutes: number = 5): string => {
  const preheader = `Use this code to verify your COD order. It expires in ${expiryMinutes} minutes.`;
  const body = `
    <h2>Order Verification</h2>
    <p>To confirm your Cash on Delivery order, please use the verification code below.</p>
    <div class="code-container">
      <span class="code-label">Verification Code</span>
      <div class="code-display">${otpCode}</div>
    </div>
    <p style="color: #6b7280; font-size: 13px;">
      This code will expire in ${expiryMinutes} minutes. For security, never share this code with anyone.
    </p>
    <p style="color: #6b7280; font-size: 13px;">
      If you did not request this, you can safely ignore this email.
    </p>
  `;
  return getLuxuryEmailWrapper('COD Verification Code', body, undefined, preheader);
};

/**
 * Generates the premium Team Invitation Email
 */
export const getTeamInviteEmailTemplate = (
  inviteUrl: string,
  role: string,
  permissions: string,
): string => {
  const preheader = `You've been invited to join the Siri Arts & Crafts team.`;
  const body = `
    <h2>Join the Workspace</h2>
    <p>
      You have been invited to join the Siri Arts & Crafts workspace as a <strong>${role}</strong> with <strong>${permissions}</strong> access.
    </p>
    <div class="button-wrapper">
      <a href="${inviteUrl}" class="cta-button" target="_blank">Accept Invitation</a>
    </div>
    <p style="color: #6b7280; font-size: 13px;">
      If you decline or ignore this, the link will expire.
    </p>
  `;
  return getLuxuryEmailWrapper('Staff Workspace Invite', body, undefined, preheader);
};

/**
 * Generates the premium SMTP Diagnostic Test Email
 */
export const getDiagnosticTestEmailTemplate = (
  host: string,
  user: string,
  timestamp: string,
): string => {
  const body = `
    <h2>Connection Test Successful</h2>
    <p>
      Your transactional email settings are working correctly. Connection details:
    </p>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 24px 0; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 13px; line-height: 1.6; color: #111827;">
      <strong>SMTP Host:</strong> ${host}<br/>
      <strong>SMTP Account:</strong> ${user}<br/>
      <strong>Verified At:</strong> ${timestamp}<br/>
      <strong>Status:</strong> Active
    </div>
    <p style="color: #6b7280; font-size: 13px;">
      You can now use this configuration to securely deliver emails in production.
    </p>
  `;
  return getLuxuryEmailWrapper('SMTP Connectivity Test', body);
};

/**
 * Generates the premium Order Confirmation Email (Admin & Customer)
 */
export const getOrderConfirmationTemplate = (orderDetails: any): string => {
  const preheader = `Your order #${orderDetails.orderId} has been confirmed.`;
  const body = `
    <h2>Order Confirmed</h2>
    <p>
      Thank you for your purchase. We are processing your order and will notify you when it dispatches.
    </p>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 24px 0; font-size: 14px; line-height: 1.6; color: #111827;">
      <strong>Order ID:</strong> #${orderDetails.orderId}<br/>
      <strong>Total Amount:</strong> ₹${orderDetails.totalAmount}<br/>
      <strong>Payment Status:</strong> ${orderDetails.paymentStatus}<br/>
      <strong>Estimated Delivery:</strong> ${orderDetails.deliveryDate || '5-7 business days'}
    </div>
    <div class="button-wrapper">
      <a href="${orderDetails.orderLink}" class="cta-button" target="_blank">Track Order Status</a>
    </div>
    <p style="color: #6b7280; font-size: 13px;">
      A PDF invoice has been attached to this email for your reference.
    </p>
  `;
  return getLuxuryEmailWrapper('Order Confirmation', body, undefined, preheader);
};

/**
 * Generates the premium Admin Notification Email
 */
export const getAdminNotificationTemplate = (
  title: string,
  message: string,
  actionUrl?: string,
): string => {
  const actionButton = actionUrl
    ? `<div class="button-wrapper"><a href="${actionUrl}" class="cta-button" target="_blank">View Details</a></div>`
    : '';

  const body = `
    <h2>${title}</h2>
    <p>${message}</p>
    ${actionButton}
  `;
  return getLuxuryEmailWrapper('Admin System Alert', body);
};

/**
 * Generates the premium Welcome Email
 */
export const getWelcomeEmailTemplate = (name: string, frontendUrl: string): string => {
  const preheader = `Welcome to Siri Arts & Crafts. Thank you for joining us.`;
  const body = `
    <h2>Welcome to Siri Arts & Crafts</h2>
    <p>Hello ${name},</p>
    <p>
      Thank you for joining our community. We invite you to explore our curated collections and use our digital studio to plan your event decor.
    </p>
    <div class="button-wrapper">
      <a href="${frontendUrl}" class="cta-button" target="_blank">Explore Studio</a>
    </div>
    <p style="color: #6b7280; font-size: 13px;">
      If you have any questions or want to discuss a custom event setup, feel free to reply directly to this email. We are here to help.
    </p>
  `;
  return getLuxuryEmailWrapper('Welcome to Siri Arts & Crafts', body, undefined, preheader);
};

/**
 * Generates the premium Suspicious Login Alert Email
 */
export const getSuspiciousLoginEmailTemplate = (
  name: string,
  loginTime: string,
  ipAddress: string,
): string => {
  const preheader = `New login detected for your account.`;
  const body = `
    <h2 style="color: #dc2626;">New Login Detected</h2>
    <p>Hello ${name},</p>
    <p>We detected a new login to your Siri Arts & Crafts account.</p>
    <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 20px; border-radius: 8px; margin: 24px 0; font-size: 14px; line-height: 1.6; color: #991b1b;">
      <strong>Time:</strong> ${loginTime}<br/>
      <strong>IP Address:</strong> ${ipAddress}<br/>
      <strong>Device Info:</strong> ${ipAddress === '127.0.0.1' ? 'Local System' : 'Remote Client'}
    </div>
    <p style="color: #dc2626; font-size: 13px; font-weight: 600;">
      If this wasn't you, please contact our security team immediately to protect your account.
    </p>
    <p style="color: #6b7280; font-size: 13px;">
      If this was you, you can safely ignore this email.
    </p>
  `;
  return getLuxuryEmailWrapper(
    'Security Alert',
    body,
    'This is a critical security notification. If you did not log in, contact us immediately.',
    preheader,
  );
};
