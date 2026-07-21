import handlebars from 'handlebars';
import logger from '../../config/logger';
import EmailTemplate from '../../models/EmailTemplate';
import { getBackendUrl } from '../../utils/getBackendUrl';
import { getLuxuryEmailWrapper } from '../../utils/email/emailTemplates';

// Initialize Handlebars helpers once
handlebars.registerHelper('formatCurrency', function (value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
});

handlebars.registerHelper('formatDate', function (dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

export class TemplateRenderer {
  public static async render(
    templateName: string,
    data: Record<string, any>,
  ): Promise<{ subject: string; html: string }> {
    let htmlContent: string;
    let subjectLine = data.subject || 'Notification';

    try {
      // 1. Database Template Fallback
      const dbTemplate = await EmailTemplate.findOne({ name: templateName, isActive: true });
      if (dbTemplate) {
        htmlContent = dbTemplate.htmlContent;
        subjectLine = this.compileString(dbTemplate.subjectLine, data);
      } else {
        // 2. Filesystem Template Fallback
        try {
          const { compileTemplate } = require('../../utils/email/templateEngine');
          htmlContent = compileTemplate(templateName, data);
        } catch (_fileErr) {
          // 3. Default Template Fallback
          logger.warn(`[TEMPLATE RENDERER] Template "${templateName}" not found. Using default.`);
          htmlContent = `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>${subjectLine}</h2>
              <p>You have a new system notification.</p>
              <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
          `;
        }
      }

      // Compile the HTML content with data
      htmlContent = this.compileString(htmlContent, data);

      // Add Unsubscribe Link if marketing
      if (data.type === 'marketing' && data.email) {
        const backendUrl = getBackendUrl();
        const unsubscribeLink = `${backendUrl}/api/notifications/unsubscribe?email=${encodeURIComponent(data.email)}`;
        htmlContent = this.compileString(htmlContent, { unsubscribe_link: unsubscribeLink });
      }

      // Apply Luxury Wrapper if plain HTML
      if (
        htmlContent &&
        !htmlContent.trim().toLowerCase().startsWith('<!doctype html') &&
        !htmlContent.trim().toLowerCase().startsWith('<html')
      ) {
        htmlContent = getLuxuryEmailWrapper(subjectLine, htmlContent);
      }

      return { subject: subjectLine, html: htmlContent };
    } catch (error) {
      // 4. Error Fallback
      logger.error(`[TEMPLATE RENDERER] Fatal error rendering template ${templateName}:`, error);
      throw new Error(`Template rendering failed for ${templateName}`, { cause: error });
    }
  }

  private static compileString(templateStr: string, data: Record<string, any>): string {
    try {
      const template = handlebars.compile(templateStr);
      return template(data);
    } catch (err) {
      logger.error('[TEMPLATE RENDERER] Handlebars compilation error:', err);
      return templateStr;
    }
  }
}
