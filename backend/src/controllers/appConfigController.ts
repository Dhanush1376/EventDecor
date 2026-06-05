import { Request, Response } from 'express';
import AppConfig from '../models/AppConfig';
import logger from '../config/logger';

export const getPublicConfig = async (req: Request, res: Response) => {
  try {
    const configs = await AppConfig.find({ isPublic: true });
    const configMap = configs.reduce(
      (acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      },
      {} as Record<string, any>,
    );

    res.status(200).json({ success: true, data: configMap });
  } catch (error: any) {
    logger.error('Error fetching public config', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getAllConfig = async (req: Request, res: Response) => {
  try {
    const configs = await AppConfig.find();
    res.status(200).json({ success: true, data: configs });
  } catch (error: any) {
    logger.error('Error fetching all config', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const createOrUpdateConfig = async (req: Request, res: Response) => {
  try {
    const { key, value, type, description, isPublic } = req.body;
    const config = await AppConfig.findOneAndUpdate(
      { key },
      { key, value, type, description, isPublic, updatedBy: req.user?.id },
      { returnDocument: 'after', upsert: true },
    );
    res.status(200).json({ success: true, data: config });
  } catch (error: any) {
    logger.error('Error updating config', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
