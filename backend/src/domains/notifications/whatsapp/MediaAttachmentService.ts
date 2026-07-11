import logger from '../../../config/logger';

export class MediaAttachmentService {
  static async generateInvoice(orderId: string): Promise<string> {
    logger.info(`[MediaAttachmentService] Generating Invoice for order ${orderId}`);
    // Stub: Integrate with existing InvoiceService
    return `https://siriarts.in/api/v1/documents/invoice/${orderId}.pdf`;
  }

  static async generateShippingLabel(orderId: string): Promise<string> {
    logger.info(`[MediaAttachmentService] Generating Shipping Label for order ${orderId}`);
    return `https://siriarts.in/api/v1/documents/label/${orderId}.pdf`;
  }

  static async generatePackingSlip(orderId: string): Promise<string> {
    logger.info(`[MediaAttachmentService] Generating Packing Slip for order ${orderId}`);
    return `https://siriarts.in/api/v1/documents/packing-slip/${orderId}.pdf`;
  }

  static async generateWarehouseQR(orderId: string): Promise<string> {
    logger.info(`[MediaAttachmentService] Generating Warehouse QR for order ${orderId}`);
    return `https://siriarts.in/api/v1/documents/qr/${orderId}.png`;
  }

  static async getProductThumbnails(items: any[]): Promise<string[]> {
    return items.map((i) => i.imageSrc).filter(Boolean);
  }

  static async processMediaJob(job: any): Promise<void> {
    // BullMQ worker handler for async media generation
    const { orderId, types } = job.data;
    logger.info(`[MediaAttachmentService] Processing media job for ${orderId}: ${types.join(',')}`);
  }
}
