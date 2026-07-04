import PDFDocument from 'pdfkit';
import fs from 'fs';
import { BarcodeService } from './BarcodeService';
import { QRCodeService } from './QRCodeService';

export class LabelService {
  /**
   * Generates a printable product label PDF
   * Contains: Product Name, SKU, Barcode, and QR Code
   */
  static async generateProductLabel(
    productName: string,
    sku: string,
    productUuid: string,
    outputPath: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const doc = new PDFDocument({
            size: [288, 144], // 4x2 inches at 72 dpi
            margin: 10,
          });

          const writeStream = fs.createWriteStream(outputPath);
          doc.pipe(writeStream);

          // Generate Barcode & QR Code Buffers
          const barcodeBuffer = await BarcodeService.generateCode128Buffer(sku);
          const qrPayload = QRCodeService.generateProductQrPayload(productUuid, sku);
          const qrBuffer = await QRCodeService.generateQrBuffer(qrPayload);

          // Draw Product Name
          doc.fontSize(12).font('Helvetica-Bold').text(productName.substring(0, 40), 10, 10, {
            width: 200,
            align: 'left',
          });

          // Draw SKU text
          doc.fontSize(10).font('Helvetica').text(`SKU: ${sku}`, 10, 30);

          // Draw QR Code (Top Right)
          doc.image(qrBuffer, 210, 10, { width: 60, height: 60 });

          // Draw Barcode (Bottom span)
          doc.image(barcodeBuffer, 10, 70, { width: 268, height: 50 });

          doc.end();

          writeStream.on('finish', () => {
            resolve(outputPath);
          });

          writeStream.on('error', (err) => {
            reject(err);
          });
        } catch (error) {
          reject(error);
        }
      })();
    });
  }

  /**
   * Generates a Package Shipping Label PDF
   */
  static async generatePackageLabel(
    orderNumber: string,
    packageId: string,
    orderId: string,
    shippingAddress: any,
    courierName: string,
    awbNumber: string,
    weight: number,
    outputPath: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const doc = new PDFDocument({
            size: [288, 432], // 4x6 inches at 72 dpi
            margin: 15,
          });

          const writeStream = fs.createWriteStream(outputPath);
          doc.pipe(writeStream);

          // Generate AWB Barcode & Package QR
          const awbBarcodeBuffer = await BarcodeService.generateCode128Buffer(awbNumber);
          const qrPayload = QRCodeService.generatePackageQrPayload(packageId, orderId);
          const qrBuffer = await QRCodeService.generateQrBuffer(qrPayload);

          // Header
          doc.fontSize(14).font('Helvetica-Bold').text('SHIPPING LABEL', { align: 'center' });
          doc.moveDown(0.5);

          // Courier & Order Info
          doc.fontSize(10).font('Helvetica-Bold').text(`Courier: ${courierName}`);
          doc.font('Helvetica').text(`Order: ${orderNumber}`);
          doc.text(`Weight: ${weight} kg`);
          doc.moveDown(1);

          // Shipping Address
          doc.font('Helvetica-Bold').text('To:');
          doc.font('Helvetica').text(shippingAddress.name);
          doc.text(shippingAddress.address);
          doc.text(
            `${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}`,
          );
          doc.text(`Ph: ${shippingAddress.phone}`);
          doc.moveDown(1);

          // AWB Barcode
          doc.image(awbBarcodeBuffer, 15, 200, { width: 258, height: 50 });
          doc.font('Helvetica-Bold').text(awbNumber, 15, 255, { align: 'center', width: 258 });

          // Package QR for internal warehouse scanning (bottom right)
          doc.image(qrBuffer, 210, 350, { width: 60, height: 60 });
          doc.fontSize(8).text('Internal Scan', 210, 415, { width: 60, align: 'center' });

          doc.end();

          writeStream.on('finish', () => {
            resolve(outputPath);
          });

          writeStream.on('error', (err) => {
            reject(err);
          });
        } catch (error) {
          reject(error);
        }
      })();
    });
  }
}
