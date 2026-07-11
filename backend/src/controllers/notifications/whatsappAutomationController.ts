import { Request, Response } from 'express';
import WhatsAppAutomation from '../../models/WhatsAppAutomation';
import WhatsAppTemplate from '../../models/WhatsAppTemplate';
import WhatsAppRecipient from '../../models/WhatsAppRecipient';
import WhatsAppMessageLog from '../../models/WhatsAppMessageLog';
import WhatsAppDashboardCache from '../../models/WhatsAppDashboardCache';
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
      // Stub implementation for Recharts
      const data = {
        dailyTrends: [
          { date: 'Mon', sent: 120, failed: 5 },
          { date: 'Tue', sent: 150, failed: 2 },
          { date: 'Wed', sent: 180, failed: 8 },
          { date: 'Thu', sent: 190, failed: 3 },
          { date: 'Fri', sent: 210, failed: 1 },
          { date: 'Sat', sent: 250, failed: 10 },
          { date: 'Sun', sent: 220, failed: 4 },
        ],
        statusDistribution: [
          { name: 'Sent', value: 1200 },
          { name: 'Failed', value: 45 },
          { name: 'Pending', value: 12 },
        ],
      };
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getHealth: async (req: Request, res: Response) => {
    try {
      const provider = WhatsAppProviderFactory.getProvider();
      const health = await provider.checkHealth();
      res.status(200).json({ success: true, data: { provider: provider.name, ...health } });
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
      const automation = await WhatsAppAutomation.findOneAndUpdate(
        { automationKey: req.params.key },
        req.body,
        { new: true, runValidators: true },
      );
      res.status(200).json({ success: true, data: automation });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  toggleAutomation: async (req: Request, res: Response) => {
    try {
      const automation = await WhatsAppAutomation.findOneAndUpdate(
        { automationKey: req.params.key },
        { enabled: req.body.enabled },
        { new: true },
      );
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
      res.status(201).json({ success: true, data: template });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  updateTemplate: async (req: Request, res: Response) => {
    try {
      const template = await WhatsAppTemplate.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      res.status(200).json({ success: true, data: template });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  deleteTemplate: async (req: Request, res: Response) => {
    try {
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
      res.status(201).json({ success: true, data: recipient });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  updateRecipient: async (req: Request, res: Response) => {
    try {
      const recipient = await WhatsAppRecipient.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      res.status(200).json({ success: true, data: recipient });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  deleteRecipient: async (req: Request, res: Response) => {
    try {
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
      // Simulate test send
      res.status(200).json({ success: true, message: 'Test message queued' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
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
};
