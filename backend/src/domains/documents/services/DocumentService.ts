import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { s3Upload } from '../../../utils/s3Upload';
import { generateInvoicePDF } from '../../../utils/pdfGenerator';
import OrderDocument from '../models/OrderDocument';
import logger from '../../../config/logger';
import Order from '../../../models/Order';
import Package from '../../warehouse/models/Package';
import bwipjs from 'bwip-js';

export class DocumentService {
  /**
   * Generates a PDF invoice for an order and uploads it to S3 using the canonical PDF generator
   */
  static async generateInvoice(orderId: string): Promise<any> {
    try {
      const order = await Order.findById(orderId).populate('user');
      if (!order) throw new Error('Order not found');

      // 1. Check if invoice already exists
      const existing = await OrderDocument.findOne({ orderId, documentType: 'invoice' });
      if (existing) return existing;

      // 2. Generate canonical PDF Buffer
      const invoiceRef =
        order.invoice?.number ||
        order.invoiceNumber ||
        (orderId ? `INV-${String(orderId).slice(-8).toUpperCase()}` : 'ORDER');
      const fileName = `invoice_${invoiceRef}.pdf`;
      const orderObj = order.toObject ? order.toObject() : order;
      const orderData: any = {
        ...orderObj,
        orderId: order._id?.toString() || (order as any).orderId || orderId,
        date: order.createdAt || new Date(),
        customerName: order.shippingAddress?.name || (order.user as any)?.name || 'Customer',
      };
      const fileBuffer = await generateInvoicePDF(orderData);
      const s3Response = await s3Upload(
        {
          buffer: fileBuffer,
          originalname: fileName,
          mimetype: 'application/pdf',
        } as any,
        'invoices',
      );

      // 4. Save Record
      const orderDoc = await OrderDocument.create({
        orderId,
        orderType: 'Order',
        documentType: 'invoice',
        fileUrl: s3Response.url || s3Response.Location,
        s3Key: s3Response.key || s3Response.Key,
      });

      return orderDoc;
    } catch (error) {
      logger.error('Failed to generate invoice', error);
      throw error;
    }
  }

  /**
   * Generates a PDF packing slip for a specific package and uploads to S3
   */
  static async generatePackingSlip(packageId: string): Promise<any> {
    try {
      const pkg = await Package.findById(packageId).populate('orderId');
      if (!pkg) throw new Error('Package not found');

      const order = pkg.orderId as any;

      // Check if packing slip already exists
      const existing = await OrderDocument.findOne({
        orderId: order._id,
        documentType: 'packing_slip',
        'metadata.packageId': packageId,
      });
      if (existing) return existing;

      // Generate Barcode image
      const pngBuffer = await bwipjs.toBuffer({
        bcid: 'code128',
        text: pkg.barcode || pkg.packageId,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });

      // Generate PDF locally
      const fileName = `packingslip_${pkg.packageId}.pdf`;
      const tempPath = path.join('/tmp', fileName);

      await new Promise<void>((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(tempPath);
        doc.pipe(stream);

        // Simple PDF layout
        doc.fontSize(20).text('Packing Slip', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Order ID: ${order._id}`);
        doc.text(`Package ID: ${pkg.packageId}`);
        doc.text(`Package ${pkg.packageNumber} of ${pkg.totalPackages}`);
        doc.moveDown();

        // Add barcode image
        doc.image(pngBuffer, { fit: [200, 100], align: 'center' });
        doc.moveDown(5);

        doc.text('Items in this package:');
        pkg.items.forEach((item: any) => {
          doc.text(`- SKU: ${item.sku} x ${item.quantity}`);
        });

        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      // Upload to S3
      const fileBuffer = fs.readFileSync(tempPath);
      const s3Response = await s3Upload(
        {
          buffer: fileBuffer,
          originalname: fileName,
          mimetype: 'application/pdf',
        } as any,
        'packing_slips',
      );

      // Save Record
      const orderDoc = await OrderDocument.create({
        orderId: order._id,
        orderType: 'Order',
        documentType: 'packing_slip',
        fileUrl: s3Response.url || s3Response.Location,
        s3Key: s3Response.key || s3Response.Key,
        metadata: { packageId: pkg._id },
      });

      // Cleanup
      fs.unlinkSync(tempPath);

      return orderDoc;
    } catch (error) {
      logger.error('Failed to generate packing slip', error);
      throw error;
    }
  }
}
