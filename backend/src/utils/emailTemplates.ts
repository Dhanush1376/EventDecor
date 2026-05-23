/**
 * Siri Arts & Crafts - Premium Transactional Email Templates
 * Fully responsive, fluid, and tested for high compatibility across all major email clients.
 */

/**
 * Reusable luxury HTML wrapper featuring fluid layout, standard CSS resets,
 * custom serif/sans-serif typography, and brand-aligned visual styling.
 */
export const getLuxuryEmailWrapper = (
  subtitle: string,
  bodyContentHtml: string,
  footerTextHtml: string = 'This is an automated security transmission from Siri Arts & Crafts, Ongole - 523001. If you did not request this verification, please safely disregard this email or contact support.'
): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Siri Arts & Crafts</title>
  <style>
    /* Global client-specific resets */
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    /* Luxury Branding Layout */
    .email-container {
      max-width: 600px;
      margin: 0 auto !important;
      width: 100% !important;
    }
    .wrapper-table {
      background-color: #faf9f6;
      width: 100% !important;
    }
    .main-card {
      background-color: #ffffff;
      border: 1px solid #efeeeb;
      border-radius: 16px;
      box-shadow: 0 15px 40px rgba(115, 92, 0, 0.03);
      padding: 50px 35px;
    }
    .brand-header {
      margin-bottom: 30px;
      text-align: center;
    }
    .gold-star {
      font-size: 26px;
      color: #735c00;
      margin-bottom: 12px;
      font-weight: 300;
      text-align: center;
      line-height: 1;
    }
    .brand-title {
      color: #735c00;
      font-size: 24px;
      font-weight: 300;
      letter-spacing: 5px;
      margin: 0;
      text-transform: uppercase;
      text-align: center;
      font-family: "Didot", "Georgia", "Playfair Display", serif;
    }
    .brand-divider {
      width: 60px;
      height: 1px;
      background-color: #735c00;
      margin: 14px auto 0 auto;
      opacity: 0.25;
    }
    .subtitle-badge {
      display: block;
      color: #7f7663;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-top: 15px;
      margin-bottom: 25px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .body-content {
      color: #2d2b29;
      font-size: 14.5px;
      line-height: 1.65;
      text-align: center;
      font-weight: 300;
    }
    .code-container {
      background-color: #fbfaf8;
      border: 1px solid #d0c5af;
      padding: 28px 20px;
      border-radius: 12px;
      margin: 30px 0;
      text-align: center;
    }
    .code-label {
      display: block;
      color: #7f7663;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 14px;
    }
    .code-display {
      margin: 0;
      letter-spacing: 12px;
      color: #735c00;
      font-size: 40px;
      font-weight: 500;
      font-family: "Courier New", Courier, monospace;
      padding-left: 12px;
      text-align: center;
    }
    .button-wrapper {
      margin: 35px 0;
      text-align: center;
    }
    .cta-button {
      background-color: #735c00;
      color: #ffffff !important;
      padding: 15px 35px;
      text-decoration: none;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
      border-radius: 50px;
      display: inline-block;
      box-shadow: 0 5px 15px rgba(115, 92, 0, 0.2);
    }
    .footer-divider {
      border-top: 1px solid #efeeeb;
      margin-top: 40px;
      padding-top: 25px;
    }
    .footer-text {
      color: #a39c8c;
      font-size: 11px;
      line-height: 1.6;
      margin: 0;
      text-align: center;
    }

    /* Mobile Adaptations */
    @media only screen and (max-width: 600px) {
      .main-card {
        padding: 35px 20px !important;
        border-radius: 12px !important;
      }
      .code-display {
        font-size: 32px !important;
        letter-spacing: 8px !important;
      }
    }
  </style>
</head>
<body>
  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="wrapper-table">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container">
          <tr>
            <td class="main-card">
              <!-- Header -->
              <div class="brand-header">
                <div class="gold-star">✦</div>
                <h1 class="brand-title">Siri Arts</h1>
                <div class="brand-divider"></div>
                <span class="subtitle-badge">${subtitle}</span>
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
  const body = `
    <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Verify your identity to access the digital studio of Siri Arts & Crafts. Use the security key generated below to sign in:
    </p>
    <div class="code-container">
      <span class="code-label">Atelier Gateway Key</span>
      <h1 class="code-display">${otpCode}</h1>
    </div>
    <p style="margin: 20px 0 0 0; color: #7f7663; font-size: 13px; font-weight: 300; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      This verification key is valid for exactly <strong>${expiryMinutes} minutes</strong> and can only be used once. If you did not trigger this request, you can safely ignore this email.
    </p>
  `;
  return getLuxuryEmailWrapper('Security Authentication', body);
};

/**
 * Generates the premium Cash on Delivery Order Verification Email
 */
export const getCodOtpEmailTemplate = (otpCode: string, expiryMinutes: number = 5): string => {
  const body = `
    <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Confirm your Cash on Delivery checkout request at Siri Arts & Crafts. Please enter the verification code below on the order confirmation screen:
    </p>
    <div class="code-container">
      <span class="code-label">Verification Code</span>
      <h1 class="code-display">${otpCode}</h1>
    </div>
    <p style="margin: 20px 0 0 0; color: #7f7663; font-size: 13px; font-weight: 300; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      This code is valid for exactly <strong>${expiryMinutes} minutes</strong>. Please complete the checkout process to secure your premium order layout.
    </p>
  `;
  return getLuxuryEmailWrapper('COD Verification Code', body);
};

/**
 * Generates the premium Team Invitation Email
 */
export const getTeamInviteEmailTemplate = (inviteUrl: string, role: string, permissions: string): string => {
  const body = `
    <h2 style="color: #2d2b29; font-size: 19px; font-weight: 400; margin: 0 0 15px 0; font-family: 'Playfair Display', Georgia, serif; text-align: center;">
      You're Invited to Join the Team
    </h2>
    <p style="margin: 0 0 25px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      An administrator has invited you to join the Siri Arts & Crafts workspace as a <strong>${role.toUpperCase()}</strong> with <strong>"${permissions}"</strong> privilege access.
    </p>
    <div class="button-wrapper">
      <a href="${inviteUrl}" class="cta-button" target="_blank">Activate Portal Account</a>
    </div>
    <p style="margin: 25px 0 0 0; color: #7f7663; font-size: 12.5px; font-weight: 300; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Click the button above to accept this invitation. If you decline or ignore this, the link will eventually expire.
    </p>
  `;
  return getLuxuryEmailWrapper('Staff Workspace Invite', body);
};

/**
 * Generates the premium SMTP Diagnostic Test Email
 */
export const getDiagnosticTestEmailTemplate = (host: string, user: string, timestamp: string): string => {
  const body = `
    <h2 style="color: #735c00; font-size: 18px; font-weight: 400; margin: 0 0 15px 0; font-family: 'Playfair Display', Georgia, serif; text-align: center;">
      SMTP Diagnostic: Success!
    </h2>
    <p style="margin: 0 0 20px 0; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Your transactional mail transport configurations are working correctly. Below are the verified connection details:
    </p>
    <div style="background-color: #fbfaf8; border: 1px solid #e5dfd3; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: left; font-family: monospace; font-size: 12.5px; line-height: 1.5; color: #5c5545;">
      <strong>SMTP Host:</strong> ${host}<br/>
      <strong>SMTP Account:</strong> ${user}<br/>
      <strong>Verified At:</strong> ${timestamp}<br/>
      <strong>Status Code:</strong> TLS_CONNECTED_VERIFIED
    </div>
    <p style="margin: 20px 0 0 0; color: #7f7663; font-size: 12.5px; font-weight: 300; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      You can now use this SMTP configuration to securely deliver passwordless login OTPs, order statements, and campaign broadcasts in production.
    </p>
  `;
  return getLuxuryEmailWrapper('SMTP Connectivity Test', body);
};

/**
 * Generates the premium Order Confirmation Email (Admin & Customer)
 */
export const getOrderConfirmationTemplate = (orderDetails: any): string => {
  const body = `
    <h2 style="color: #735c00; font-size: 18px; font-weight: 400; margin: 0 0 15px 0; font-family: 'Playfair Display', Georgia, serif; text-align: center;">
      Order Confirmed: #${orderDetails.orderId}
    </h2>
    <p style="margin: 0 0 20px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Thank you for choosing Siri Arts & Crafts. Your exquisite heritage decor order is now being processed.
    </p>
    <div style="background-color: #fbfaf8; border: 1px solid #e5dfd3; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: left; font-size: 13px; color: #5c5545;">
      <strong>Order Total:</strong> ₹${orderDetails.totalAmount}<br/>
      <strong>Payment Status:</strong> ${orderDetails.paymentStatus}<br/>
      <strong>Delivery Expected:</strong> ${orderDetails.deliveryDate || 'Within 5-7 business days'}<br/>
    </div>
    <div class="button-wrapper">
      <a href="${orderDetails.orderLink}" class="cta-button" target="_blank">View Order Status</a>
    </div>
    <p style="margin: 20px 0 0 0; color: #7f7663; font-size: 12.5px; font-weight: 300; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      An invoice PDF is attached to this email for your records.
    </p>
  `;
  return getLuxuryEmailWrapper('Order Confirmation', body);
};

/**
 * Generates the premium Admin Notification Email
 */
export const getAdminNotificationTemplate = (title: string, message: string, actionUrl?: string): string => {
  const actionButton = actionUrl 
    ? `<div class="button-wrapper"><a href="${actionUrl}" class="cta-button" target="_blank">View Details</a></div>` 
    : '';

  const body = `
    <h2 style="color: #735c00; font-size: 18px; font-weight: 400; margin: 0 0 15px 0; font-family: 'Playfair Display', Georgia, serif; text-align: center;">
      ${title}
    </h2>
    <p style="margin: 0 0 20px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
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
  const body = `
    <h2 style="color: #735c00; font-size: 19px; font-weight: 400; margin: 0 0 15px 0; font-family: 'Playfair Display', Georgia, serif; text-align: center;">
      Welcome to Siri Arts & Crafts
    </h2>
    <p style="margin: 0 0 15px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Dear ${name},
    </p>
    <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; text-align: left;">
      Thank you for joining our community of art lovers. Every creation at Siri Arts & Crafts is a labor of love — hand-carved, hand-painted, and hand-assembled by master artisans who have inherited their skills across generations.
    </p>
    <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; text-align: left;">
      We invite you to discover our curated heritage collections and use our digital studio to transform your milestone celebrations into living masterpieces.
    </p>
    <div class="button-wrapper">
      <a href="${frontendUrl}" class="cta-button" target="_blank">Explore Studio</a>
    </div>
    <p style="margin: 20px 0 0 0; color: #7f7663; font-size: 12.5px; font-weight: 300; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center;">
      If you have any questions or would like to discuss a bespoke event setup, please contact our concierge service.
    </p>
  `;
  return getLuxuryEmailWrapper('Welcome to Siri Arts', body);
};

/**
 * Generates the premium Suspicious Login Alert Email
 */
export const getSuspiciousLoginEmailTemplate = (name: string, loginTime: string, ipAddress: string): string => {
  const body = `
    <h2 style="color: #8b0000; font-size: 19px; font-weight: 400; margin: 0 0 15px 0; font-family: 'Playfair Display', Georgia, serif; text-align: center;">
      New Login Detected
    </h2>
    <p style="margin: 0 0 15px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      Dear ${name},
    </p>
    <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; text-align: left;">
      We detected a new login session to your Siri Arts & Crafts account. Below are the details of the session:
    </p>
    <div style="background-color: #fbfaf8; border: 1px solid #e5dfd3; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: left; font-size: 13px; color: #5c5545; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <strong style="color: #735c00;">Login Time:</strong> ${loginTime}<br/>
      <strong style="color: #735c00;">Device/IP Address:</strong> ${ipAddress}<br/>
      <strong style="color: #735c00;">Status:</strong> Success (Session Created)
    </div>
    <p style="margin: 20px 0 0 0; color: #8b0000; font-size: 13px; font-weight: 400; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: left; line-height: 1.5;">
      If this was you, no further action is required. If you did not authorize this login, please contact our security team immediately to protect your account.
    </p>
  `;
  return getLuxuryEmailWrapper('Security Alert', body, 'This is a critical security notification. If you did not log in, contact us immediately.');
};

