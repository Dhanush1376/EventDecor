import PDFDocument from 'pdfkit';
import path from 'path';

export const generateInvoicePDF = async (orderData: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fillColor('#1a1a1a')
         .fontSize(20)
         .text('SIRI ARTS & CRAFTS', 50, 50, { align: 'right' });
      
      doc.fillColor('#d4af37')
         .fontSize(10)
         .text('Exquisite Boutique', 50, 75, { align: 'right' });

      doc.fillColor('#444444')
         .fontSize(20)
         .text('INVOICE', 50, 50);

      doc.fontSize(10)
         .text(`Order Number: ${orderData.orderId}`, 50, 80)
         .text(`Date: ${new Date(orderData.date).toLocaleDateString()}`, 50, 95);

      doc.moveDown(3);

      // Bill To
      doc.fontSize(12).fillColor('#000000').text('Bill To:', 50);
      doc.fontSize(10).fillColor('#444444').text(orderData.customerName, 50)
         .text(orderData.shippingAddress, 50);

      doc.moveDown(3);

      // Table Header
      const tableTop = doc.y;
      doc.font('Helvetica-Bold');
      doc.text('Item', 50, tableTop);
      doc.text('Qty', 350, tableTop);
      doc.text('Price', 400, tableTop);
      doc.text('Total', 480, tableTop, { align: 'right' });
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.font('Helvetica');

      // Table Rows
      let y = tableTop + 25;
      orderData.items.forEach((item: any) => {
        doc.text(item.name, 50, y);
        doc.text(item.quantity.toString(), 350, y);
        doc.text(`Rs. ${item.price}`, 400, y);
        doc.text(`Rs. ${item.price * item.quantity}`, 480, y, { align: 'right' });
        y += 20;
      });

      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 15;

      // Totals
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

      // Footer
      doc.fillColor('#888888').font('Helvetica').fontSize(10)
         .text('Thank you for your purchase. We hope you enjoy your exquisite items.', 50, 700, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
