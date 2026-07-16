import { Request, Response } from 'express';
import crypto from 'crypto';
import logger from '../../config/logger';
import WhatsAppWebhookLog from '../../models/WhatsAppWebhookLog';
import { MessageLifecycleService } from '../../domains/notifications/whatsapp/MessageLifecycleService';
import { WhatsAppConsentService } from '../../domains/notifications/whatsapp/WhatsAppConsentService';

export class WhatsAppWebhookController {
  /**
   * GET /api/webhooks/whatsapp/meta
   * Meta Verification Challenge Endpoint
   */
  public static verifyMetaWebhook = (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WA_WEBHOOK_VERIFY_TOKEN) {
      logger.info('[WhatsAppWebhook] Meta verification successful');
      res.status(200).send(challenge);
    } else {
      logger.warn('[WhatsAppWebhook] Meta verification failed. Invalid token.');
      res.sendStatus(403);
    }
  };

  /**
   * POST /api/webhooks/whatsapp/meta
   * Meta Webhook Payload Endpoint
   */
  public static handleMetaWebhook = async (req: Request, res: Response) => {
    try {
      // 1. Signature Verification
      const signature = req.headers['x-hub-signature-256'] as string;
      const payload = req.body;
      const rawBody = (req as any).rawBody || JSON.stringify(payload); // Ensure we have raw body middleware
      let signatureValid = false;

      if (signature && process.env.WA_APP_SECRET) {
        const expectedSignature = `sha256=${crypto
          .createHmac('sha256', process.env.WA_APP_SECRET)
          .update(rawBody)
          .digest('hex')}`;
        signatureValid = crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature),
        );
      } else if (process.env.WA_SANDBOX_MODE === 'true') {
        signatureValid = true; // Bypass in sandbox
      }

      if (!signatureValid) {
        logger.warn('[WhatsAppWebhook] Invalid signature received.');
        // We still return 200 to prevent Meta from retrying, but we log the invalid event
      }

      const body = req.body;

      // Extract entry
      if (body.object === 'whatsapp_business_account' && body.entry && body.entry.length > 0) {
        for (const entry of body.entry) {
          const changes = entry.changes;
          if (!changes || changes.length === 0) continue;

          for (const change of changes) {
            const value = change.value;
            if (!value) continue;

            // Handle statuses (sent, delivered, read, failed)
            if (value.statuses && value.statuses.length > 0) {
              for (const statusObj of value.statuses) {
                const messageId = statusObj.id;
                const status = statusObj.status;
                const timestamp = new Date(parseInt(statusObj.timestamp) * 1000);

                // Check for duplicate (replay protection)
                const existingLog = await WhatsAppWebhookLog.findOne({
                  waMessageId: messageId,
                  status: status,
                });

                const webhookLog = new WhatsAppWebhookLog({
                  provider: 'meta_cloud',
                  eventType: 'message_status',
                  waMessageId: messageId,
                  status: status,
                  timestamp: timestamp,
                  rawPayload: statusObj,
                  signature: signature,
                  signatureValid: signatureValid,
                  isDuplicate: !!existingLog,
                });

                if (existingLog) {
                  await webhookLog.save();
                  logger.debug(
                    `[WhatsAppWebhook] Duplicate event for message ${messageId} status ${status}`,
                  );
                  continue;
                }

                // If event is too old (> 1 hour), log it but be careful about state transitions
                const now = new Date();
                if (now.getTime() - timestamp.getTime() > 60 * 60 * 1000) {
                  logger.warn(
                    `[WhatsAppWebhook] Received delayed event for message ${messageId} (${status})`,
                  );
                }

                try {
                  // Transition the message state
                  // The API Message ID from Meta usually matches `apiMessageId` in our DB
                  const msgLog = await MessageLifecycleService.transitionTo(
                    messageId, // We might need to find by apiMessageId
                    status as any, // 'sent', 'delivered', 'read', 'failed'
                    {
                      metadata: statusObj.pricing ? { pricing: statusObj.pricing } : undefined,
                      reason: statusObj.errors ? JSON.stringify(statusObj.errors) : undefined,
                    },
                  );
                  webhookLog.processedAt = new Date();
                } catch (transitionErr: any) {
                  // If transition fails (e.g., message not found), record error but don't crash
                  webhookLog.processingError = transitionErr.message;
                  logger.error(
                    `[WhatsAppWebhook] Transition error for ${messageId}`,
                    transitionErr,
                  );
                }

                await webhookLog.save();
              }
            }

            // Handle incoming messages (replies, STOP, etc.)
            if (value.messages && value.messages.length > 0) {
              for (const msg of value.messages) {
                // Log incoming message
                await WhatsAppWebhookLog.create({
                  provider: 'meta_cloud',
                  eventType: 'messages',
                  waMessageId: msg.id,
                  timestamp: new Date(parseInt(msg.timestamp) * 1000),
                  rawPayload: msg,
                  signatureValid: signatureValid,
                });

                // Intercept STOP / START keywords
                if (msg.type === 'text' && msg.text?.body) {
                  const phone = msg.from;
                  const text = msg.text.body;
                  await WhatsAppConsentService.processIncomingMessage(phone, text, 'meta_cloud');
                }
              }
            }
          }
        }
      }

      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      logger.error('[WhatsAppWebhook] Error handling webhook', error);
      // Always return 200 to prevent provider from queuing and resending broken payloads
      res.status(200).send('ERROR_HANDLED');
    }
  };

  /**
   * POST /api/webhooks/whatsapp/twilio
   * Twilio Webhook Payload Endpoint
   */
  public static handleTwilioWebhook = async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      const messageId = payload.MessageSid;
      const status = payload.MessageStatus; // e.g., 'sent', 'delivered', 'read', 'failed'

      // Basic Twilio webhook log
      const webhookLog = new WhatsAppWebhookLog({
        provider: 'twilio',
        eventType: 'message_status',
        waMessageId: messageId,
        status: status,
        timestamp: new Date(),
        rawPayload: payload,
      });

      // Handle incoming messages vs status updates
      if (payload.Body && payload.NumMedia === '0' && payload.SmsStatus === 'received') {
        const phone = payload.From;
        const text = payload.Body;
        webhookLog.eventType = 'messages';
        await WhatsAppConsentService.processIncomingMessage(phone, text, 'twilio');
      } else if (status) {
        // Map Twilio status to our lifecycle
        const mappedStatus = status === 'undelivered' ? 'failed' : status;

        try {
          await MessageLifecycleService.transitionTo(messageId, mappedStatus as any, {
            reason: payload.ErrorCode
              ? `Twilio Error: ${payload.ErrorCode} - ${payload.ErrorMessage}`
              : undefined,
          });
          webhookLog.processedAt = new Date();
        } catch (e: any) {
          webhookLog.processingError = e.message;
        }
      }

      await webhookLog.save();
      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      logger.error('[WhatsAppWebhook] Error handling Twilio webhook', error);
      res.status(200).send('ERROR_HANDLED');
    }
  };

  /**
   * POST /api/webhooks/whatsapp/gupshup
   * Gupshup Webhook Payload Endpoint
   */
  public static handleGupshupWebhook = async (req: Request, res: Response) => {
    try {
      const payload = req.body;
      // Gupshup wraps events differently, typically in payload.payload
      const eventType = payload.type; // 'message-event' or 'message'
      const messageId = payload.payload?.id;

      const webhookLog = new WhatsAppWebhookLog({
        provider: 'gupshup',
        eventType: eventType,
        waMessageId: messageId || `gupshup_${Date.now()}`,
        status: payload.payload?.type || 'unknown',
        timestamp: new Date(),
        rawPayload: payload,
      });

      if (eventType === 'message' && payload.payload?.type === 'text') {
        const phone = payload.payload.sender?.phone;
        const text = payload.payload.payload?.text;
        if (phone && text) {
          await WhatsAppConsentService.processIncomingMessage(phone, text, 'gupshup');
        }
      } else if (eventType === 'message-event') {
        const status = payload.payload?.type; // 'enqueued', 'sent', 'delivered', 'read', 'failed'
        let mappedStatus = status;
        if (status === 'enqueued') mappedStatus = 'queued';

        try {
          if (messageId && mappedStatus) {
            await MessageLifecycleService.transitionTo(messageId, mappedStatus as any, {
              reason: payload.payload?.cause,
            });
            webhookLog.processedAt = new Date();
          }
        } catch (e: any) {
          webhookLog.processingError = e.message;
        }
      }

      await webhookLog.save();
      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      logger.error('[WhatsAppWebhook] Error handling Gupshup webhook', error);
      res.status(200).send('ERROR_HANDLED');
    }
  };
}
