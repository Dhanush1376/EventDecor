import type { Response } from 'express';
import storeSettingsService from '../services/StoreSettingsService';
import { getStoreConfigSync, getStoreLegalDetails } from '../config/storeConfig';

export type InvoicePdfData = {
  orderId: string;
  date: Date | string;
  customerName: string;
  shippingAddress: string | any;
  items: Array<{ name?: string; title?: string; quantity?: number; qty?: number; price: number }>;
  subtotal: number;
  shipping: number;
  total: number;
  invoiceNumber?: string;
  paymentMethod?: string;
  invoice?: any;
  store?: any;
};

const writeInvoiceContent = (doc: any, orderData: InvoicePdfData, settings: any): void => {
  const brandColor = '#735c00';
  const textColor = '#1a1a1a';
  const grayColor = '#555555';
  const lightGray = '#888888';

  // Read from order snapshots if available, otherwise fall back to settings
  const storeSnap = (orderData as any).store;
  const invoiceSnap = (orderData as any).invoice;
  const taxSnap = (orderData as any).tax;

  const storeConfig = getStoreConfigSync();
  const legalDetails = getStoreLegalDetails(settings, storeSnap);

  const storeName = storeSnap?.name || legalDetails.legalName || storeConfig.name;
  const tagline = storeSnap?.tagline || settings?.general?.tagline || '';
  const gstin = taxSnap?.gstNumber || legalDetails.gstin || '';
  const cin = storeSnap?.cin || legalDetails.cin || '';
  const storeAddress = storeSnap?.address || legalDetails.address;

  const isGstEnabled = taxSnap?.gstEnabled ?? settings?.taxes?.gstEnabled ?? true;
  const isTaxInclusive = taxSnap?.taxInclusive ?? settings?.taxes?.taxInclusive ?? true;
  const isInterState = Boolean(taxSnap?.isInterState);
  const gstRate = Number(taxSnap?.gstRate ?? settings?.taxes?.gstRate ?? 0.18);
  const cgstRate = Number(taxSnap?.cgstRate ?? settings?.taxes?.cgstRate ?? gstRate / 2);
  const sgstRate = Number(taxSnap?.sgstRate ?? settings?.taxes?.sgstRate ?? gstRate / 2);
  const hsnCode = taxSnap?.hsnCode || settings?.taxes?.hsnCode || '';
  const invoiceFooter = taxSnap?.invoiceFooter || settings?.taxes?.invoiceFooter || '';

  // --- HEADER ---
  // Left: Brand & Address
  doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(20).text(storeName, 50, 48);
  if (tagline) {
    doc.fillColor(grayColor).font('Helvetica-Bold').fontSize(9).text(tagline, 50, 72);
  }

  // Wrap address parts cleanly to prevent truncating long multi-segment addresses
  const addressParts = storeAddress ? storeAddress.split(', ') : [];
  const addressLines: string[] = [];
  let addrBuffer = '';
  for (const part of addressParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (!addrBuffer) {
      addrBuffer = trimmed;
    } else if ((addrBuffer + ', ' + trimmed).length <= 48) {
      addrBuffer += ', ' + trimmed;
    } else {
      addressLines.push(addrBuffer);
      addrBuffer = trimmed;
    }
  }
  if (addrBuffer) addressLines.push(addrBuffer);

  let currentY = tagline ? 85 : 74;
  addressLines.slice(0, 4).forEach((line: string) => {
    doc.fillColor(grayColor).font('Helvetica').fontSize(8.5).text(line.trim(), 50, currentY);
    currentY += 11;
  });

  if (gstin && isGstEnabled) {
    doc
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(`GSTIN: ${gstin}`, 50, currentY + 1);
    currentY += 11;
  }

  if (cin) {
    doc
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(`CIN: ${cin}`, 50, currentY + 1);
    currentY += 11;
  }

  // Right: Invoice Info
  const invoiceNum =
    invoiceSnap?.number ||
    (orderData as any).invoiceNumber ||
    `INV-${orderData.orderId ? String(orderData.orderId).slice(-8).toUpperCase() : 'PENDING'}`;

  const invoiceDateStr = orderData.date
    ? new Date(orderData.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN');

  const paymentModeStr = (
    (orderData as any).paymentMethod ||
    (orderData as any).paymentMode ||
    'PREPAID'
  ).toUpperCase();

  const invoiceTitle = isGstEnabled ? 'TAX INVOICE' : 'INVOICE';
  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(invoiceTitle, 50, 50, { align: 'right' });

  let rightY = 75;
  doc
    .fillColor(grayColor)
    .font('Helvetica')
    .fontSize(9)
    .text(`Invoice No: ${invoiceNum}`, 50, rightY, { align: 'right' });
  rightY += 14;
  doc.text(`Invoice Date: ${invoiceDateStr}`, 50, rightY, { align: 'right' });
  rightY += 14;
  doc.text(`Payment Mode: ${paymentModeStr}`, 50, rightY, { align: 'right' });
  if (hsnCode && isGstEnabled) {
    rightY += 14;
    doc.text(`HSN / SAC: ${hsnCode}`, 50, rightY, { align: 'right' });
  }

  // Separator
  doc.moveTo(50, 145).lineTo(550, 145).lineWidth(1).strokeColor(grayColor).stroke();

  // --- ADDRESSES ---
  const addrY = 160;
  const custName =
    orderData.customerName || (orderData.shippingAddress as any)?.name || 'Valued Customer';

  const shippingAddrStr =
    typeof orderData.shippingAddress === 'string'
      ? orderData.shippingAddress
      : [
          (orderData.shippingAddress as any)?.address,
          (orderData.shippingAddress as any)?.locality,
          (orderData.shippingAddress as any)?.city,
          (orderData.shippingAddress as any)?.state,
          (orderData.shippingAddress as any)?.pincode,
        ]
          .filter(Boolean)
          .join(', ') || 'Address on file';

  // Billed To
  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('BILLED TO (CUSTOMER):', 50, addrY);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(custName, 50, addrY + 15);

  // Shipped To
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10).text('SHIPPED TO:', 300, addrY);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(custName, 300, addrY + 15);
  doc
    .fillColor(grayColor)
    .font('Helvetica')
    .fontSize(9)
    .text(shippingAddrStr, 300, addrY + 30, { width: 250 });

  // --- TABLE HEADER ---
  const tableTop = addrY + 90;
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9);

  const cgstRatePercent = (cgstRate * 100).toFixed(1);
  const sgstRatePercent = (sgstRate * 100).toFixed(1);
  const gstRatePercent = (gstRate * 100).toFixed(1);

  if (!isGstEnabled) {
    doc.text('ITEM DESIGN CURATION', 50, tableTop);
    doc.text('QTY', 300, tableTop, { align: 'center', width: 40 });
    doc.text('UNIT PRICE', 360, tableTop, { align: 'right', width: 80 });
    doc.text('TOTAL', 460, tableTop, { align: 'right', width: 90 });
  } else if (isInterState) {
    doc.text('ITEM DESIGN CURATION', 50, tableTop);
    doc.text('QTY', 250, tableTop, { align: 'center', width: 30 });
    doc.text('UNIT PRICE', 290, tableTop, { align: 'right', width: 70 });
    doc.text(`IGST (${gstRatePercent}%)`, 380, tableTop, { align: 'right', width: 70 });
    doc.text('TOTAL', 470, tableTop, { align: 'right', width: 80 });
  } else {
    doc.text('ITEM DESIGN CURATION', 50, tableTop);
    doc.text('QTY', 230, tableTop, { align: 'center', width: 30 });
    doc.text('UNIT PRICE', 270, tableTop, { align: 'right', width: 60 });
    doc.text(`CGST(${cgstRatePercent}%)`, 340, tableTop, { align: 'right', width: 65 });
    doc.text(`SGST(${sgstRatePercent}%)`, 415, tableTop, { align: 'right', width: 65 });
    doc.text('TOTAL', 490, tableTop, { align: 'right', width: 60 });
  }

  doc
    .moveTo(50, tableTop + 15)
    .lineTo(550, tableTop + 15)
    .lineWidth(0.5)
    .strokeColor(lightGray)
    .stroke();

  // --- TABLE ROWS ---
  let y = tableTop + 25;
  doc.font('Helvetica').fontSize(9);

  const items = Array.isArray(orderData.items) ? orderData.items : [];
  items.forEach((item: any) => {
    const qty = Number(item.quantity || item.qty || 1);
    const price = Number(item.price || 0);
    const lineGross = price * qty;
    const title = item.name || item.title || 'Product';

    let unitBase = price;
    let lineTotal = lineGross;
    let cgstAmt = 0;
    let sgstAmt = 0;
    let igstAmt = 0;

    if (isGstEnabled) {
      if (isTaxInclusive) {
        unitBase = price / (1 + gstRate);
        const lineBase = lineGross / (1 + gstRate);
        const lineTax = lineGross - lineBase;
        if (isInterState) {
          igstAmt = lineTax;
        } else {
          cgstAmt = lineTax * (cgstRate / gstRate);
          sgstAmt = lineTax * (sgstRate / gstRate);
        }
        lineTotal = lineGross;
      } else {
        unitBase = price;
        const lineTax = lineGross * gstRate;
        if (isInterState) {
          igstAmt = lineTax;
        } else {
          cgstAmt = lineTax * (cgstRate / gstRate);
          sgstAmt = lineTax * (sgstRate / gstRate);
        }
        lineTotal = lineGross + lineTax;
      }
    }

    doc.fillColor(textColor).font('Helvetica-Bold');

    if (!isGstEnabled) {
      doc.text(title, 50, y, { width: 240 });
      doc.fillColor(grayColor).font('Helvetica');
      doc.text(qty.toString(), 300, y, { align: 'center', width: 40 });
      doc.text(`Rs. ${price.toFixed(2)}`, 360, y, { align: 'right', width: 80 });
      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .text(`Rs. ${lineTotal.toFixed(2)}`, 460, y, { align: 'right', width: 90 });
    } else if (isInterState) {
      doc.text(title, 50, y, { width: 190 });
      doc.fillColor(grayColor).font('Helvetica');
      doc.text(qty.toString(), 250, y, { align: 'center', width: 30 });
      doc.text(`Rs. ${unitBase.toFixed(2)}`, 290, y, { align: 'right', width: 70 });
      doc.text(`Rs. ${igstAmt.toFixed(2)}`, 380, y, { align: 'right', width: 70 });
      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .text(`Rs. ${lineTotal.toFixed(2)}`, 470, y, { align: 'right', width: 80 });
    } else {
      doc.text(title, 50, y, { width: 170 });
      doc.fillColor(grayColor).font('Helvetica');
      doc.text(qty.toString(), 230, y, { align: 'center', width: 30 });
      doc.text(`Rs. ${unitBase.toFixed(2)}`, 270, y, { align: 'right', width: 60 });
      doc.text(`Rs. ${cgstAmt.toFixed(2)}`, 340, y, { align: 'right', width: 65 });
      doc.text(`Rs. ${sgstAmt.toFixed(2)}`, 415, y, { align: 'right', width: 65 });
      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .text(`Rs. ${lineTotal.toFixed(2)}`, 490, y, { align: 'right', width: 60 });
    }

    y += 20;
  });

  doc.moveTo(50, y).lineTo(550, y).lineWidth(0.5).strokeColor(lightGray).stroke();
  y += 10;

  // --- SUBTOTALS ---
  const subtotalVal = Number(orderData.subtotal || 0);
  const discountVal = Number((orderData as any).discount || 0);
  const shippingVal = Number(orderData.shipping || (orderData as any).shippingFee || 0);
  const platformFeeVal = Number((orderData as any).platformFee || 0);
  const totalVal = Number(orderData.total || 0);

  doc.fillColor(grayColor).font('Helvetica-Bold').fontSize(9);
  doc.text('Gross Subtotal:', 350, y, { align: 'right', width: 100 });
  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .text(`Rs. ${subtotalVal.toFixed(2)}`, 460, y, { align: 'right', width: 90 });
  y += 15;

  if (discountVal > 0) {
    doc.fillColor(grayColor).text('Coupon Discount:', 350, y, { align: 'right', width: 100 });
    doc
      .fillColor(textColor)
      .text(`- Rs. ${discountVal.toFixed(2)}`, 460, y, { align: 'right', width: 90 });
    y += 15;
  }

  if (shippingVal > 0) {
    doc.fillColor(grayColor).text('Shipping Fee:', 350, y, { align: 'right', width: 100 });
    doc
      .fillColor(textColor)
      .text(`Rs. ${shippingVal.toFixed(2)}`, 460, y, { align: 'right', width: 90 });
    y += 15;
  }

  if (platformFeeVal > 0) {
    doc.fillColor(grayColor).text('Platform Fee:', 350, y, { align: 'right', width: 100 });
    doc
      .fillColor(textColor)
      .text(`Rs. ${platformFeeVal.toFixed(2)}`, 460, y, { align: 'right', width: 90 });
    y += 15;
  }

  if (!isTaxInclusive && isGstEnabled && taxSnap && Number(taxSnap.taxAmount) > 0) {
    doc.fillColor(grayColor).text('Tax (GST):', 350, y, { align: 'right', width: 100 });
    doc
      .fillColor(textColor)
      .text(`Rs. ${Number(taxSnap.taxAmount).toFixed(2)}`, 460, y, { align: 'right', width: 90 });
    y += 15;
  }

  doc.moveTo(350, y).lineTo(550, y).lineWidth(1).strokeColor(textColor).stroke();
  y += 10;

  // Grand Total
  const totalLabel = isGstEnabled
    ? isTaxInclusive
      ? 'GRAND TOTAL (Inclusive of Taxes):'
      : 'GRAND TOTAL (Taxes Added):'
    : 'GRAND TOTAL:';
  doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10);
  doc.text(totalLabel, 220, y, { align: 'right', width: 230 });
  doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(12);
  doc.text(`Rs. ${totalVal.toFixed(2)}`, 460, y - 1, { align: 'right', width: 90 });
  y += 25;

  // --- TAX BREAKDOWN (Only when GST is enabled) ---
  if (isGstEnabled) {
    y += 10;
    const boxHeight = isInterState ? 65 : 75;
    doc.rect(50, y, 250, boxHeight).fillColor('#f9fafb').fill();
    doc
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('GST TAX ASSESSMENT BREAKDOWN', 60, y + 10);

    const taxableBaseVal = Number(
      taxSnap?.taxableAmount ??
        (isTaxInclusive
          ? Math.max(0, subtotalVal - discountVal) / (1 + gstRate)
          : Math.max(0, subtotalVal - discountVal)),
    );
    const totalTaxVal = Number(
      taxSnap?.taxAmount ??
        (isTaxInclusive
          ? Math.max(0, subtotalVal - discountVal) - taxableBaseVal
          : Math.max(0, subtotalVal - discountVal) * gstRate),
    );

    doc
      .fillColor(grayColor)
      .font('Helvetica')
      .text('Taxable Basic Value:', 60, y + 25);
    doc
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .text(`Rs. ${taxableBaseVal.toFixed(2)}`, 200, y + 25, { width: 90, align: 'right' });

    if (isInterState) {
      const igstVal = Number(taxSnap?.igst ?? totalTaxVal);
      doc
        .fillColor(grayColor)
        .font('Helvetica')
        .text(`Integrated IGST (${gstRatePercent}%):`, 60, y + 38);
      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .text(`Rs. ${igstVal.toFixed(2)}`, 200, y + 38, { width: 90, align: 'right' });

      doc
        .moveTo(60, y + 50)
        .lineTo(290, y + 50)
        .dash(2, { space: 2 })
        .strokeColor(lightGray)
        .stroke();
      doc.undash();

      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .text('Total Assessment Taxes:', 60, y + 54);
      doc
        .fillColor(brandColor)
        .font('Helvetica-Bold')
        .text(`Rs. ${totalTaxVal.toFixed(2)}`, 200, y + 54, { width: 90, align: 'right' });
    } else {
      const sgstVal = Number(taxSnap?.sgst ?? totalTaxVal * (sgstRate / gstRate));
      const cgstVal = Number(taxSnap?.cgst ?? totalTaxVal * (cgstRate / gstRate));

      doc
        .fillColor(grayColor)
        .font('Helvetica')
        .text(`State SGST (${sgstRatePercent}%):`, 60, y + 38);
      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .text(`Rs. ${sgstVal.toFixed(2)}`, 200, y + 38, { width: 90, align: 'right' });

      doc
        .fillColor(grayColor)
        .font('Helvetica')
        .text(`Central CGST (${cgstRatePercent}%):`, 60, y + 51);
      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .text(`Rs. ${cgstVal.toFixed(2)}`, 200, y + 51, { width: 90, align: 'right' });

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
        .text(`Rs. ${totalTaxVal.toFixed(2)}`, 200, y + 68, { width: 90, align: 'right' });
    }
  }

  // --- FOOTER ---
  const footerStoreName = storeName;
  const footerEmail =
    storeSnap?.email ||
    settings?.general?.supportEmail ||
    settings?.contact?.email ||
    storeConfig.contact.email ||
    '';
  const defaultFooter = `This is a secure computer generated ${isGstEnabled ? 'tax invoice' : 'invoice'} issued under ${footerStoreName} regulations and requires no physical signatures.${footerEmail ? ` For inquiry, reach ${footerEmail}.` : ''}`;
  const footerText = invoiceFooter || defaultFooter;
  doc.fillColor(lightGray).font('Helvetica').fontSize(8).text(footerText, 50, 720, {
    align: 'center',
    width: 500,
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
