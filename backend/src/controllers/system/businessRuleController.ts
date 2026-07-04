import { Request, Response } from 'express';
import BusinessRule from '../../domains/system/models/BusinessRule';
import logger from '../../config/logger';

export const getRules = async (req: Request, res: Response) => {
  try {
    const rules = await BusinessRule.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: rules });
  } catch (error: any) {
    logger.error('Error fetching rules:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createRule = async (req: Request, res: Response) => {
  try {
    const rule = new BusinessRule(req.body);
    await rule.save();
    res.status(201).json({ success: true, data: rule });
  } catch (error: any) {
    logger.error('Error creating rule:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleRuleStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await BusinessRule.findById(id);

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    rule.active = !rule.active;
    await rule.save();

    res.status(200).json({ success: true, data: rule });
  } catch (error: any) {
    logger.error('Error toggling rule status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
