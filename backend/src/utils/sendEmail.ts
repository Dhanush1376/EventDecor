import { sendDirectEmail } from '../services/notificationService';
import logger from '../config/logger';

export const sendEmail = async (options: { email: string, subject: string, message: string, html?: string }) => {
  try {
    // Proxy legacy email calls to the new Async Queue
    sendDirectEmail({
      email: options.email,
      subject: options.subject,
      customHtml: options.html || `
        <div style="background-color: #faf9f6; font-family: 'Playfair Display', 'Didot', 'Georgia', serif; max-width: 600px; margin: 20px auto; padding: 50px 30px; border: 1px solid #efeeeb; border-radius: 16px; color: #2d2b29; box-shadow: 0 15px 40px rgba(115, 92, 0, 0.04); text-align: center; box-sizing: border-box;">
          <div style="margin-bottom: 25px; text-align: center;">
            <div style="font-size: 28px; color: #735c00; margin-bottom: 12px; font-weight: 300; text-align: center;">✦</div>
            <h1 style="color: #735c00; font-size: 26px; font-weight: 300; letter-spacing: 5px; margin: 0; text-transform: uppercase; text-align: center;">Siri Arts</h1>
            <div style="width: 60px; height: 1px; background-color: #735c00; margin: 12px auto 0 auto; opacity: 0.25;"></div>
          </div>
          <span style="display: block; color: #7f7663; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 30px; font-family: 'Inter', sans-serif;">Atelier Gateway Key</span>
          
          <div style="background-color: #fbfaf8; border: 1px solid #d0c5af; padding: 25px 20px; border-radius: 12px; margin: 25px 0;">
            <span style="display: block; color: #7f7663; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; font-family: 'Inter', sans-serif;">Security Code</span>
            <h1 style="margin: 0; letter-spacing: 12px; color: #735c00; font-size: 42px; font-weight: 500; font-family: 'Courier New', monospace; padding-left: 12px;">${options.message}</h1>
          </div>
          
          <p style="color: #7f7663; font-size: 13px; font-weight: 300; font-family: 'Inter', sans-serif; margin-top: 20px; margin-bottom: 0;">
            This secure code is valid for exactly <strong>5 minutes</strong>.
          </p>
          
          <div style="border-top: 1px solid #efeeeb; margin-top: 40px; padding-top: 25px;">
            <p style="color: #a39c8c; font-size: 11px; line-height: 1.6; font-family: 'Inter', sans-serif; margin: 0;">
              This is an automated security transmission from Siri Arts & Crafts, Ongole - 523001. If you did not request this verification, please safely disregard this email or contact support.
            </p>
          </div>
        </div>
      `,
      type: 'security',
      action: 'otp_legacy'
    });
    // Function instantly returns (Async Queue takes over)
    return;
  } catch (err) {
    logger.error('Failed to proxy sendEmail to queue:', err);
  }
};

