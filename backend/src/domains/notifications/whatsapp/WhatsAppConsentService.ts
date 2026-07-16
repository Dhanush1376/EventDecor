import logger from '../../../config/logger';
import User from '../../../models/User';
import WhatsAppWebhookLog from '../../../models/WhatsAppWebhookLog';

/**
 * Service to manage WhatsApp Opt-ins and Opt-outs (Consent)
 * Handles incoming keywords like STOP, UNSUBSCRIBE, START
 */
export class WhatsAppConsentService {
  private static readonly OPT_OUT_KEYWORDS = [
    'stop',
    'unsubscribe',
    'cancel',
    'quit',
    'end',
    'optout',
  ];
  private static readonly OPT_IN_KEYWORDS = ['start', 'subscribe', 'resume', 'unstop', 'optin'];

  /**
   * Processes incoming text message for consent-related keywords.
   * If a match is found, updates the user's notification preferences.
   * @param phone The normalized recipient phone number (with country code)
   * @param text The text body of the incoming message
   * @param provider The provider handling this webhook
   */
  public static async processIncomingMessage(
    phone: string,
    text: string,
    provider: string,
  ): Promise<void> {
    if (!text) return;

    const normalizedText = text.trim().toLowerCase();

    const isOptOut = this.OPT_OUT_KEYWORDS.includes(normalizedText);
    const isOptIn = this.OPT_IN_KEYWORDS.includes(normalizedText);

    if (!isOptOut && !isOptIn) {
      // Not a consent keyword, potentially handle bot routing or support ticketing later
      return;
    }

    // Try to locate user by phone
    const user = await User.findOne({ phone: new RegExp(phone.replace('+', '') + '$') });

    if (isOptOut) {
      logger.info(`[WhatsAppConsent] Opt-out requested by ${phone} via ${provider}`);
      if (user) {
        user.set('notificationPreferences.whatsapp', false);
        // Optionally store the reason or a timestamp in a more detailed consent log
        await user.save();
        logger.info(`[WhatsAppConsent] User ${user._id} WhatsApp preference set to false.`);
      }

      // We also log it universally in the webhook log
      await WhatsAppWebhookLog.create({
        provider,
        eventType: 'consent_opt_out',
        waMessageId: `optout_${Date.now()}_${phone}`,
        status: 'received',
        rawPayload: { phone, text },
        timestamp: new Date(),
      });
    }

    if (isOptIn) {
      logger.info(`[WhatsAppConsent] Opt-in requested by ${phone} via ${provider}`);
      if (user) {
        user.set('notificationPreferences.whatsapp', true);
        await user.save();
        logger.info(`[WhatsAppConsent] User ${user._id} WhatsApp preference set to true.`);
      }

      await WhatsAppWebhookLog.create({
        provider,
        eventType: 'consent_opt_in',
        waMessageId: `optin_${Date.now()}_${phone}`,
        status: 'received',
        rawPayload: { phone, text },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Checks if a user or phone number has explicitly opted out.
   * Used before dispatching messages.
   */
  public static async hasOptedOut(phone: string, userId?: string): Promise<boolean> {
    if (userId) {
      const user = await User.findById(userId).select('notificationPreferences.whatsapp').lean();
      if (user && user.notificationPreferences?.whatsapp === false) {
        return true;
      }
    } else {
      // Fallback: Check if there's any user with this phone who opted out
      const userByPhone = await User.findOne({ phone: new RegExp(phone.replace('+', '') + '$') })
        .select('notificationPreferences.whatsapp')
        .lean();

      if (userByPhone && userByPhone.notificationPreferences?.whatsapp === false) {
        return true;
      }
    }

    return false; // Default to allow (assuming transactional or implied consent if not registered)
  }
}
