import { Router } from 'express';
import { whatsappAutomationController } from '../../controllers/notifications/whatsappAutomationController';
import { WhatsAppCampaignController } from '../../controllers/notifications/whatsappCampaignController';
import { requireAuth } from '../../middleware/authMiddleware';
import { requireWhatsAppPermission } from '../../middleware/whatsappRbacMiddleware';

const router = Router();

// All WhatsApp routes require basic authentication first
router.use(requireAuth);

// Dashboard & Analytics
router.get(
  '/dashboard',
  requireWhatsAppPermission('dashboard:read'),
  whatsappAutomationController.getDashboard,
);
router.get(
  '/analytics',
  requireWhatsAppPermission('dashboard:read'),
  whatsappAutomationController.getAnalytics,
);
router.get(
  '/executive-analytics',
  requireWhatsAppPermission('dashboard:read'),
  whatsappAutomationController.getExecutiveAnalytics,
);
router.get(
  '/analytics/funnel/:id',
  requireWhatsAppPermission('dashboard:read'),
  whatsappAutomationController.getWorkflowFunnel,
);
router.get(
  '/analytics/experiment/:automationId/:experimentNodeId',
  requireWhatsAppPermission('dashboard:read'),
  whatsappAutomationController.getExperimentAnalytics,
);

// Production Certification
router.post(
  '/assessment/run',
  requireWhatsAppPermission('dashboard:read'),
  whatsappAutomationController.runAssessment,
);
router.get(
  '/assessment/history',
  requireWhatsAppPermission('dashboard:read'),
  whatsappAutomationController.getAssessmentHistory,
);

router.get(
  '/health',
  requireWhatsAppPermission('dashboard:read'),
  whatsappAutomationController.getHealth,
);
router.get(
  '/queues',
  requireWhatsAppPermission('dashboard:read'),
  whatsappAutomationController.getQueueMetrics,
);

// Provider Settings & Routing
router.get(
  '/providers',
  requireWhatsAppPermission('providers:read'),
  whatsappAutomationController.getProviderConfigs,
);
router.put(
  '/providers/:providerName',
  requireWhatsAppPermission('providers:write', 'Update Provider Config'),
  whatsappAutomationController.updateProviderConfig,
);
router.post(
  '/providers/:providerName/force-open',
  requireWhatsAppPermission('providers:write', 'Force Open Provider Circuit'),
  whatsappAutomationController.forceCircuitOpen,
);
router.get(
  '/routing-rules',
  requireWhatsAppPermission('providers:read'),
  whatsappAutomationController.getRoutingRules,
);
router.put(
  '/routing-rules/:category',
  requireWhatsAppPermission('providers:write', 'Update Routing Rule'),
  whatsappAutomationController.updateRoutingRule,
);

// Automations
router.get(
  '/automations',
  requireWhatsAppPermission('automations:read'),
  whatsappAutomationController.getAutomations,
);
router.get(
  '/automations/:key',
  requireWhatsAppPermission('automations:read'),
  whatsappAutomationController.getAutomation,
);
router.put(
  '/automations/:key',
  requireWhatsAppPermission('automations:write', 'Update Automation Flow'),
  whatsappAutomationController.updateAutomation,
);
router.patch(
  '/automations/:key/toggle',
  requireWhatsAppPermission('automations:execute', 'Toggle Automation State'),
  whatsappAutomationController.toggleAutomation,
);

// Templates
router.get(
  '/templates',
  requireWhatsAppPermission('templates:read'),
  whatsappAutomationController.getTemplates,
);
router.post(
  '/templates',
  requireWhatsAppPermission('templates:write', 'Create Template'),
  whatsappAutomationController.createTemplate,
);
router.get(
  '/templates/:id',
  requireWhatsAppPermission('templates:read'),
  whatsappAutomationController.getTemplate,
);
router.put(
  '/templates/:id',
  requireWhatsAppPermission('templates:write', 'Update Template'),
  whatsappAutomationController.updateTemplate,
);
router.delete(
  '/templates/:id',
  requireWhatsAppPermission('templates:write', 'Delete Template'),
  whatsappAutomationController.deleteTemplate,
);

// Recipients
router.get(
  '/recipients',
  requireWhatsAppPermission('recipients:read'),
  whatsappAutomationController.getRecipients,
);
router.post(
  '/recipients',
  requireWhatsAppPermission('recipients:write', 'Create Recipient'),
  whatsappAutomationController.createRecipient,
);
router.put(
  '/recipients/:id',
  requireWhatsAppPermission('recipients:write', 'Update Recipient'),
  whatsappAutomationController.updateRecipient,
);
router.delete(
  '/recipients/:id',
  requireWhatsAppPermission('recipients:write', 'Delete Recipient'),
  whatsappAutomationController.deleteRecipient,
);

// Logs & Testing
router.get('/logs', requireWhatsAppPermission('logs:read'), whatsappAutomationController.getLogs);
router.get(
  '/logs/:id',
  requireWhatsAppPermission('logs:read'),
  whatsappAutomationController.getLogDetail,
);
router.post(
  '/test',
  requireWhatsAppPermission('tools:execute', 'Send Test Message'),
  whatsappAutomationController.sendTest,
);
router.post(
  '/dry-run',
  requireWhatsAppPermission('tools:execute', 'Run Dry Run'),
  whatsappAutomationController.dryRun,
);
router.post(
  '/retry/:logId',
  requireWhatsAppPermission('tools:execute', 'Retry Message'),
  whatsappAutomationController.retryMessage,
);

// Variables
router.get(
  '/variables',
  requireWhatsAppPermission('templates:read'),
  whatsappAutomationController.getVariables,
);

// Campaigns
router.get(
  '/campaigns',
  requireWhatsAppPermission('campaigns:read'),
  WhatsAppCampaignController.getCampaigns,
);
router.post(
  '/campaigns',
  requireWhatsAppPermission('campaigns:write', 'Create Campaign Draft'),
  WhatsAppCampaignController.createCampaign,
);
router.put(
  '/campaigns/:id',
  requireWhatsAppPermission('campaigns:write', 'Update Campaign'),
  WhatsAppCampaignController.updateCampaign,
);
router.delete(
  '/campaigns/:id',
  requireWhatsAppPermission('campaigns:write', 'Delete Campaign'),
  WhatsAppCampaignController.deleteCampaign,
);
router.post(
  '/campaigns/:id/dispatch',
  requireWhatsAppPermission('campaigns:execute', 'Dispatch Campaign Blast'),
  WhatsAppCampaignController.dispatchCampaign,
);
router.post(
  '/campaigns/:id/pause',
  requireWhatsAppPermission('campaigns:execute', 'Pause Campaign'),
  WhatsAppCampaignController.pauseCampaign,
);
router.get(
  '/campaigns/:id/validate',
  requireWhatsAppPermission('campaigns:read'),
  WhatsAppCampaignController.validateCampaign,
);

// Snapshots & Audit Trails
router.get(
  '/snapshots',
  requireWhatsAppPermission('audit:read'),
  whatsappAutomationController.getSnapshots,
);
router.post(
  '/snapshots',
  requireWhatsAppPermission('audit:write', 'Create Configuration Snapshot'),
  whatsappAutomationController.createSnapshot,
);
router.post(
  '/snapshots/:snapshotId/rollback',
  requireWhatsAppPermission('audit:execute', 'Rollback System Configuration'),
  whatsappAutomationController.rollbackSnapshot,
);
router.get(
  '/audit-logs',
  requireWhatsAppPermission('audit:read'),
  whatsappAutomationController.getAuditLogs,
);

export default router;
