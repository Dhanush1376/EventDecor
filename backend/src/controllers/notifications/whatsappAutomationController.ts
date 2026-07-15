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
      const days = Math.min(Math.max(parseInt(req.query.days as string) || 7, 1), 90);
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      since.setUTCDate(since.getUTCDate() - (days - 1));

      const DELIVERED = ['sent', 'delivered', 'read'];
      const PENDING = ['queued', 'dispatched'];

      // Per-day delivered vs failed counts over the window.
      const trendAgg = await WhatsAppMessageLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sent: {
              $sum: { $cond: [{ $in: ['$deliveryStatus', DELIVERED] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] },
            },
          },
        },
      ]);

      const trendByDay = new Map<string, { sent: number; failed: number }>(
        trendAgg.map((t: any) => [t._id, { sent: t.sent, failed: t.failed }]),
      );

      // Materialize every day in the range (including zero-activity days) so the
      // chart has a continuous X axis.
      const dailyTrends = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setUTCDate(since.getUTCDate() + i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
        const entry = trendByDay.get(key) || { sent: 0, failed: 0 };
        dailyTrends.push({ date: label, sent: entry.sent, failed: entry.failed });
      }

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

      res.status(200).json({ success: true, data: { dailyTrends, statusDistribution } });
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

      const provider = WhatsAppProviderFactory.getProvider();
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
