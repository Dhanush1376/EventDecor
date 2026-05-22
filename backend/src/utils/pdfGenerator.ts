import PDFDocument from 'pdfkit';
import type { Response } from 'express';

export type InvoicePdfData = {
  orderId: string;
  date: Date | string;
  customerName: string;
  shippingAddress: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  shipping: number;
  total: number;
};

const writeInvoiceContent = (doc: InstanceType<typeof PDFDocument>, orderData: InvoicePdfData): void => {
  doc.fillColor('#1a1a1a')
    .fontSize(20)
    .text('SIRI ARTS & CRAFTS', 50, 50, { align: 'right' });

  doc.fillColor('#d4af37')
    .fontSize(10)
    .text('Exquisite Boutique', 50, 75, { align: 'right' });

  doc.fillColor('#444444').fontSize(20).text('INVOICE', 50, 50);

  doc
    .fontSize(10)
    .text(`Order Number: ${orderData.orderId}`, 50, 80)
    .text(`Date: ${new Date(orderData.date).toLocaleDateString()}`, 50, 95);

  doc.moveDown(3);

  doc.fontSize(12).fillColor('#000000').text('Bill To:', 50);
  doc.fontSize(10).fillColor('#444444').text(orderData.customerName, 50).text(orderData.shippingAddress, 50);

  doc.moveDown(3);

  const tableTop = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Item', 50, tableTop);
  doc.text('Qty', 350, tableTop);
  doc.text('Price', 400, tableTop);
  doc.text('Total', 480, tableTop, { align: 'right' });

  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
  doc.font('Helvetica');

  let y = tableTop + 25;
  orderData.items.forEach((item) => {
    doc.text(item.name, 50, y);
    doc.text(item.quantity.toString(), 350, y);
    doc.text(`Rs. ${item.price}`, 400, y);
    doc.text(`Rs. ${item.price * item.quantity}`, 480, y, { align: 'right' });
    y += 20;
  });

  doc.moveTo(50, y).lineTo(550, y).stroke();
  y += 15;

  doc.font('Helvetica-Bold');
  doc.text('Subtotal:', 350, y);
  doc.text(`Rs. ${orderData.subtotal}`, 480, y, { align: 'right' });
  y += 20;

  doc.text('Shipping:', 350, y);
  doc.text(`Rs. ${orderData.shipping}`, 480, y, { align: 'right' });
  y += 20;

  doc.fillColor('#d4af37');
  doc.text('Total:', 350, y);
  doc.text(`Rs. ${orderData.total}`, 480, y, { align: 'right' });

  doc
    .fillColor('#888888')
    .font('Helvetica')
    .fontSize(10)
    .text('Thank you for your purchase. We hope you enjoy your exquisite items.', 50, 700, {
      align: 'center',
    });
};

/** Stream PDF directly to HTTP response (chunked; no full-file RAM buffer). */
export const streamInvoicePDFToResponse = (
  res: Response,
  orderData: InvoicePdfData,
  filename: string
): void => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  writeInvoiceContent(doc, orderData);
  doc.end();
};

/** In-memory PDF for email attachments (buffers chunks; not used for HTTP download). */
export const generateInvoicePDF = async (orderData: InvoicePdfData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      writeInvoiceContent(doc, orderData);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
