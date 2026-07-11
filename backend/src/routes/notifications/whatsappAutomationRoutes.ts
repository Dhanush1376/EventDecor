import { Router } from 'express';
import { whatsappAutomationController } from '../../controllers/notifications/whatsappAutomationController';
import { requireAuth, requireAdmin } from '../../middleware/authMiddleware';

const router = Router();

// All routes require super admin access
router.use(requireAuth, requireAdmin);

// Dashboard
router.get('/dashboard', whatsappAutomationController.getDashboard);
router.get('/analytics', whatsappAutomationController.getAnalytics);
router.get('/health', whatsappAutomationController.getHealth);

// Automations
router.get('/automations', whatsappAutomationController.getAutomations);
router.get('/automations/:key', whatsappAutomationController.getAutomation);
router.put('/automations/:key', whatsappAutomationController.updateAutomation);
router.patch('/automations/:key/toggle', whatsappAutomationController.toggleAutomation);

// Templates
router.get('/templates', whatsappAutomationController.getTemplates);
router.post('/templates', whatsappAutomationController.createTemplate);
router.get('/templates/:id', whatsappAutomationController.getTemplate);
router.put('/templates/:id', whatsappAutomationController.updateTemplate);
router.delete('/templates/:id', whatsappAutomationController.deleteTemplate);

// Recipients
router.get('/recipients', whatsappAutomationController.getRecipients);
router.post('/recipients', whatsappAutomationController.createRecipient);
router.put('/recipients/:id', whatsappAutomationController.updateRecipient);
router.delete('/recipients/:id', whatsappAutomationController.deleteRecipient);

// Logs & Testing
router.get('/logs', whatsappAutomationController.getLogs);
router.get('/logs/:id', whatsappAutomationController.getLogDetail);
router.post('/test', whatsappAutomationController.sendTest);
router.post('/retry/:logId', whatsappAutomationController.retryMessage);

// Variables
router.get('/variables', whatsappAutomationController.getVariables);

export default router;
