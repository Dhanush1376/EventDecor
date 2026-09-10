import { Request, Response } from 'express';
import { DocumentService } from '../../domains/documents/services/DocumentService';
import { ShippingLabelGenerator } from '../../domains/documents/services/ShippingLabelGenerator';
import logger from '../../config/logger';

export const generateInvoice = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId as string;

    // Check order authorization
    const Order = require('../../models/Order').default;
    const mongoose = require('mongoose');
    let order: any = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId).populate('user').lean();
    }
    if (!order) {
      order = await Order.findOne({
        $or: [
          { invoiceNumber: orderId },
          { 'invoice.number': orderId },
          { orderNumber: orderId },
          { orderUuid: orderId },
        ],
      })
        .populate('user')
        .lean();
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const userRole = (req as any).user?.role;
    const userId = (req as any).user?._id?.toString() || (req as any).user?.id?.toString();

    // If an authenticated user is accessing who is neither admin nor the order owner:
    if (
      userId &&
      userRole !== 'admin' &&
      userRole !== 'super_admin' &&
      order.user?._id?.toString() !== userId &&
      order.user?.toString() !== userId
    ) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to view this invoice' });
    }

    // Generate canonical PDF
    const { generateInvoicePDF } = require('../../utils/pdfGenerator');
    const orderData: any = {
      ...order,
      orderId: order._id?.toString() || orderId,
      date: order.createdAt || new Date(),
      customerName: order.shippingAddress?.name || (order.user as any)?.name || 'Customer',
    };
    const fileBuffer = await generateInvoicePDF(orderData);

    // If client explicitly requests JSON (e.g. internal API callers)
    if (req.headers.accept?.includes('application/json') && req.query.format !== 'pdf') {
      try {
        const document = await DocumentService.generateInvoice(orderId);
        return res.json({ success: true, data: document });
      } catch (_s3Err) {
        return res.json({ success: true, message: 'Invoice generated' });
      }
    }

    // Stream PDF directly to browser/client
    const invoiceNum =
      order.invoiceNumber ||
      (order._id ? `INV-${String(order._id).slice(-8).toUpperCase()}` : orderId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice_${invoiceNum}.pdf"`);
    return res.send(fileBuffer);
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
