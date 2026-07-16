import PDFDocument from 'pdfkit';
import logger from '../../../config/logger';

export class PdfGenerationService {
  /**
   * Generates a PDF invoice for a given order and returns it as a Buffer.
   */
  static async generateInvoiceBuffer(order: any, storeSettings: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', (err) => {
          logger.error('[PdfGenerationService] Error generating PDF', err);
          reject(err);
        });

        const storeName = storeSettings?.general?.storeName || 'EventDecor';
        const currency = storeSettings?.general?.currency || 'INR';

        // Header
        doc.fontSize(24).text(storeName, { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text('TAX INVOICE', { align: 'center' });
        doc.moveDown(2);

        // Order Details
        doc.fontSize(10);
        doc.text(`Order Number: ${order.orderNumber || order._id}`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
        doc.text(`Payment Status: ${order.paymentStatus}`);
        doc.moveDown();

        // Customer Details
        doc.text('Billed To:');
        doc.text(order.shippingAddress?.name || 'Customer');
        doc.text(order.shippingAddress?.email || '');
        doc.text(order.shippingAddress?.phone || '');
        doc.text(`${order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''}`);
        doc.moveDown(2);

        // Items Table Header
        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Item', 50, tableTop);
        doc.text('Qty', 350, tableTop, { width: 50, align: 'right' });
        doc.text('Price', 400, tableTop, { width: 50, align: 'right' });
        doc.text('Total', 450, tableTop, { width: 80, align: 'right' });
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(530, tableTop + 15)
          .stroke();
        doc.font('Helvetica');

        let position = tableTop + 25;

        // Items
        if (order.items && order.items.length > 0) {
          order.items.forEach((item: any) => {
            doc.text(item.title, 50, position, { width: 300 });
            doc.text(item.quantity.toString(), 350, position, { width: 50, align: 'right' });
            doc.text(`${item.price}`, 400, position, { width: 50, align: 'right' });
            doc.text(`${item.price * item.quantity}`, 450, position, { width: 80, align: 'right' });
            position += 20;
          });
        }

        doc
          .moveTo(50, position + 10)
          .lineTo(530, position + 10)
          .stroke();
        position += 20;

        // Totals
        doc.font('Helvetica-Bold');
        doc.text('Subtotal:', 350, position, { width: 100, align: 'right' });
        doc.text(`${order.subtotal}`, 450, position, { width: 80, align: 'right' });
        position += 20;

        if (order.shippingFee > 0) {
          doc.text('Shipping:', 350, position, { width: 100, align: 'right' });
          doc.text(`${order.shippingFee}`, 450, position, { width: 80, align: 'right' });
          position += 20;
        }

        if (order.discount > 0) {
          doc.text('Discount:', 350, position, { width: 100, align: 'right' });
          doc.text(`-${order.discount}`, 450, position, { width: 80, align: 'right' });
          position += 20;
        }

        doc.fontSize(12);
        doc.text('Total Amount:', 350, position, { width: 100, align: 'right' });
        doc.text(`${currency} ${order.total}`, 450, position, { width: 80, align: 'right' });

        doc.moveDown(4);
        doc
          .fontSize(10)
          .font('Helvetica')
          .text('Thank you for your business!', { align: 'center' });

        doc.end();
      } catch (error) {
        logger.error('[PdfGenerationService] Unexpected error', error);
        reject(error);
      }
    });
  }
}
