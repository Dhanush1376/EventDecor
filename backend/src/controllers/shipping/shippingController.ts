import { Request, Response } from 'express';
import { ShippingService } from '../../domains/shipping/services/ShippingService';
import { DeliveryEstimationEngine } from '../../domains/shipping/services/DeliveryEstimationEngine';
import logger from '../../config/logger';

export const dispatchPackages = async (req: Request, res: Response) => {
  try {
    const { orderId, packageIds, courierType, shippingAddress } = req.body;
    const shipment = await ShippingService.dispatchPackages(
      orderId,
      packageIds,
      courierType,
      shippingAddress,
    );
    res.status(201).json({ success: true, data: shipment });
  } catch (error: any) {
    logger.error('dispatchPackages Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const syncTracking = async (req: Request, res: Response) => {
  try {
    const shipmentId = req.params.shipmentId as string;
    const shipment = await ShippingService.syncTrackingStatus(shipmentId);
    res.status(200).json({ success: true, data: shipment });
  } catch (error: any) {
    logger.error('syncTracking Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const estimateDelivery = async (req: Request, res: Response) => {
  try {
    const { destinationPincode, weight } = req.body;

    // Validate inputs
    if (!destinationPincode || !weight) {
      return res
        .status(400)
        .json({ success: false, message: 'destinationPincode and weight are required' });
    }

    // We mock origin pincode as it would typically be configured in settings
    const originPincode = '500001';

    const estimate = await DeliveryEstimationEngine.estimateDelivery(
      originPincode,
      destinationPincode,
      weight,
    );

    res.status(200).json({ success: true, data: estimate });
  } catch (error: any) {
    logger.error('estimateDelivery Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};
