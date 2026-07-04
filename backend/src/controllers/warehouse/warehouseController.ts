import { Request, Response } from 'express';
import { ScannerService } from '../../domains/warehouse/services/ScannerService';
import { PickListService } from '../../domains/warehouse/services/PickListService';
import { PackageService } from '../../domains/warehouse/services/PackageService';
import ScanEvent from '../../domains/warehouse/models/ScanEvent';
import Package from '../../domains/warehouse/models/Package';
import Product from '../../models/Product';
import logger from '../../config/logger';

export const processScan = async (req: Request, res: Response) => {
  try {
    const { rawPayload, scannerId, location } = req.body;
    const userId = (req as any).user.id;

    if (!rawPayload) {
      return res.status(400).json({ success: false, message: 'rawPayload is required' });
    }

    const scanEvent = await ScannerService.processScan(
      rawPayload,
      scannerId || 'web-scanner',
      userId,
      location || {},
    );

    res.status(200).json({ success: true, data: scanEvent });
  } catch (error: any) {
    logger.error('processScan Error:', error);
    res
      .status(error.statusCode || 400)
      .json({ success: false, message: error.message || 'Scan processing failed' });
  }
};

export const getActivePickLists = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const PickList = require('../../domains/warehouse/models/PickList').default;
    const picklists = await PickList.find({
      assignedTo: userId,
      status: { $in: ['assigned', 'in_progress'] },
    });
    res.status(200).json({ success: true, data: picklists });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignPickList = async (req: Request, res: Response) => {
  try {
    const { orderIds, assignedTo } = req.body;
    // generateForOrder takes a single orderId, so we use the first one
    const picklist = await PickListService.generateForOrder(orderIds[0], assignedTo);
    res.status(201).json({ success: true, data: picklist });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const packageOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    const pkgs = await PackageService.autoPackOrder(orderId);
    res.status(201).json({ success: true, data: pkgs });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getRecentScans = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;

    let query = {};
    // If not admin/manager, only show their own scans
    if (userRole !== 'super_admin' && userRole !== 'admin' && userRole !== 'manager') {
      query = { workerId: userId };
    }

    const scans = await ScanEvent.find(query).sort({ timestamp: -1 }).limit(50).lean();

    res.status(200).json({ success: true, data: scans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActivePackages = async (req: Request, res: Response) => {
  try {
    const packages = await Package.find({
      status: { $in: ['created', 'items_verified', 'sealed', 'labeled'] },
    })
      .populate('orderId')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: packages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDispatchTasks = async (req: Request, res: Response) => {
  try {
    const packages = await Package.find({
      status: { $in: ['ready_for_pickup', 'labeled'] },
    })
      .populate('orderId')
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: packages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductsForCount = async (req: Request, res: Response) => {
  try {
    // Fetch products that might need counting (e.g. low stock or random sample)
    const products = await Product.find({}).select('title sku stock inventory').limit(50).lean();

    res.status(200).json({ success: true, data: products });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
