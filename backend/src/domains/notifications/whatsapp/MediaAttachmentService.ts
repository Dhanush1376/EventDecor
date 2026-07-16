import logger from '../../../config/logger';
import StoreSettings from '../../../models/StoreSettings';
import Order from '../../../models/Order';
import { PdfGenerationService } from './PdfGenerationService';
import { storageService } from '../../../services/storage';

export class MediaAttachmentService {
  /**
   * Helper to get the base backend URL dynamically, avoiding hardcoded domains
   */
  private static async getBaseUrl(): Promise<string> {
    return process.env.BACKEND_URL || 'http://localhost:5000';
  }

  static async generateInvoice(orderId: string): Promise<string> {
    logger.info(`[MediaAttachmentService] Generating Invoice for order ${orderId}`);
    try {
      const order = await Order.findById(orderId).populate('user').lean();
      if (!order) throw new Error('Order not found');

      const storeSettings = await StoreSettings.findOne().lean();

      // 1. Generate PDF buffer
      const pdfBuffer = await PdfGenerationService.generateInvoiceBuffer(order, storeSettings);

      // 2. Upload to Cloudinary (returns secure public URL)
      const uploadResult = await storageService.uploadBuffer(pdfBuffer, {
        folder: 'invoices',
        originalname: `invoice_${order.orderNumber || orderId}.pdf`,
        isVideo: false,
      });

      logger.info(`[MediaAttachmentService] Invoice generated and uploaded: ${uploadResult.url}`);
      return uploadResult.url;
    } catch (error) {
      logger.error(`[MediaAttachmentService] Failed to generate invoice for ${orderId}`, error);
      // Fallback to dynamic endpoint if generation fails
      const baseUrl = await this.getBaseUrl();
      return `${baseUrl}/api/v1/documents/invoice/${orderId}.pdf`;
    }
  }

  static async generateShippingLabel(orderId: string): Promise<string> {
    logger.info(`[MediaAttachmentService] Generating Shipping Label for order ${orderId}`);
    const baseUrl = await this.getBaseUrl();
    return `${baseUrl}/api/v1/documents/label/${orderId}.pdf`;
  }

  static async generatePackingSlip(orderId: string): Promise<string> {
    logger.info(`[MediaAttachmentService] Generating Packing Slip for order ${orderId}`);
    const baseUrl = await this.getBaseUrl();
    return `${baseUrl}/api/v1/documents/packing-slip/${orderId}.pdf`;
  }

  static async generateWarehouseQR(orderId: string): Promise<string> {
    logger.info(`[MediaAttachmentService] Generating Warehouse QR for order ${orderId}`);

    // Instead of just returning a URL, actually generate the Data URL if needed internally,
    // or return the dynamic endpoint that renders it.
    try {
      const baseUrl = await this.getBaseUrl();
      const qrUrl = `${baseUrl}/order/${orderId}`; // The URL the QR code points to

      // If we needed to return the raw base64:
      // const qrBase64 = await QRCode.toDataURL(qrUrl);

      return `${baseUrl}/api/v1/documents/qr/${orderId}.png`;
    } catch (err) {
      logger.error(`[MediaAttachmentService] QR generation failed for ${orderId}`, err);
      const baseUrl = await this.getBaseUrl();
      return `${baseUrl}/api/v1/documents/qr/${orderId}.png`;
    }
  }

  static async getProductThumbnails(items: any[]): Promise<string[]> {
    return items.map((i) => i.imageSrc).filter(Boolean);
  }

  static async processMediaJob(job: any): Promise<void> {
    // BullMQ worker handler for async media generation
    const { orderId, types } = job.data;
    logger.info(`[MediaAttachmentService] Processing media job for ${orderId}: ${types.join(',')}`);

    for (const type of types) {
      switch (type) {
        case 'invoice':
          await this.generateInvoice(orderId);
          break;
        case 'shipping_label':
          await this.generateShippingLabel(orderId);
          break;
        case 'packing_slip':
          await this.generatePackingSlip(orderId);
          break;
        case 'qr_code':
          await this.generateWarehouseQR(orderId);
          break;
      }
    }
  }
}
