import { Request, Response } from 'express';
import { ProductionService } from '../../domains/production/services/ProductionService';
import { ProductionStateMachine } from '../../domains/production/services/ProductionStateMachine';
import ProductionOrder from '../../domains/production/models/ProductionOrder';
import logger from '../../config/logger';

export const createProductionOrder = async (req: Request, res: Response) => {
  try {
    const { orderId, items } = req.body;
    const prodOrder = await ProductionService.createForCustomOrder(orderId, items);
    res.status(201).json({ success: true, data: prodOrder });
  } catch (error: any) {
    logger.error('createProductionOrder Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const transitionItemStage = async (req: Request, res: Response) => {
  try {
    const { productionOrderId, sku, nextStage, metadata } = req.body;
    const userId = (req as any).user.id;
    const prodOrder = await ProductionStateMachine.transitionItem(
      productionOrderId,
      sku,
      nextStage,
      userId,
      metadata,
    );
    res.status(200).json({ success: true, data: prodOrder });
  } catch (error: any) {
    logger.error('transitionItemStage Error:', error);
    res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
};

export const getActiveOrders = async (req: Request, res: Response) => {
  try {
    const orders = await ProductionOrder.find({ status: { $ne: 'sent_to_warehouse' } })
      .populate('orderId')
      .populate('items.productId')
      .populate('assignedWorkers.userId')
      .sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: orders });
  } catch (error: any) {
    logger.error('getActiveOrders Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
