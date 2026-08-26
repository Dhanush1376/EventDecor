import { Request, Response } from 'express';
import { DocumentService } from '../../domains/documents/services/DocumentService';
import { ShippingLabelGenerator } from '../../domains/documents/services/ShippingLabelGenerator';
import logger from '../../config/logger';

export const generateInvoice = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId as string;

    // Check order authorization
    const Order = require('../../models/Order').default;
    const order = await Order.findById(orderId).select('user').lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const userRole = (req as any).user?.role || 'user';
    const userId = (req as any).user?._id?.toString() || (req as any).user?.id?.toString();

    if (userRole !== 'admin' && userRole !== 'super_admin' && order.user.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to view this invoice' });
    }

    const document = await DocumentService.generateInvoice(orderId);

    res.json({ success: true, data: document });
  } catch (error: any) {
    logger.error('generateInvoice Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const generatePackingSlip = async (req: Request, res: Response) => {
  try {
    const packageId = req.params.packageId as string;

    const document = await DocumentService.generatePackingSlip(packageId);

    res.json({ success: true, data: document });
  } catch (error: any) {
    logger.error('generatePackingSlip Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const generateShippingLabel = async (req: Request, res: Response) => {
  try {
    const shipmentId = req.params.shipmentId as string;

    const document = await ShippingLabelGenerator.generateLabel(shipmentId);

    res.json({ success: true, data: document });
  } catch (error: any) {
    logger.error('generateShippingLabel Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};
