import { AutomationContext, VariableInfo } from './types';
import WhatsAppTemplate, { IWhatsAppTemplate } from '../../../models/WhatsAppTemplate';
import logger from '../../../config/logger';

type VariableResolver = (ctx: AutomationContext, index?: number) => any;

export class WhatsAppTemplateEngine {
  private static variableRegistry: Map<string, { resolver: VariableResolver; info: VariableInfo }> =
    new Map();

  static initialize() {
    // 1. System & Brand Variables
    this.register('companyName', (ctx) => ctx.storeSettings?.general?.storeName || 'Our Store', {
      description: 'The store or brand name',
      example: 'Siri Arts & Crafts',
      group: 'system',
    });
    this.register(
      'website',
      (ctx) => ctx.storeSettings?.general?.baseUrl || process.env.FRONTEND_URL || '',
      {
        description: 'The store website URL',
        example: 'https://example.com',
        group: 'system',
      },
    );
    this.register('supportNumber', (ctx) => ctx.storeSettings?.general?.contactPhone || '', {
      description: 'Customer support phone number',
      example: '+919876543210',
      group: 'system',
    });
    this.register('address', (ctx) => ctx.storeSettings?.general?.address || '', {
      description: 'Physical store or office address',
      example: '123 Main St, City',
      group: 'address',
    });

    // 2. Customer Variables
    this.register(
      'customer_name',
      (ctx) =>
        ctx.order?.shippingAddress?.name || ctx.order?.user?.name || ctx.user?.name || 'Customer',
      {
        description: 'Customer full name',
        example: 'Priya Sharma',
        group: 'customer',
      },
    );
    this.register(
      'customer_phone',
      (ctx) =>
        ctx.order?.shippingAddress?.phone || ctx.order?.user?.phone || ctx.user?.phone || 'N/A',
      {
        description: 'Customer phone number',
        example: '+919876543210',
        group: 'customer',
      },
    );
    this.register(
      'walletBalance',
      (ctx) => `${ctx.storeSettings?.general?.currency || '₹'}${ctx.user?.walletBalance || 0}`,
      {
        description: 'Customer wallet balance',
        example: '₹500',
        group: 'customer',
      },
    );

    // 3. Order & Payment Variables
    this.register(
      'order_number',
      (ctx) =>
        `${ctx.storeSettings?.general?.baseUrl || process.env.FRONTEND_URL || 'https://example.com'}/order/${ctx.order?._id || ''}`,
      {
        description: 'Link to the order tracking page',
        example: 'https://example.com/order/60b8d295...',
        group: 'order',
      },
    );
    this.register(
      'grand_total',
      (ctx) => `${ctx.storeSettings?.general?.currency || '₹'}${ctx.order?.total || 0}`,
      {
        description: 'Total order amount including taxes and shipping',
        example: '₹2500',
        group: 'order',
      },
    );
    this.register('paymentMethod', (ctx) => ctx.order?.paymentMethod || 'Online', {
      description: 'Order payment method',
      example: 'UPI',
      group: 'order',
    });
    this.register(
      'discount',
      (ctx) => `${ctx.storeSettings?.general?.currency || '₹'}${ctx.order?.discount || 0}`,
      {
        description: 'Discount applied to order',
        example: '₹250',
        group: 'order',
      },
    );
    this.register('coupon', (ctx) => ctx.order?.couponCode || 'None', {
      description: 'Coupon code applied',
      example: 'WELCOME10',
      group: 'order',
    });
    this.register(
      'refundAmount',
      (ctx) => `${ctx.storeSettings?.general?.currency || '₹'}${ctx.order?.refundAmount || 0}`,
      {
        description: 'Amount refunded to the customer',
        example: '₹500',
        group: 'order',
      },
    );
    this.register(
      'invoiceLink',
      (ctx) => `${process.env.BACKEND_URL}/api/v1/documents/invoice/${ctx.order?._id}`,
      {
        description: 'Direct link to download invoice PDF',
        example: 'https://api.example.com/api/v1/documents/invoice/123',
        group: 'order',
      },
    );

    // 4. Product Variables
    this.register(
      'products',
      (ctx) => {
        if (!ctx.order?.items) return '';
        return ctx.order.items
          .map((i: any) => {
            const product = ctx.products?.find((p: any) => String(p._id) === String(i.productId));
            const slug = product?.slug ? product.slug : i.productId;
            const link = `${ctx.storeSettings?.general?.baseUrl || process.env.FRONTEND_URL || 'https://example.com'}/product/${slug}`;
            return `- ${i.quantity}x ${i.title}\n  🔗 ${link}`;
          })
          .join('\n\n');
      },
      {
        description: 'List of ordered products and quantities',
        example: '- 2x Red Roses\n- 1x Decor Pack',
        group: 'product',
      },
    );
    this.register(
      'productName',
      (ctx) => ctx.order?.items?.[0]?.title || ctx.products?.[0]?.name || 'Product',
      {
        description: 'Primary product name',
        example: 'Red Roses Bouquet',
        group: 'product',
      },
    );

    // 5. Shipping & Logistics Variables
    this.register('tracking_link', (ctx) => ctx.order?.trackingUrl || 'N/A', {
      description: 'Public courier tracking URL',
      example: 'https://delhivery.com/track/123456',
      group: 'shipping',
    });
    this.register(
      'estimatedDelivery',
      (ctx) =>
        ctx.order?.estimatedDeliveryDate
          ? new Date(ctx.order.estimatedDeliveryDate).toLocaleDateString()
          : 'N/A',
      {
        description: 'Estimated delivery date',
        example: '25 Oct 2023',
        group: 'shipping',
      },
    );

    // 6. Booking Variables
    this.register(
      'bookingDate',
      (ctx) => (ctx.booking?.date ? new Date(ctx.booking.date).toLocaleDateString() : 'N/A'),
      {
        description: 'Event booking date',
        example: '15 Nov 2023',
        group: 'order', // Using 'order' as fallback for booking related
      },
    );
    this.register('bookingTime', (ctx) => ctx.booking?.time || 'N/A', {
      description: 'Event booking time',
      example: '18:00',
      group: 'order',
    });
    this.register('eventVenue', (ctx) => ctx.booking?.venue || 'N/A', {
      description: 'Event venue address',
      example: 'Taj Banjara, Hyderabad',
      group: 'address',
    });

    // 7. Engagement Variables
    this.register(
      'reviewLink',
      (ctx) =>
        `${ctx.storeSettings?.general?.baseUrl || process.env.FRONTEND_URL || 'https://example.com'}/review/${ctx.order?._id}`,
      {
        description: 'Link for customer to leave a review',
        example: 'https://example.com/review/123',
        group: 'system',
      },
    );
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

    // Detect missing variables
    const matches = rendered.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    if (matches) {
      matches.forEach((match) => {
        const varName = match.replace(/[{}]/g, '');
        if (!this.variableRegistry.has(varName)) {
          logger.warn(
            `[WhatsAppTemplateEngine] Unknown variable ${varName} used in template ${template.name}`,
          );
        }
      });
    }

    // Replace known variables
    this.variableRegistry.forEach(({ resolver }, key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const val = resolver(context) || '';
      rendered = rendered.replace(regex, String(val));
    });

    // Fill remaining unknown variables with empty string to prevent sending raw {{var}} to customer
    rendered = rendered.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, '');

    // 2. Prepend Badges
    const badgeStr = badges.length > 0 ? `${badges.join(' | ')}\n━━━━━━━━━━━━━━━━━━━━━\n` : '';

    return `${badgeStr}${rendered}`;
  }

  static getAvailableVariables(): VariableInfo[] {
    return Array.from(this.variableRegistry.values()).map((v) => v.info);
  }
}

// Initialize registry on load
WhatsAppTemplateEngine.initialize();
