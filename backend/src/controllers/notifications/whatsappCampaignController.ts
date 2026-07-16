import { Request, Response } from 'express';
import WhatsAppCampaign from '../../models/WhatsAppCampaign';
import { WhatsAppCampaignService } from '../../domains/notifications/whatsapp/WhatsAppCampaignService';
import logger from '../../config/logger';

export class WhatsAppCampaignController {
  static async getCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const campaigns = await WhatsAppCampaign.find()
        .populate('templateId', 'name status')
        .sort({ createdAt: -1 });
      res.json({ success: true, data: campaigns });
    } catch (error: any) {
      logger.error('Failed to get campaigns', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createCampaign(req: Request, res: Response): Promise<void> {
    try {
      const campaign = new WhatsAppCampaign({
        ...req.body,
        status: req.body.scheduledAt ? 'scheduled' : 'draft',
        createdBy: (req.user as any)?._id,
      });
      await campaign.save();
      res.status(201).json({ success: true, data: campaign });
    } catch (error: any) {
      logger.error('Failed to create campaign', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const campaign = await WhatsAppCampaign.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }
      res.json({ success: true, data: campaign });
    } catch (error: any) {
      logger.error('Failed to update campaign', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async dispatchCampaign(req: Request, res: Response): Promise<void> {
    try {
      await WhatsAppCampaignService.startCampaign(req.params.id as string, (req.user as any)?._id);
      res.json({ success: true, message: 'Campaign dispatch initiated' });
    } catch (error: any) {
      logger.error('Failed to dispatch campaign', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async pauseCampaign(req: Request, res: Response): Promise<void> {
    try {
      await WhatsAppCampaignService.pauseCampaign(req.params.id as string, (req.user as any)?._id);
      res.json({ success: true, message: 'Campaign paused' });
    } catch (error: any) {
      logger.error('Failed to pause campaign', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async validateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const campaign = await WhatsAppCampaign.findById(req.params.id);
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }
      const {
        CampaignValidator,
      } = require('../../domains/notifications/whatsapp/CampaignValidator');
      const validation = await CampaignValidator.validate(campaign);
      res.json({ success: true, data: validation });
    } catch (error: any) {
      logger.error('Failed to validate campaign', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteCampaign(req: Request, res: Response): Promise<void> {
    try {
      const campaign = await WhatsAppCampaign.findByIdAndDelete(req.params.id);
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }
      res.json({ success: true, message: 'Campaign deleted' });
    } catch (error: any) {
      logger.error('Failed to delete campaign', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
