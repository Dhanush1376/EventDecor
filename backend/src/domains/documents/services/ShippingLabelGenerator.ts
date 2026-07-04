import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { s3Upload } from '../../../utils/s3Upload';
import OrderDocument from '../models/OrderDocument';
import logger from '../../../config/logger';
import Shipment from '../../shipping/models/Shipment';
import Order from '../../../models/Order';
import bwipjs from 'bwip-js';

export class ShippingLabelGenerator {
  /**
   * Generates a shipping label PDF with a barcode and uploads it to S3.
   * If the courier provides a labelUrl, we might just download and store that instead,
   * but this generates an internal label.
   */
  static async generateLabel(shipmentId: string): Promise<any> {
    try {
      const shipment = await Shipment.findOne({ shipmentId });
      if (!shipment) throw new Error('Shipment not found');

      const order = await Order.findById(shipment.orderId);
      if (!order) throw new Error('Order not found');

      const existing = await OrderDocument.findOne({
        orderId: order._id,
        documentType: 'shipping_label',
      });
      if (existing) return existing;

      // Generate Barcode Buffer
      const trackingCode = shipment.trackingNumber || shipment.awbNumber || shipment.shipmentId;
      const barcodeBuffer = await (bwipjs.toBuffer({
        bcid: 'code128',
        text: trackingCode,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      }) as unknown as Promise<Buffer>);

      const fileName = `label_${trackingCode}.pdf`;
      const tempPath = path.join('/tmp', fileName);

      await new Promise<void>((resolve, reject) => {
        const doc = new PDFDocument({ size: [288, 432] }); // 4x6 inches
        const stream = fs.createWriteStream(tempPath);
        doc.pipe(stream);

        doc.fontSize(16).text('Siri Arts & Crafts - Shipping Label', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text('TO:');
        doc.fontSize(10).text(order.shippingAddress.name || 'Customer');
        doc.text(order.shippingAddress.address);
        doc.text(
          `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`,
        );
        doc.text(`Phone: ${order.shippingAddress.phone}`);

        doc.moveDown();
        doc.image(barcodeBuffer, { fit: [200, 50], align: 'center' });

        doc.moveDown(4);
        doc.text(`Courier: ${shipment.courierPartner}`);
        doc.text(`Weight: ${shipment.packageIds?.length || 1} package(s)`);

        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      const fileBuffer = fs.readFileSync(tempPath);
      const s3Response = await s3Upload(
        {
          buffer: fileBuffer,
          originalname: fileName,
          mimetype: 'application/pdf',
        } as any,
        'labels',
      );

      const orderDoc = await OrderDocument.create({
        orderId: order._id,
        orderType: 'Order',
        documentType: 'shipping_label',
        fileUrl: s3Response.url || s3Response.Location,
        s3Key: s3Response.key || s3Response.Key,
      });

      fs.unlinkSync(tempPath);

      return orderDoc;
    } catch (error) {
      logger.error('Failed to generate shipping label', error);
      throw error;
    }
  }
}
