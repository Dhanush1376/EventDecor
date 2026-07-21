import type { Response } from 'express';
import storeSettingsService from '../services/StoreSettingsService';

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

const writeInvoiceContent = (doc: any, orderData: InvoicePdfData, settings: any): void => {
  const brandColor = '#735c00';
  const textColor = '#1a1a1a';
  const grayColor = '#555555';
  const lightGray = '#888888';

  // Read from order snapshots if available, otherwise fall back to settings
  const storeSnap = (orderData as any).store;
  const invoiceSnap = (orderData as any).invoice;

  const storeName = storeSnap?.displayName || settings?.general?.storeName || 'Not Configured';
  const tagline = storeSnap?.legalCompanyName || settings?.general?.tagline || '';
  const gstin = storeSnap?.gstin || settings?.taxes?.gstNumber || 'Not Configured';
  const storeAddress = storeSnap
    ? [storeSnap.addressLine1, storeSnap.addressLine2, storeSnap.city, storeSnap.state]
        .filter(Boolean)
        .join(', ')
    : settings?.contact?.address || '';

  // --- HEADER ---
  // Left: Brand & Address
  doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(24).text(storeName, 50, 50);
  if (tagline) {
    doc.fillColor(grayColor).font('Helvetica-Bold').fontSize(10).text(tagline, 50, 75);
  }

  const addressLines = storeAddress.split(', ');
  let currentY = 90;
  addressLines.slice(0, 3).forEach((line: string) => {
    doc.fillColor(grayColor).font('Helvetica').fontSize(9).text(line.trim(), 50, currentY);
    currentY += 12;
  });

  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9).text(`GSTIN: ${gstin}`, 50, 126);

  // Right: Invoice Info
  const invoiceNum = invoiceSnap?.number || (orderData as any).invoiceNumber || 'Not Generated';
  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('TAX INVOICE', 50, 50, { align: 'right' });
  doc
    .fillColor(grayColor)
    .font('Helvetica')
    .fontSize(9)
    .text(`Invoice No: ${invoiceNum}`, 50, 75, { align: 'right' })
    .text(`Order Reference: ${orderData.orderId.substring(0, 12)}...`, 50, 87, { align: 'right' })
    .text(`Invoice Date: ${new Date(orderData.date).toLocaleDateString()}`, 50, 99, {
      align: 'right',
    })
    .text(`Payment Mode: ${(orderData as any).paymentMethod || 'PREPAID'}`, 50, 111, {
      align: 'right',
    });

  // Separator
  doc.moveTo(50, 145).lineTo(550, 145).lineWidth(1).strokeColor(grayColor).stroke();

  // --- ADDRESSES ---
  doc.moveDown(2);
  const addrY = 160;

  // Billed To
  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('BILLED TO (CUSTOMER):', 50, addrY);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(orderData.customerName, 50, addrY + 15);

  // Shipped To
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10).text('SHIPPED TO:', 300, addrY);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(orderData.customerName, 300, addrY + 15);
  doc
    .fillColor(grayColor)
    .font('Helvetica')
    .fontSize(9)
    .text(orderData.shippingAddress, 300, addrY + 30, { width: 250 });

  // --- TABLE HEADER ---
  const tableTop = addrY + 90;
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9);
  doc.text('ITEM DESIGN CURATION', 50, tableTop);
  doc.text('QTY', 260, tableTop, { align: 'center', width: 30 });
  doc.text('UNIT PRICE', 300, tableTop, { align: 'right', width: 60 });
  const cgstRatePercent = (settings.taxes.cgstRate * 100).toFixed(1);
  const sgstRatePercent = (settings.taxes.sgstRate * 100).toFixed(1);
  doc.text(`CGST(${cgstRatePercent}%)`, 370, tableTop, { align: 'right', width: 50 });
  doc.text(`SGST(${sgstRatePercent}%)`, 430, tableTop, { align: 'right', width: 50 });
  doc.text('TOTAL', 490, tableTop, { align: 'right', width: 60 });

  doc
    .moveTo(50, tableTop + 15)
    .lineTo(550, tableTop + 15)
    .lineWidth(0.5)
    .strokeColor(lightGray)
    .stroke();

  // --- TABLE ROWS ---
  let y = tableTop + 25;
  doc.font('Helvetica').fontSize(9);

  orderData.items.forEach((item) => {
    const qty = item.quantity;
    const price = item.price;
    const lineTotal = price * qty;
    const taxMultiplier = 1 + settings.taxes.gstRate;
    const basePrice = price / taxMultiplier;
    const totalLineTax = price - basePrice;
    const cgst = totalLineTax * (settings.taxes.cgstRate / settings.taxes.gstRate);
    const sgst = totalLineTax * (settings.taxes.sgstRate / settings.taxes.gstRate);

    doc.fillColor(textColor).font('Helvetica-Bold').text(item.name, 50, y, { width: 200 });
    doc.fillColor(grayColor).font('Helvetica');
    doc.text(qty.toString(), 260, y, { align: 'center', width: 30 });
    doc.text(`Rs. ${basePrice.toFixed(2)}`, 300, y, { align: 'right', width: 60 });
    doc.text(`Rs. ${(cgst * qty).toFixed(2)}`, 370, y, { align: 'right', width: 50 });
    doc.text(`Rs. ${(sgst * qty).toFixed(2)}`, 430, y, { align: 'right', width: 50 });
    doc
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(`Rs. ${lineTotal.toFixed(2)}`, 490, y, { align: 'right', width: 60 });

    y += 20;
  });

  doc.moveTo(50, y).lineTo(550, y).lineWidth(0.5).strokeColor(lightGray).stroke();
  y += 10;

  // --- SUBTOTALS ---
  doc.fillColor(grayColor).font('Helvetica-Bold').fontSize(9);
  doc.text('Gross Subtotal:', 350, y, { align: 'right', width: 100 });
  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text(`Rs. ${orderData.subtotal.toFixed(2)}`, 460, y, { align: 'right', width: 90 });
  y += 15;

  if (orderData.shipping > 0) {
    doc.fillColor(grayColor).text('Bespoke Shipping Fee:', 350, y, { align: 'right', width: 100 });
    doc
      .fillColor(textColor)
      .text(`Rs. ${orderData.shipping.toFixed(2)}`, 460, y, { align: 'right', width: 90 });
    y += 15;
  }

  doc.moveTo(350, y).lineTo(550, y).lineWidth(1).strokeColor(textColor).stroke();
  y += 10;

  // Grand Total
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10);
  doc.text('GRAND TOTAL (Inclusive of Taxes):', 250, y, { align: 'right', width: 200 });
  doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(12);
  doc.text(`Rs. ${orderData.total.toFixed(2)}`, 460, y - 1, { align: 'right', width: 90 });
  y += 25;

  // --- TAX BREAKDOWN ---
  y += 10;
  doc.rect(50, y, 250, 75).fillColor('#f9fafb').fill();
  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('GST TAX ASSESSMENT BREAKDOWN', 60, y + 10);

  const taxMultiplier = 1 + settings.taxes.gstRate;
  const totalBase = orderData.total / taxMultiplier;
  const totalTax = orderData.total - totalBase;

  doc
    .fillColor(grayColor)
    .font('Helvetica')
    .text('Taxable Basic Value:', 60, y + 25);
  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text(`Rs. ${totalBase.toFixed(2)}`, 200, y + 25, { width: 90, align: 'right' });

  doc
    .fillColor(grayColor)
    .font('Helvetica')
    .text(`Integrated SGST (${(settings.taxes.sgstRate * 100).toFixed(1)}%):`, 60, y + 38);
  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text(
      `Rs. ${(totalTax * (settings.taxes.sgstRate / settings.taxes.gstRate)).toFixed(2)}`,
      200,
      y + 38,
      { width: 90, align: 'right' },
    );

  doc
    .fillColor(grayColor)
    .font('Helvetica')
    .text(`Integrated CGST (${(settings.taxes.cgstRate * 100).toFixed(1)}%):`, 60, y + 51);
  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text(
      `Rs. ${(totalTax * (settings.taxes.cgstRate / settings.taxes.gstRate)).toFixed(2)}`,
      200,
      y + 51,
      { width: 90, align: 'right' },
    );

  doc
    .moveTo(60, y + 63)
    .lineTo(290, y + 63)
    .dash(2, { space: 2 })
    .strokeColor(lightGray)
    .stroke();
  doc.undash();

  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text('Total Assessment Taxes:', 60, y + 68);
  doc
    .fillColor(brandColor)
    .font('Helvetica-Bold')
    .text(`Rs. ${totalTax.toFixed(2)}`, 200, y + 68, { width: 90, align: 'right' });

  // --- FOOTER ---
  const footerStoreName = storeSnap?.displayName || settings?.general?.storeName || 'the store';
  const footerEmail =
    storeSnap?.email || settings?.general?.supportEmail || settings?.contact?.email || '';
  const footerText = `This is a secure computer generated tax invoice issued under ${footerStoreName} regulations and requires no physical signatures.${footerEmail ? ` For inquiry, reach ${footerEmail}.` : ''}`;
  doc.fillColor(lightGray).font('Helvetica').fontSize(8).text(footerText, 50, 720, {
    align: 'center',
  });
};

/** Stream PDF directly to HTTP response (chunked; no full-file RAM buffer). */
export const streamInvoicePDFToResponse = async (
  res: Response,
  orderData: InvoicePdfData,
  filename: string,
): Promise<void> => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const settings = await storeSettingsService.getSettings();

  const PDFDocumentClass = require('pdfkit');
  const doc = new PDFDocumentClass({ margin: 50 });
  doc.pipe(res);
  writeInvoiceContent(doc, orderData, settings);
  doc.end();
};

/** In-memory PDF for email attachments (buffers chunks; not used for HTTP download). */
export const generateInvoicePDF = async (orderData: InvoicePdfData): Promise<Buffer> => {
  const settings = await storeSettingsService.getSettings();
  return new Promise((resolve, reject) => {
    try {
      const PDFDocumentClass = require('pdfkit');
      const doc = new PDFDocumentClass({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      writeInvoiceContent(doc, orderData, settings);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
