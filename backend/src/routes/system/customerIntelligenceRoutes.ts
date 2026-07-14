import { Router } from 'express';
import { requireAuth, requireAdmin, requireRole } from '../../middleware/authMiddleware';
import { requestTimeout } from '../../middleware/queryTimeout';
import * as ciController from '../../controllers/system/customerIntelligenceController';

const router = Router();

// Apply auth and staff requirements to all routes in this file
router.use(requireAuth);
router.use(requireAdmin);

// Increase timeout for heavy aggregation queries
const heavyQuery = requestTimeout(25000);

// Overview & Dashboard
router.get('/overview', heavyQuery, ciController.getOverview);
router.get('/executive-summary', heavyQuery, ciController.getExecutiveSummary);

// Customer List, Export & 360
router.get('/customers', heavyQuery, ciController.getCustomerList);
router.get('/customers/export', heavyQuery, ciController.exportCustomers);
router.get('/customers/:id', ciController.getCustomer360);
router.get('/customers/:id/journey', ciController.getCustomerJourney);
router.get('/customers/:id/journey/:sessionId', ciController.getCustomerJourney);
router.get('/customers/:id/timeline', ciController.getCustomerTimeline);
router.get('/customers/:id/milestones', ciController.getCustomerMilestones);
router.get('/customers/:id/communications', ciController.getCustomerCommunications);

// Admin Notes
router.get('/customers/:id/notes', ciController.getCustomerNotes);
router.post('/customers/:id/notes', ciController.addCustomerNote);
router.patch('/customers/:id/notes/:noteId', ciController.updateCustomerNote);
router.delete('/customers/:id/notes/:noteId', ciController.deleteCustomerNote);

// Search & Product Intelligence
router.get('/search', heavyQuery, ciController.getSearchDashboard);
router.get('/search/intents', heavyQuery, ciController.getSearchIntents);
router.get('/products/:id/affinity', ciController.getProductAffinities);

// Funnels & Attribution
router.get('/funnel', heavyQuery, ciController.getFunnel);
router.get('/attribution', heavyQuery, ciController.getAttribution);
router.get('/recommendations', heavyQuery, ciController.getRecommendations);
router.get('/cohorts', heavyQuery, ciController.getCohorts);

export default router;
