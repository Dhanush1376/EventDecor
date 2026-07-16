import { Request, Response } from 'express';
import WhatsAppAutomation from '../../models/WhatsAppAutomation';
import WhatsAppTemplate from '../../models/WhatsAppTemplate';
import WhatsAppRecipient from '../../models/WhatsAppRecipient';
import WhatsAppMessageLog from '../../models/WhatsAppMessageLog';
import WhatsAppDashboardCache from '../../models/WhatsAppDashboardCache';
import WhatsAppProviderConfig from '../../models/WhatsAppProviderConfig';
import WhatsAppRoutingRule from '../../models/WhatsAppRoutingRule';
import { WhatsAppTemplateEngine } from '../../domains/notifications/whatsapp/WhatsAppTemplateEngine';
import { WhatsAppRetryService } from '../../domains/notifications/whatsapp/WhatsAppRetryService';
import { WhatsAppProviderFactory } from '../../domains/notifications/whatsapp/providers/WhatsAppProviderFactory';

export const whatsappAutomationController = {
  // --- Dashboard & Analytics ---
  getDashboard: async (req: Request, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      let dashboard = await WhatsAppDashboardCache.findOne({ date: today });

      if (!dashboard) {
        dashboard = new WhatsAppDashboardCache({ date: today });
      }

      res.status(200).json({ success: true, data: dashboard });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAnalytics: async (req: Request, res: Response) => {
    try {
      const days = Math.min(Math.max(parseInt(req.query.days as string) || 7, 1), 90);
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      since.setUTCDate(since.getUTCDate() - (days - 1));

      const DELIVERED = ['sent', 'delivered', 'read'];
      const PENDING = ['queued', 'dispatched'];

      const logs = await WhatsAppMessageLog.find({ createdAt: { $gte: since } }).lean();

      // Aggregate Daily Trends + Costs
      const dailyMap: Record<string, { sent: number; failed: number; spend: number }> = {};
      let totalSpend = 0;
      let totalCount = 0;

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
        dailyMap[label] = { sent: 0, failed: 0, spend: 0 };
      }

      logs.forEach((log: any) => {
        const label = new Date(log.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });

        if (dailyMap[label]) {
          if (DELIVERED.includes(log.deliveryStatus)) {
            dailyMap[label].sent += 1;
            totalCount += 1;
            const cost = log.costAmount || 0;
            dailyMap[label].spend += cost;
            totalSpend += cost;
          } else if (log.deliveryStatus === 'failed') {
            dailyMap[label].failed += 1;
          }
        }
      });

      const dailyTrends = Object.keys(dailyMap).map((date) => ({
        date,
        ...dailyMap[date],
        spend: Number(dailyMap[date].spend.toFixed(2)),
      }));

      // Status distribution across the same window, bucketed for readability.
      const statusAgg = await WhatsAppMessageLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } },
      ]);

      let sentCount = 0;
      let failedCount = 0;
      let pendingCount = 0;
      for (const s of statusAgg as Array<{ _id: string; count: number }>) {
        if (DELIVERED.includes(s._id)) sentCount += s.count;
        else if (s._id === 'failed') failedCount += s.count;
        else if (PENDING.includes(s._id)) pendingCount += s.count;
      }

      const statusDistribution = [
        { name: 'Sent', value: sentCount },
        { name: 'Failed', value: failedCount },
        { name: 'Pending', value: pendingCount },
      ];

      res.status(200).json({
        success: true,
        data: {
          dailyTrends,
          statusDistribution,
          cost: {
            totalSpend: Number(totalSpend.toFixed(2)),
            avgCostPerMsg: totalCount > 0 ? Number((totalSpend / totalCount).toFixed(4)) : 0,
            monthlyBudget: 5000,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getExecutiveAnalytics: async (req: Request, res: Response) => {
    try {
      const {
        WorkflowMetricsEngine,
      } = require('../../domains/notifications/whatsapp/WorkflowMetricsEngine');
      const metrics = await WorkflowMetricsEngine.getExecutiveOverview();
      res.status(200).json({ success: true, data: metrics });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getWorkflowFunnel: async (req: Request, res: Response) => {
    try {
      const {
        WorkflowMetricsEngine,
      } = require('../../domains/notifications/whatsapp/WorkflowMetricsEngine');
      const funnel = await WorkflowMetricsEngine.getFunnelAnalytics(req.params.id);
      res.status(200).json({ success: true, data: funnel });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getExperimentAnalytics: async (req: Request, res: Response) => {
    try {
      const { automationId, experimentNodeId } = req.params;
      const {
        WorkflowMetricsEngine,
      } = require('../../domains/notifications/whatsapp/WorkflowMetricsEngine');
      const metrics = await WorkflowMetricsEngine.getExperimentAnalytics(
        automationId,
        experimentNodeId,
      );
      res.status(200).json({ success: true, data: metrics });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  runAssessment: async (req: Request, res: Response) => {
    try {
      const {
        ProductionCertificationEngine,
      } = require('../../domains/notifications/whatsapp/ProductionCertificationEngine');
      const engine = new ProductionCertificationEngine();
      const assessment = await engine.generateFullAssessment();

      // CI/CD mode support
      if (req.query.ci === 'true' && !assessment.isPassed) {
        res
          .status(400)
          .json({ success: false, message: 'Production Certification Failed', data: assessment });
        return;
      }

      res.status(200).json({ success: true, data: assessment });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAssessmentHistory: async (req: Request, res: Response) => {
    try {
      const WhatsAppReadinessAssessment =
        require('../../models/WhatsAppReadinessAssessment').default;
      const history = await WhatsAppReadinessAssessment.find().sort({ executedAt: -1 }).limit(10);
      res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getHealth: async (req: Request, res: Response) => {
    try {
      const provider = await WhatsAppProviderFactory.getAvailableProvider();
      const health = await provider.checkHealth();
      res.status(200).json({ success: true, data: { provider: provider.name, ...health } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getQueueMetrics: async (req: Request, res: Response) => {
    try {
      const {
        whatsappDispatchQueue,
        whatsappRetryQueue,
        whatsappMediaQueue,
      } = require('../../jobs/whatsappQueues');

      const dispatchCounts = await whatsappDispatchQueue.getJobCounts();
      const retryCounts = await whatsappRetryQueue.getJobCounts();
      const mediaCounts = await whatsappMediaQueue.getJobCounts();

      res.status(200).json({
        success: true,
        data: {
          dispatch: dispatchCounts,
          retry: retryCounts,
          media: mediaCounts,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // --- Provider Settings & Routing ---
  getProviderConfigs: async (req: Request, res: Response) => {
    try {
      const configs = await WhatsAppProviderConfig.find().sort({ priority: 1 });
      res.status(200).json({ success: true, data: configs });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateProviderConfig: async (req: Request, res: Response) => {
    try {
      const { providerName } = req.params;
      const config = await WhatsAppProviderConfig.findOneAndUpdate({ providerName }, req.body, {
        new: true,
        upsert: true,
      });
      res.status(200).json({ success: true, data: config });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getRoutingRules: async (req: Request, res: Response) => {
    try {
      const rules = await WhatsAppRoutingRule.find().sort({ priority: -1 });
      res.status(200).json({ success: true, data: rules });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateRoutingRule: async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const rule = await WhatsAppRoutingRule.findOneAndUpdate({ category }, req.body, {
        new: true,
        upsert: true,
      });
      res.status(200).json({ success: true, data: rule });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  forceCircuitOpen: async (req: Request, res: Response) => {
    try {
      const {
        ProviderCircuitBreaker,
      } = require('../../domains/notifications/whatsapp/providers/ProviderCircuitBreaker');
      const { providerName } = req.params;
      ProviderCircuitBreaker.forceOpen(providerName);
      res.status(200).json({ success: true, message: `Circuit for ${providerName} forced OPEN.` });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // --- Automations ---
  getAutomations: async (req: Request, res: Response) => {
    try {
      const automations = await WhatsAppAutomation.find().sort({ category: 1, displayName: 1 });
      res.status(200).json({ success: true, data: automations });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAutomation: async (req: Request, res: Response) => {
    try {
      const automation = await WhatsAppAutomation.findOne({ automationKey: req.params.key })
        .populate('activeTemplateId')
        .populate('recipientRoles.recipientId');
      if (!automation)
        return res.status(404).json({ success: false, message: 'Automation not found' });
      res.status(200).json({ success: true, data: automation });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateAutomation: async (req: Request, res: Response) => {
    try {
      const previous = await WhatsAppAutomation.findOne({ automationKey: req.params.key }).lean();
      const automation = await WhatsAppAutomation.findOneAndUpdate(
        { automationKey: req.params.key },
        req.body,
        { new: true, runValidators: true },
      );
      if (automation && previous) {
        const {
          WhatsAppAuditService,
        } = require('../../domains/notifications/whatsapp/WhatsAppAuditService');
        await WhatsAppAuditService.logChange(
          'automation',
          automation._id.toString(),
          'update',
          previous,
          automation.toObject(),
          req,
          'Updated automation config',
        );
      }
      res.status(200).json({ success: true, data: automation });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  toggleAutomation: async (req: Request, res: Response) => {
    try {
      const previous = await WhatsAppAutomation.findOne({ automationKey: req.params.key }).lean();
      const automation = await WhatsAppAutomation.findOneAndUpdate(
        { automationKey: req.params.key },
        { enabled: req.body.enabled },
        { new: true },
      );
      if (automation && previous) {
        const {
          WhatsAppAuditService,
        } = require('../../domains/notifications/whatsapp/WhatsAppAuditService');
        await WhatsAppAuditService.logChange(
          'automation',
          automation._id.toString(),
          'toggle',
          previous,
          automation.toObject(),
          req,
          `Toggled automation to ${req.body.enabled}`,
        );
      }
      res.status(200).json({ success: true, data: automation });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // --- Templates ---
  getTemplates: async (req: Request, res: Response) => {
    try {
      const templates = await WhatsAppTemplate.find(req.query).sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: templates });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getTemplate: async (req: Request, res: Response) => {
    try {
      const template = await WhatsAppTemplate.findById(req.params.id);
      if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
      res.status(200).json({ success: true, data: template });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  createTemplate: async (req: Request, res: Response) => {
    try {
      const template = await WhatsAppTemplate.create({
        ...req.body,
        createdBy: (req as any).user?._id,
      });
      const {
        WhatsAppAuditService,
      } = require('../../domains/notifications/whatsapp/WhatsAppAuditService');
      await WhatsAppAuditService.logChange(
        'template',
        template._id.toString(),
        'create',
        null,
        template.toObject(),
        req,
        'Created new template',
      );
      res.status(201).json({ success: true, data: template });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  updateTemplate: async (req: Request, res: Response) => {
    try {
      const previous = await WhatsAppTemplate.findById(req.params.id).lean();
      const template = await WhatsAppTemplate.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (template && previous) {
        const {
          WhatsAppAuditService,
        } = require('../../domains/notifications/whatsapp/WhatsAppAuditService');
        await WhatsAppAuditService.logChange(
          'template',
          template._id.toString(),
          'update',
          previous,
          template.toObject(),
          req,
          'Updated template',
        );
      }
      res.status(200).json({ success: true, data: template });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  deleteTemplate: async (req: Request, res: Response) => {
    try {
      const {
        TemplateDependencyAnalyzer,
      } = require('../../domains/notifications/whatsapp/TemplateDependencyAnalyzer');
      const { safe, reason } = await TemplateDependencyAnalyzer.canDelete(req.params.id);

      if (!safe) {
        return res.status(409).json({ success: false, message: reason });
      }

      const previous = await WhatsAppTemplate.findById(req.params.id).lean();
      if (previous) {
        const {
          WhatsAppAuditService,
        } = require('../../domains/notifications/whatsapp/WhatsAppAuditService');
        await WhatsAppAuditService.logChange(
          'template',
          req.params.id,
          'delete',
          previous,
          null,
          req,
          'Deleted template',
        );
      }
      await WhatsAppTemplate.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: 'Template deleted' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // --- Recipients ---
  getRecipients: async (req: Request, res: Response) => {
    try {
      const recipients = await WhatsAppRecipient.find().sort({ role: 1, name: 1 });
      res.status(200).json({ success: true, data: recipients });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  createRecipient: async (req: Request, res: Response) => {
    try {
      const recipient = await WhatsAppRecipient.create(req.body);
      const {
        WhatsAppAuditService,
      } = require('../../domains/notifications/whatsapp/WhatsAppAuditService');
      await WhatsAppAuditService.logChange(
        'recipient',
        recipient._id.toString(),
        'create',
        null,
        recipient.toObject(),
        req,
        'Created new recipient',
      );
      res.status(201).json({ success: true, data: recipient });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  updateRecipient: async (req: Request, res: Response) => {
    try {
      const previous = await WhatsAppRecipient.findById(req.params.id).lean();
      const recipient = await WhatsAppRecipient.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (recipient && previous) {
        const {
          WhatsAppAuditService,
        } = require('../../domains/notifications/whatsapp/WhatsAppAuditService');
        await WhatsAppAuditService.logChange(
          'recipient',
          recipient._id.toString(),
          'update',
          previous,
          recipient.toObject(),
          req,
          'Updated recipient',
        );
      }
      res.status(200).json({ success: true, data: recipient });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  deleteRecipient: async (req: Request, res: Response) => {
    try {
      const {
        RecipientDependencyAnalyzer,
      } = require('../../domains/notifications/whatsapp/RecipientDependencyAnalyzer');
      const { safe, reason } = await RecipientDependencyAnalyzer.canDelete(req.params.id);

      if (!safe) {
        return res.status(409).json({ success: false, message: reason });
      }

      const previous = await WhatsAppRecipient.findById(req.params.id).lean();
      if (previous) {
        const {
          WhatsAppAuditService,
        } = require('../../domains/notifications/whatsapp/WhatsAppAuditService');
        await WhatsAppAuditService.logChange(
          'recipient',
          req.params.id,
          'delete',
          previous,
          null,
          req,
          'Deleted recipient',
        );
      }
      await WhatsAppRecipient.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: 'Recipient deleted' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // --- Logs & Testing ---
  getLogs: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (req.query.status) filter.deliveryStatus = req.query.status;
      if (req.query.automation) filter.automationKey = req.query.automation;

      const logs = await WhatsAppMessageLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await WhatsAppMessageLog.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: logs,
        pagination: { total, page, pages: Math.ceil(total / limit) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getLogDetail: async (req: Request, res: Response) => {
    try {
      const log = await WhatsAppMessageLog.findById(req.params.id);
      res.status(200).json({ success: true, data: log });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  sendTest: async (req: Request, res: Response) => {
    try {
      const phone = String(req.body.phone || '').trim();
      const message = String(req.body.message || '').trim();

      if (!phone || !/^\+?\d{8,15}$/.test(phone.replace(/[\s-]/g, ''))) {
        return res
          .status(400)
          .json({ success: false, message: 'A valid recipient phone number is required' });
      }
      if (!message) {
        return res.status(400).json({ success: false, message: 'Message text is required' });
      }

      const provider = await WhatsAppProviderFactory.getAvailableProvider();
      const result = await provider.sendTextMessage(phone, message);

      if (!result.success) {
        return res
          .status(502)
          .json({ success: false, message: 'Provider rejected the test message', data: result });
      }

      res.status(200).json({
        success: true,
        message: 'Test message sent',
        data: { provider: provider.name, messageId: result.messageId },
      });
    } catch (error: any) {
      // Surface the real provider/configuration error instead of a fake success.
      res.status(502).json({
        success: false,
        message: error.message || 'Failed to send test message',
      });
    }
  },

  dryRun: async (req: Request, res: Response) => {
    try {
      const { automationKey, payload } = req.body;
      if (!automationKey || !payload) {
        return res
          .status(400)
          .json({ success: false, message: 'automationKey and payload are required' });
      }
      const {
        WhatsAppAutomationEngine,
      } = require('../../domains/notifications/whatsapp/WhatsAppAutomationEngine');
      const results = await WhatsAppAutomationEngine.dryRun(automationKey, payload);
      res.status(200).json({ success: true, data: results });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  retryMessage: async (req: Request, res: Response) => {
    try {
      await WhatsAppRetryService.retryMessage(String(req.params.logId));
      res.status(200).json({ success: true, message: 'Retry scheduled' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  getVariables: async (req: Request, res: Response) => {
    try {
      const variables = WhatsAppTemplateEngine.getAvailableVariables();
      res.status(200).json({ success: true, data: variables });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getSnapshots: async (req: Request, res: Response) => {
    try {
      const WhatsAppConfigSnapshot = require('../../models/WhatsAppConfigSnapshot').default;
      const snapshots = await WhatsAppConfigSnapshot.find({})
        .select('-configData') // Don't send massive JSON payload for list view
        .sort({ createdAt: -1 })
        .populate('createdBy', 'firstName lastName email');
      res.status(200).json({ success: true, data: snapshots });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  createSnapshot: async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      const {
        WhatsAppVersionService,
      } = require('../../domains/notifications/whatsapp/WhatsAppVersionService');
      const snapshot = await WhatsAppVersionService.createSnapshot(
        name || `Manual Snapshot - ${new Date().toISOString()}`,
        description || '',
        (req.user as any)?._id,
      );
      res.status(201).json({ success: true, data: snapshot });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  rollbackSnapshot: async (req: Request, res: Response) => {
    try {
      const { snapshotId } = req.params;
      const {
        WhatsAppVersionService,
      } = require('../../domains/notifications/whatsapp/WhatsAppVersionService');
      await WhatsAppVersionService.rollbackToSnapshot(snapshotId, (req.user as any)?._id);
      res.status(200).json({ success: true, message: 'Successfully rolled back configuration.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAuditLogs: async (req: Request, res: Response) => {
    try {
      const WhatsAppAuditLog = require('../../models/WhatsAppAuditLog').default;
      const logs = await WhatsAppAuditLog.find({})
        .sort({ performedAt: -1 })
        .limit(100) // limit for UI performance
        .populate('performedBy', 'firstName lastName email');
      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
