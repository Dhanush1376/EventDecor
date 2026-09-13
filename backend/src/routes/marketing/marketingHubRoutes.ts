import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';
import { getMarketingOverview } from '../../controllers/marketing/campaignHubController';
import {
  getSegments,
  createSegment,
  updateSegment,
  deleteSegment,
} from '../../controllers/marketing/segmentController';
import {
  getAutomations,
  getAutomationById,
  updateAutomation,
  getAutomationEnrollments,
  triggerManualScan,
} from '../../controllers/marketing/automationController';
import {
  getMarketingCustomers,
  getCustomerMarketingJourney,
} from '../../controllers/marketing/customerMarketingController';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
} from '../../controllers/notifications/notificationController';

const router = Router();

// Enforce admin protection across all marketing hub management APIs
router.use(requireAuth, requireAdmin);

// ==========================================
// 1. MARKETING OVERVIEW & DASHBOARD
// ==========================================
router.get('/overview', getMarketingOverview);

// ==========================================
// 3. SEGMENTS & AUDIENCES
// ==========================================
router.get('/segments', getSegments);
router.post('/segments', createSegment);
router.patch('/segments/:id', updateSegment);
router.delete('/segments/:id', deleteSegment);

// ==========================================
// 4. LIFECYCLE AUTOMATIONS
// ==========================================
router.get('/automations', getAutomations);
router.post('/automations/scan-now', triggerManualScan);
router.get('/automations/:id', getAutomationById);
router.patch('/automations/:id', updateAutomation);
router.get('/automations/:id/enrollments', getAutomationEnrollments);

// ==========================================
// 5. CUSTOMER MARKETING DIRECTORY & JOURNEY
// ==========================================
router.get('/customers', getMarketingCustomers);
router.get('/customers/:id/activity', getCustomerMarketingJourney);

// ==========================================
// 6. EMAIL TEMPLATES
// ==========================================
router.get('/templates', getTemplates);
router.post('/templates', createTemplate);
router.patch('/templates/:id', updateTemplate);

export default router;
