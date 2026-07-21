import { Router } from 'express';
import { ShippingService } from '../../domains/shipping/services/ShippingService';
import logger from '../../config/logger';

const router = Router();

// Courier webhook to sync AWB status
router.post('/webhook', async (req, res) => {
  try {
    const { tracking_number } = req.body;

    if (!tracking_number) {
      return res.status(400).json({ success: false, message: 'tracking_number is required' });
    }

    // In a real integration, you would map the courier-specific tracking number
    // to the Shipment ID and then sync. Here we assume we can look up by trackingNumber
    const Shipment = require('../../domains/shipping/models/Shipment').default;
    const shipment = await Shipment.findOne({ trackingNumber: tracking_number });

    if (shipment) {
      await ShippingService.syncTrackingStatus(shipment._id.toString());
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error('Courier webhook Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
