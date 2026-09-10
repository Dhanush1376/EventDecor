import { generateInvoicePDF } from '../../../utils/pdfGenerator';
import logger from '../../../config/logger';

export class PdfGenerationService {
  /**
   * Generates a PDF invoice for a given order using the canonical invoice generator
   */
  static async generateInvoiceBuffer(order: any, _storeSettings?: any): Promise<Buffer> {
    try {
      const orderData = order.toObject ? order.toObject() : order;
      return await generateInvoicePDF(orderData);
    } catch (error) {
      logger.error('[PdfGenerationService] Error generating canonical invoice PDF', error);
      throw error;
    }
  }
}
