import logger from '../../config/logger';

export class AttachmentGenerator {
  /**
   * Generates a PDF invoice attachment (Disabled - invoices not attached to emails).
   */
  public static async generateInvoice(
    _order: any,
  ): Promise<{ filename: string; content: Buffer; contentType: string } | null> {
    return null;
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
