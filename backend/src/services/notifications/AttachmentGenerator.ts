import logger from '../../config/logger';
import { generateInvoicePDF } from '../../utils/pdfGenerator'; // Existing PDF generator

export class AttachmentGenerator {
  /**
   * Generates a PDF invoice attachment.
   */
  public static async generateInvoice(
    order: any,
  ): Promise<{ filename: string; content: Buffer; contentType: string } | null> {
    try {
      const buffer = await generateInvoicePDF(order);
      return {
        filename: `Invoice_${order.invoiceNumber || order._id}.pdf`,
        content: buffer,
        contentType: 'application/pdf',
      };
    } catch (error) {
      logger.error(
        `[ATTACHMENT GENERATOR] Failed to generate invoice PDF for order ${order._id}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Generates a CSV data report.
   */
  public static async generateCsvReport(
    data: any[],
    filename: string,
  ): Promise<{ filename: string; content: Buffer; contentType: string } | null> {
    try {
      if (!data || data.length === 0) return null;

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map((row) =>
        Object.values(row)
          .map((v) => `"${v}"`)
          .join(','),
      );
      const csv = [headers, ...rows].join('\n');

      return {
        filename: `${filename}.csv`,
        content: Buffer.from(csv, 'utf-8'),
        contentType: 'text/csv',
      };
    } catch (error) {
      logger.error(`[ATTACHMENT GENERATOR] Failed to generate CSV report ${filename}:`, error);
      return null;
    }
  }
}
