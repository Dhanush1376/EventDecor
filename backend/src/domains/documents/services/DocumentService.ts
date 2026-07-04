import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { s3Upload } from '../../../utils/s3Upload'; // Assuming this utility exists
import OrderDocument from '../models/OrderDocument';
import logger from '../../../config/logger';
import Order from '../../../models/Order';

export class DocumentService {
  /**
   * Generates a PDF invoice for an order and uploads it to S3
   */
  static async generateInvoice(orderId: string): Promise<any> {
    try {
      const order = await Order.findById(orderId).populate('user');
      if (!order) throw new Error('Order not found');

      // 1. Check if invoice already exists
      const existing = await OrderDocument.findOne({ orderId, documentType: 'invoice' });
      if (existing) return existing;

      // 2. Generate PDF locally
      const fileName = `invoice_${orderId}.pdf`;
      const tempPath = path.join('/tmp', fileName);

      await new Promise<void>((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(tempPath);
        doc.pipe(stream);

        // Simple PDF layout
        doc.fontSize(20).text('Siri Arts & Crafts - Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Order ID: ${orderId}`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
        doc.text(`Total Amount: INR ${order.total}`);
        doc.moveDown();
        doc.text('Items:');
        order.items.forEach((item: any) => {
          doc.text(`- Product ${item.productId} x ${item.quantity} (INR ${item.price})`);
        });

        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      // 3. Upload to S3
      const fileBuffer = fs.readFileSync(tempPath);
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

      // Cleanup
      fs.unlinkSync(tempPath);

      return orderDoc;
    } catch (error) {
      logger.error('Failed to generate invoice', error);
      throw error;
    }
  }
}
