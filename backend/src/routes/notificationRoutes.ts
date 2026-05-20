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

// Diagnostic SMTP Test Endpoint (Secured behind admin privileges)
router.get('/test-smtp-live', requireAuth, requireAdmin, async (req, res) => {
  const nodemailer = require('nodemailer');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (!smtpUser || !smtpPass) {
    return res.status(400).json({
      success: false,
      message: 'SMTP credentials missing from environment variables on this server!',
      details: {
        SMTP_USER: smtpUser ? 'Present' : 'Missing',
        SMTP_PASS: smtpPass ? 'Present' : 'Missing',
        SMTP_HOST: smtpHost,
        SMTP_PORT: smtpPort
      }
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        // High compatibility fallback for container hosts rejecting self-signed/untrusted certs
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
    });

    // 1. Verify connection
    await transporter.verify();

    // 2. Try sending a quick test email
    const recipient = req.query.to as string || smtpUser;
    const { getDiagnosticTestEmailTemplate } = require('../utils/emailTemplates');
    
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Siri Arts Diagnostic" <${smtpUser}>`,
      to: recipient,
      subject: '✦ Siri Arts Studio SMTP Diagnostic Test ✦',
      html: getDiagnosticTestEmailTemplate(smtpHost, smtpUser, new Date().toLocaleString())
    });

    return res.status(200).json({
      success: true,
      message: 'SMTP connection verified and test email sent successfully!',
      messageId: info.messageId,
      envelope: info.envelope,
      details: {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        recipient: recipient
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'SMTP Verification Failed!',
      errorMessage: err.message,
      errorStack: err.stack,
      details: {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
      }
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

export default router;
