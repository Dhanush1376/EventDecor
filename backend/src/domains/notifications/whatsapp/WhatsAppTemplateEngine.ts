import { AutomationContext, VariableInfo } from './types';
import WhatsAppTemplate, { IWhatsAppTemplate } from '../../../models/WhatsAppTemplate';

type VariableResolver = (ctx: AutomationContext, index?: number) => any;

export class WhatsAppTemplateEngine {
  private static variableRegistry: Map<string, { resolver: VariableResolver; info: VariableInfo }> =
    new Map();

  static initialize() {
    this.register('order_number', (ctx) => ctx.order?.orderNumber || ctx.order?._id, {
      description: 'The unique order identifier',
      example: '#SAC-2026-1847',
      group: 'order',
    });
    this.register(
      'customer_name',
      (ctx) => ctx.order?.shippingAddress?.name || ctx.order?.user?.name || 'Customer',
      {
        description: 'Customer full name',
        example: 'Priya Sharma',
        group: 'customer',
      },
    );
    this.register(
      'customer_phone',
      (ctx) => ctx.order?.shippingAddress?.phone || ctx.order?.user?.phone || 'N/A',
      {
        description: 'Customer phone number',
        example: '+919876543210',
        group: 'customer',
      },
    );
    this.register('grand_total', (ctx) => `₹${ctx.order?.total || 0}`, {
      description: 'Total order amount including taxes and shipping',
      example: '₹2500',
      group: 'order',
    });
    this.register(
      'products',
      (ctx) => {
        if (!ctx.order?.items) return '';
        return ctx.order.items.map((i: any) => `- ${i.quantity}x ${i.title}`).join('\n');
      },
      {
        description: 'List of ordered products and quantities',
        example: '- 2x Red Roses\n- 1x Decor Pack',
        group: 'order',
      },
    );
    this.register('tracking_link', (ctx) => ctx.order?.qrCodeData || 'N/A', {
      description: 'Public tracking URL',
      example: 'https://siriarts.com/track/123?token=abc',
      group: 'shipping',
    });
  }

  static register(
    key: string,
    resolver: VariableResolver,
    info: Pick<VariableInfo, 'description' | 'example' | 'group'>,
  ): void {
    this.variableRegistry.set(key, { resolver, info: { key, ...info } });
  }

  static async getTemplate(templateId?: string): Promise<IWhatsAppTemplate | null> {
    if (!templateId) return null;
    return await WhatsAppTemplate.findById(templateId);
  }

  static async render(
    template: IWhatsAppTemplate,
    context: AutomationContext,
    badges: string[],
    _sections: any[],
  ): Promise<string> {
    // 1. Simple Handlebars-like replacement
    let rendered = template.bodyTemplate;

    // Replace variables
    this.variableRegistry.forEach(({ resolver }, key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const val = resolver(context) || '';
      rendered = rendered.replace(regex, String(val));
    });

    // 2. Prepend Badges
    const badgeStr = badges.length > 0 ? `${badges.join(' | ')}\n━━━━━━━━━━━━━━━━━━━━━\n` : '';

    // 3. Assemble sections
    // (Simplified for this stub)

    return `${badgeStr}${rendered}`;
  }

  static getAvailableVariables(): VariableInfo[] {
    return Array.from(this.variableRegistry.values()).map((v) => v.info);
  }
}

// Initialize registry on load
WhatsAppTemplateEngine.initialize();
