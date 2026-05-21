import { Router } from 'express';
import {
  saveConsentPreference,
  getConsentPreference,
  trackEmailOpen,
  trackEmailClick,
  unsubscribeRecipient,
  createCampaign,
  getCampaigns,
  triggerCampaignSend,
  getTemplates,
  createTemplate,
  updateTemplate,
  getNotificationAnalytics,
} from '../controllers/notificationController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// ==========================================
// PUBLIC USER/VISITOR NOTIFICATION ENDPOINTS
// ==========================================

// Opt-in / GDPR consent updates
router.post('/consent', (req, res, next) => {
  // Allow anonymous visitors to save consent, but check auth if header is present
  requireAuth(req, res, (err) => {
    // Continue regardless of whether they are authenticated
    next();
  });
}, saveConsentPreference);

router.get('/consent/:token', getConsentPreference);

// Public email unsubscribe channel
router.get('/unsubscribe', unsubscribeRecipient);

// ==========================================
// PUBLIC EMAIL OPEN/CLICK TRACKING ENDPOINTS
// ==========================================
router.get('/track/open/:token', trackEmailOpen);
router.get('/track/click/:token', trackEmailClick);

// Diagnostic Email Test Endpoint (Secured behind admin privileges)
// Tests the active email provider (Brevo HTTP API or SMTP fallback)
router.get('/test-smtp-live', requireAuth, requireAdmin, async (req, res) => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const brevoKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser || 'no-reply@siriartsandcrafts.com';

  const envStatus = {
    BREVO_API_KEY: brevoKey ? '✓ Present' : '✗ Missing',
    SMTP_USER: smtpUser ? '✓ Present' : '✗ Missing',
    SMTP_PASS: smtpPass ? '✓ Present' : '✗ Missing',
    SMTP_HOST: smtpHost,
    SMTP_PORT: smtpPort,
    SMTP_FROM_EMAIL: fromEmail,
    activeProvider: brevoKey ? 'Brevo HTTP API (HTTPS port 443)' : (smtpUser && smtpPass) ? 'SMTP' : 'None configured!',
    renderNote: 'Render free tier blocks SMTP ports 25/465/587. Only Brevo HTTP API works on free tier.'
  };

  if (!brevoKey && (!smtpUser || !smtpPass)) {
    return res.status(400).json({
      success: false,
      message: 'No email provider configured! Set BREVO_API_KEY (recommended) or SMTP_USER + SMTP_PASS.',
      envStatus
    });
  }

  try {
    const recipient = req.query.to as string || smtpUser || fromEmail;
    const { getDiagnosticTestEmailTemplate } = require('../utils/emailTemplates');
    const { sendEmail } = require('../services/emailProvider');

    const info = await sendEmail({
      to: recipient,
      subject: '✦ Siri Arts & Crafts Email Diagnostic Test ✦',
      html: getDiagnosticTestEmailTemplate(
        brevoKey ? 'Brevo HTTP API' : smtpHost,
        fromEmail,
        new Date().toLocaleString()
      )
    });

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully via ${envStatus.activeProvider}!`,
      messageId: info.messageId,
      envStatus,
      details: { recipient }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Email delivery failed!',
      errorMessage: err.message,
      envStatus
    });
  }
});

// ==========================================
// PROTECTED ADMIN NOTIFICATION CAMPAIGNS & ANALYTICS
// ==========================================
router.post('/admin/campaigns', requireAuth, requireAdmin, createCampaign);
router.get('/admin/campaigns', requireAuth, requireAdmin, getCampaigns);
router.post('/admin/campaigns/:id/send', requireAuth, requireAdmin, triggerCampaignSend);

router.get('/admin/templates', requireAuth, requireAdmin, getTemplates);
router.post('/admin/templates', requireAuth, requireAdmin, createTemplate);
router.patch('/admin/templates/:id', requireAuth, requireAdmin, updateTemplate);

router.get('/admin/analytics', requireAuth, requireAdmin, getNotificationAnalytics);

// ==========================================
// REAL-TIME ADMIN IN-APP NOTIFICATIONS
// ==========================================
import {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../controllers/adminNotificationController';

router.get('/admin/alerts', requireAuth, requireAdmin, getAdminNotifications);
router.patch('/admin/alerts/mark-all-read', requireAuth, requireAdmin, markAllNotificationsRead);
router.patch('/admin/alerts/:id/read', requireAuth, requireAdmin, markNotificationRead);
router.delete('/admin/alerts/:id', requireAuth, requireAdmin, deleteNotification);

export default router;
