import express from 'express';
import { WhatsAppWebhookController } from '../../controllers/notifications/whatsappWebhookController';

const router = express.Router();

/**
 * Webhooks require raw body for signature verification.
 * In a real express setup, you might use express.json({ verify: (req, res, buf) => { req.rawBody = buf } })
 * We assume the middleware is configured correctly in app.ts, but we map the routes here.
 */

// Meta WhatsApp Cloud API webhooks
router.get('/whatsapp/meta', WhatsAppWebhookController.verifyMetaWebhook);
router.post('/whatsapp/meta', WhatsAppWebhookController.handleMetaWebhook);

// Twilio and Gupshup webhooks
router.post('/whatsapp/twilio', WhatsAppWebhookController.handleTwilioWebhook);
router.post('/whatsapp/gupshup', WhatsAppWebhookController.handleGupshupWebhook);

export default router;
