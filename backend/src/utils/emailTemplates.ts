/**
 * Siri Arts & Crafts - Premium Heritage-style Transactional Email Templates
 * Fully responsive, warm luxury theme matching the website's handcrafted aesthetic.
 * Featuring dark/light mode support, elegant serif typography, and clear layouts.
 */

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
    body, table, td, a {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    table {
      border-collapse: collapse !important;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #faf9f6;
      color: #2d2b29;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    /* Core Layout */
    .wrapper-table {
      background-color: #faf9f6;
      width: 100% !important;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto !important;
      width: 100% !important;
    }
    .main-card {
      background-color: #ffffff;
      border: 1px solid #d0c5af;
      border-radius: 16px;
      padding: 44px 36px;
      box-shadow: 0 10px 30px rgba(115, 92, 0, 0.03);
    }
    .brand-header {
      padding-bottom: 24px;
      border-bottom: 1px solid #efeeeb;
      margin-bottom: 32px;
      text-align: center;
    }
    .brand-link {
      text-decoration: none;
      display: inline-block;
    }
    .brand-name {
      font-family: 'Playfair Display', 'Didot', 'Georgia', serif;
      font-size: 22px;
      font-weight: 400;
      color: #735c00;
      vertical-align: middle;
      letter-spacing: 3px;
      text-transform: uppercase;
      display: block;
      margin-top: 4px;
    }
    .body-content {
      color: #2d2b29;
      font-size: 14.5px;
      line-height: 1.7;
      text-align: left;
    }

    /* Common Components */
    .code-container {
      background-color: #faf9f6;
      border: 1px solid #d0c5af;
      padding: 24px;
      border-radius: 12px;
      margin: 24px 0;
      text-align: center;
    }
    .code-label {
      display: block;
      color: #7f7663;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 12px;
    }
    .code-display {
      margin: 0;
      letter-spacing: 8px;
      color: #735c00;
      font-size: 38px;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding-left: 8px;
      text-align: center;
    }
    .button-wrapper {
      margin: 32px 0;
      text-align: center;
    }
    .cta-button {
      background-color: #735c00;
      color: #ffffff !important;
      padding: 12px 28px;
      text-decoration: none;
      font-size: 11px;
      font-weight: 700;
      border-radius: 8px;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      box-shadow: 0 4px 10px rgba(115, 92, 0, 0.15);
    }
    .footer-divider {
      border-top: 1px solid #efeeeb;
      margin-top: 32px;
      padding-top: 24px;
      text-align: center;
    }
    .footer-text {
      color: #a39c8c;
      font-size: 11.5px;
      line-height: 1.6;
      margin: 0 0 8px 0;
    }
    .footer-text a {
      color: #735c00;
      text-decoration: underline;
    }

    /* Dark Mode styling */
    @media (prefers-color-scheme: dark) {
      body, .wrapper-table {
        background-color: #0f0e0c !important;
        color: #efeeeb !important;
      }
      .main-card {
        background-color: #1c1a17 !important;
        border-color: #3d3423 !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6) !important;
      }
      .brand-header {
        border-bottom-color: #2d2b29 !important;
      }
      .brand-name {
        color: #e9c349 !important;
      }
      .body-content {
        color: #efeeeb !important;
      }
      .code-container {
        background-color: #2d2b29 !important;
        border-color: #3d3423 !important;
      }
      .code-display {
        color: #e9c349 !important;
      }
      .cta-button {
        background-color: #e9c349 !important;
        color: #0f0e0c !important;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3) !important;
      }
      .footer-divider {
        border-top-color: #2d2b29 !important;
      }
      .footer-text, .footer-text a {
        color: #7f7663 !important;
      }
    }

    /* Mobile Adaptations */
    @media only screen and (max-width: 600px) {
      .main-card {
        padding: 28px 20px !important;
      }
    }
  </style>
</head>
<body>
  <!-- Preheader preview text for inbox clients -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    ${previewText}
  </div>
  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="wrapper-table">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container">
          <tr>
            <td class="main-card">
              <!-- Header -->
              <div class="brand-header">
                <a href="https://siriartsandcrafts.com" target="_blank" class="brand-link">
                  <div style="font-size: 24px; color: #735c00; margin-bottom: 6px; font-weight: 300; line-height: 1;">✦</div>
                  <span class="brand-name">Siri Arts & Crafts</span>
                  <div style="width: 50px; height: 1px; background-color: #735c00; margin: 12px auto 0 auto; opacity: 0.25;"></div>
                </a>
              </div>

              <!-- Body -->
              <div class="body-content">
                ${bodyContentHtml}
              </div>

              <!-- Footer -->
              <div class="footer-divider">
                <p class="footer-text">
                  ${footerTextHtml}
                </p>
                <p class="footer-text">
                  This email was sent by Siri Arts & Crafts.<br/>
                  <a href="https://siriartsandcrafts.com" target="_blank">siriartsandcrafts.com</a> • Ongole, Andhra Pradesh, India
                </p>
                <p class="footer-text" style="color: #94a3b8; margin-top: 12px;">
                  &copy; ${new Date().getFullYear()} Siri Arts & Crafts. All rights reserved.
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
  const preheader = `Your sign-in code is ${otpCode}. Code will expire in ${expiryMinutes} minutes.`;
  const body = `
    <p style="margin: 0 0 24px 0; text-align: center;">Please verify your identity to securely access your Siri Arts & Crafts account.</p>
    <div class="code-container">
      <span class="code-label">Verification Code</span>
      <h1 class="code-display">${otpCode}</h1>
    </div>
    <p style="margin: 24px 0 0 0; color: #7f7663; font-size: 13px; text-align: center;">
      This code will expire in ${expiryMinutes} minutes. For security, never share this code with anyone.
    </p>
    <p style="margin: 12px 0 0 0; color: #7f7663; font-size: 13px; text-align: center;">
      If this wasn't you, you can safely ignore this email.
    </p>
  `;
  return getLuxuryEmailWrapper('Security Verification', body, undefined, preheader);
};

/**
 * Generates the premium Cash on Delivery Order Verification Email
 */
export const getCodOtpEmailTemplate = (otpCode: string, expiryMinutes: number = 5): string => {
  const preheader = `Your COD verification code is ${otpCode}. Code will expire in ${expiryMinutes} minutes.`;
  const body = `
    <p style="margin: 0 0 24px 0; text-align: center;">To confirm your Cash on Delivery order, please verify your identity using the verification code below.</p>
    <div class="code-container">
      <span class="code-label">Verification Code</span>
      <h1 class="code-display">${otpCode}</h1>
    </div>
    <p style="margin: 24px 0 0 0; color: #7f7663; font-size: 13px; text-align: center;">
      This code will expire in ${expiryMinutes} minutes. For security, never share this code with anyone.
    </p>
    <p style="margin: 12px 0 0 0; color: #7f7663; font-size: 13px; text-align: center;">
      If this wasn't you, you can safely ignore this email.
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
    <h2 style="color: #735c00; font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 400; margin: 0 0 16px 0; letter-spacing: 1px;">Join the Workspace</h2>
    <p style="margin: 0 0 24px 0;">
      You have been invited to join the Siri Arts & Crafts workspace as a <strong>${role.toLowerCase()}</strong> with <strong>${permissions.toLowerCase()}</strong> access.
    </p>
    <div class="button-wrapper">
      <a href="${inviteUrl}" class="cta-button" target="_blank">Accept Invitation</a>
    </div>
    <p style="margin: 24px 0 0 0; color: #7f7663; font-size: 13px;">
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
    <h2 style="color: #735c00; font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 400; margin: 0 0 16px 0; letter-spacing: 1px;">Connection Test Successful</h2>
    <p style="margin: 0 0 24px 0;">
      Your transactional email settings are working correctly. Connection details:
    </p>
    <div style="background-color: #faf9f6; border: 1px solid #d0c5af; padding: 20px; border-radius: 8px; margin: 24px 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.6; color: #2d2b29;">
      <strong style="color: #735c00;">SMTP Host:</strong> ${host}<br/>
      <strong style="color: #735c00;">SMTP Account:</strong> ${user}<br/>
      <strong style="color: #735c00;">Verified At:</strong> ${timestamp}<br/>
      <strong style="color: #735c00;">Status:</strong> Active
    </div>
    <p style="margin: 24px 0 0 0; color: #7f7663; font-size: 13px;">
      You can now use this SMTP configuration to securely deliver passwordless login OTPs, order statements, and campaign broadcasts in production.
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
    <h2 style="color: #735c00; font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 400; margin: 0 0 16px 0; letter-spacing: 1px;">Order Confirmed</h2>
    <p style="margin: 0 0 24px 0;">
      Thank you for your purchase. We are processing your order and will notify you when it dispatches.
    </p>
    <div style="background-color: #faf9f6; border: 1px solid #d0c5af; padding: 20px; border-radius: 8px; margin: 24px 0; font-size: 13px; line-height: 1.6; color: #2d2b29;">
      <strong style="color: #735c00;">Order ID:</strong> #${orderDetails.orderId}<br/>
      <strong style="color: #735c00;">Total Amount:</strong> ₹${orderDetails.totalAmount}<br/>
      <strong style="color: #735c00;">Payment Status:</strong> ${orderDetails.paymentStatus}<br/>
      <strong style="color: #735c00;">Estimated Delivery:</strong> ${orderDetails.deliveryDate || '5-7 business days'}
    </div>
    <div class="button-wrapper">
      <a href="${orderDetails.orderLink}" class="cta-button" target="_blank">Track Order Status</a>
    </div>
    <p style="margin: 24px 0 0 0; color: #7f7663; font-size: 13px;">
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
    <h2 style="color: #735c00; font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 400; margin: 0 0 16px 0; letter-spacing: 1px;">${title}</h2>
    <p style="margin: 0 0 24px 0;">
      ${message}
    </p>
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
    <h2 style="color: #735c00; font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 400; margin: 0 0 16px 0; letter-spacing: 1px;">Welcome to Siri Arts & Crafts</h2>
    <p style="margin: 0 0 16px 0;">Hello ${name},</p>
    <p style="margin: 0 0 16px 0;">
      Thank you for joining our community. Every creation at Siri Arts & Crafts is a labor of love — hand-carved, hand-painted, and hand-assembled by master artisans.
    </p>
    <p style="margin: 0 0 24px 0;">
      We invite you to explore our curated heritage collections and use our digital studio to plan your event decor.
    </p>
    <div class="button-wrapper">
      <a href="${frontendUrl}" class="cta-button" target="_blank">Explore Studio</a>
    </div>
    <p style="margin: 24px 0 0 0; color: #7f7663; font-size: 13px;">
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
    <h2 style="color: #ba1a1a; font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 400; margin: 0 0 16px 0; letter-spacing: 1px;">New Login Detected</h2>
    <p style="margin: 0 0 16px 0;">Hello ${name},</p>
    <p style="margin: 0 0 24px 0;">
      We detected a new login to your Siri Arts & Crafts account.
    </p>
    <div style="background-color: #faf9f6; border: 1px solid #d0c5af; padding: 20px; border-radius: 8px; margin: 24px 0; font-size: 13px; line-height: 1.6; color: #2d2b29;">
      <strong style="color: #735c00;">Time:</strong> ${loginTime}<br/>
      <strong style="color: #735c00;">IP Address:</strong> ${ipAddress}<br/>
      <strong style="color: #735c00;">Device Info:</strong> ${ipAddress === '127.0.0.1' ? 'Local System' : 'Remote Client'}
    </div>
    <p style="margin: 24px 0 0 0; color: #ba1a1a; font-size: 13px; font-weight: 600;">
      If this wasn't you, please contact our security team immediately to protect your account.
    </p>
    <p style="margin: 8px 0 0 0; color: #7f7663; font-size: 13px;">
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
