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
