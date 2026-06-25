import { PremiumCustomerLayout } from './layouts/PremiumCustomerLayout';
import { OperationalAdminLayout } from './layouts/OperationalAdminLayout';
import logger from '../../config/logger';

export class TemplateRenderer {
  /**
   * Compiles components into a final HTML string wrapped in the appropriate layout.
   */
  public static renderCustomerEmail(contentHtml: string, preheaderText: string = ''): string {
    try {
      return PremiumCustomerLayout(contentHtml, preheaderText);
    } catch (error) {
      logger.error(`[TEMPLATE RENDERER] Failed to render customer email:`, error);
      return contentHtml; // Fallback to raw content if layout fails
    }
  }

  public static renderAdminEmail(contentHtml: string, preheaderText: string = ''): string {
    try {
      return OperationalAdminLayout(contentHtml, preheaderText);
    } catch (error) {
      logger.error(`[TEMPLATE RENDERER] Failed to render admin email:`, error);
      return contentHtml;
    }
  }

  /**
   * Generates a plain text fallback from the generated HTML.
   */
  public static generatePlainText(html: string): string {
    try {
      // Basic HTML stripping. In production, use `html-to-text` package.
      return html
        .replace(/<style[^>]*>.*<\/style>/gi, '') // Remove styles
        .replace(/<script[^>]*>.*<\/script>/gi, '') // Remove scripts
        .replace(/<[^>]+>/g, ' ') // Remove all other tags
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();
    } catch (error) {
      logger.error(`[TEMPLATE RENDERER] Failed to generate plain text:`, error);
      return 'Please view this email in an HTML compatible client.';
    }
  }
}
