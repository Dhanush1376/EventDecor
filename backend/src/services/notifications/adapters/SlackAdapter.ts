import logger from '../../../config/logger';

export class SlackAdapter {
  public static async send(recipient: any, payload: any, priority: string) {
    try {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) {
        logger.debug('[SLACK ADAPTER] Webhook URL not configured. Skipping dispatch.');
        return { success: false, reason: 'unconfigured' };
      }

      logger.info(`[SLACK ADAPTER] Dispatching message...`);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: payload.subject,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${priority === 'critical' ? '🚨' : 'ℹ️'} ${payload.subject}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: payload.plainText || payload.subject,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack API returned ${response.status}`);
      }

      return { success: true, timestamp: new Date() };
    } catch (error) {
      logger.error(`[SLACK ADAPTER] Failed to dispatch to Slack:`, error);
      throw error;
    }
  }
}
