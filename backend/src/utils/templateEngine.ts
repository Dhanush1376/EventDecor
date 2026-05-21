import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger';

// Helper to register partials and helpers if needed
handlebars.registerHelper('formatCurrency', function(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
});

handlebars.registerHelper('formatDate', function(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

export const compileTemplate = (templateName: string, data: Record<string, any>) => {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template ${templateName} not found at ${templatePath}`);
    }
    const source = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(source);
    return template(data);
  } catch (error) {
    logger.error(`Error compiling template ${templateName}:`, error);
    return '';
  }
};
