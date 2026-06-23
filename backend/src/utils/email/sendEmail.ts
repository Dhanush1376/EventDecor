import { sendDirectEmail } from '../../services/notificationService';
import { getOtpEmailTemplate } from './emailTemplates';
import logger from '../../config/logger';

export const sendEmail = async (options: {
  email: string;
  subject: string;
  message: string;
  html?: string;
}) => {
  try {
    // Proxy legacy email calls to the new Async Queue using the modern template
    sendDirectEmail({
      email: options.email,
      subject: options.subject,
      customHtml: options.html || getOtpEmailTemplate(options.message),
      type: 'security',
      action: 'otp_legacy',
    });
    return;
  } catch (err) {
    logger.error('Failed to proxy sendEmail to queue:', err);
  }
};
