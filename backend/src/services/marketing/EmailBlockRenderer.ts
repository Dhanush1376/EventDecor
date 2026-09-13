import { IDesignBlock } from '../../models/EmailCampaign';
import { getFrontendUrl } from '../../utils/getFrontendUrl';
import { getBackendUrl } from '../../utils/getBackendUrl';
import storeSettingsService from '../StoreSettingsService';
import logger from '../../config/logger';

export interface IRenderContext {
  customer?: {
    name?: string;
    firstName?: string;
    email?: string;
    totalOrders?: number;
    totalSpent?: number;
    loyaltyTier?: string;
  };
  cart?: {
    items?: Array<{
      title: string;
      imageSrc?: string;
      price: number;
      quantity: number;
      variant?: string;
    }>;
    total?: number;
    url?: string;
  };
  order?: {
    id?: string;
    total?: number;
    status?: string;
    items?: Array<{
      title: string;
      price: number;
      quantity: number;
    }>;
  };
  campaign?: {
    id?: string;
    title?: string;
    discountCode?: string;
    discountValue?: string | number;
    expiryDate?: string;
  };
  trackingToken?: string;
  previewMode?: boolean;
}

const DEFAULT_EMAIL_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export class EmailBlockRenderer {
  /**
   * Replaces dynamic variables: {{customer.firstName | default: "there"}}
   */
  static interpolateVariables(text: string, context: IRenderContext): string {
    if (!text || typeof text !== 'string') return '';

    return text.replace(
      /\{\{\s*([\w.]+)(?:\s*\|\s*default:\s*['"]([^'"]*)['"])?\s*\}\}/g,
      (match, path, fallback) => {
        const parts = path.split('.');
        let val: any = context;
        for (const part of parts) {
          if (val && typeof val === 'object' && part in val) {
            val = val[part];
          } else {
            val = undefined;
            break;
          }
        }

        if (val !== undefined && val !== null && val !== '') {
          return String(val);
        }
        return fallback !== undefined ? fallback : '';
      },
    );
  }

  /**
   * Wraps URLs with tracking redirect and UTM tags
   */
  static wrapUrl(rawUrl: string, context: IRenderContext, blockId?: string): string {
    if (!rawUrl || typeof rawUrl !== 'string') return '#';
    let url = rawUrl.trim();

    // If relative, prepend frontend storefront url
    if (url.startsWith('/')) {
      url = `${getFrontendUrl()}${url}`;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url;
    }

    // Append UTM tags if campaign is provided
    if (context.campaign?.id) {
      try {
        const parsed = new URL(url);
        parsed.searchParams.set('utm_source', 'email');
        parsed.searchParams.set('utm_medium', 'campaign');
        parsed.searchParams.set('utm_campaign', context.campaign.id);
        if (blockId) parsed.searchParams.set('utm_content', blockId);
        url = parsed.toString();
      } catch (_e) {}
    }

    // In preview mode or without trackingToken, return direct link
    if (context.previewMode || !context.trackingToken) {
      return url;
    }

    const backendUrl = getBackendUrl();
    return `${backendUrl}/api/v1/notifications/track/click/${encodeURIComponent(context.trackingToken)}?url=${encodeURIComponent(url)}`;
  }

  /**
   * Generates single block HTML using canonical codebase email styles & default font
   */
  static renderBlock(block: IDesignBlock, context: IRenderContext, storeSettings: any): string {
    const { type, content = {} } = block;

    switch (type) {
      case 'header': {
        const logoUrl = content.logoUrl || storeSettings?.general?.logo;
        const storeName =
          content.storeName || storeSettings?.general?.storeName || 'Siri Arts & Crafts';
        return `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-bottom: 24px; border-bottom: 1px solid #f3f4f6; margin-bottom: 24px;">
            <tr>
              <td align="center">
                ${
                  logoUrl
                    ? `<img src="${logoUrl}" alt="${storeName}" height="40" style="max-height: 40px; border: 0; display: block;" />`
                    : `<h1 style="font-family: ${DEFAULT_EMAIL_FONT}; font-size: 22px; font-weight: 600; color: #111827; margin: 0; letter-spacing: -0.5px; text-align: center;">${storeName}</h1>`
                }
              </td>
            </tr>
          </table>
        `;
      }

      case 'banner': {
        const headline = this.interpolateVariables(content.headline || '', context);
        const subtitle = this.interpolateVariables(content.subtitle || '', context);
        const ctaText = content.ctaText || 'Shop Now';
        const ctaUrl = this.wrapUrl(content.ctaUrl || '/', context, block.id);
        const imageUrl = content.imageUrl;

        return `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 20px 0;">
            ${
              imageUrl
                ? `<tr>
                    <td align="center">
                      <a href="${ctaUrl}" target="_blank" style="text-decoration: none;">
                        <img src="${imageUrl}" alt="${headline}" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;" />
                      </a>
                    </td>
                  </tr>`
                : ''
            }
            <tr>
              <td align="center" style="padding: 24px 20px;">
                ${headline ? `<h2 style="font-family: ${DEFAULT_EMAIL_FONT}; font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">${headline}</h2>` : ''}
                ${subtitle ? `<p style="font-family: ${DEFAULT_EMAIL_FONT}; font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">${subtitle}</p>` : ''}
                ${
                  ctaText
                    ? `<a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #111827; color: #ffffff !important; padding: 12px 24px; font-family: ${DEFAULT_EMAIL_FONT}; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 6px;">${ctaText}</a>`
                    : ''
                }
              </td>
            </tr>
          </table>
        `;
      }

      case 'text': {
        const text = this.interpolateVariables(content.text || '', context);
        return `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
            <tr>
              <td style="font-family: ${DEFAULT_EMAIL_FONT}; font-size: 15px; line-height: 1.6; color: #374151; padding: 4px 0;">
                ${text}
              </td>
            </tr>
          </table>
        `;
      }

      case 'product': {
        const title = content.title || 'Featured Product';
        const price = Number(content.price || 0);
        const oldPrice = content.oldPrice ? Number(content.oldPrice) : null;
        const imageSrc = content.imageSrc || '';
        const productUrl = this.wrapUrl(
          content.slug ? `/product/${content.slug}` : `/products`,
          context,
          block.id,
        );
        const discountPct =
          oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;

        return `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 16px 0; overflow: hidden; background-color: #ffffff;">
            <tr>
              <td width="140" valign="middle" align="center" style="padding: 12px; background-color: #f9fafb;">
                ${imageSrc ? `<img src="${imageSrc}" alt="${title}" width="120" height="120" style="object-fit: cover; border-radius: 4px; display: block; border: 1px solid #e5e7eb;" />` : ''}
              </td>
              <td valign="middle" style="padding: 16px 20px;">
                <div style="font-family: ${DEFAULT_EMAIL_FONT}; font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 6px;">${title}</div>
                <div style="font-family: ${MONO_FONT}; font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 12px;">
                  ₹${price.toLocaleString('en-IN')}
                  ${oldPrice ? `<span style="font-size: 13px; font-weight: normal; color: #9ca3af; text-decoration: line-through; margin-left: 6px;">₹${oldPrice.toLocaleString('en-IN')}</span>` : ''}
                  ${discountPct ? `<span style="font-size: 11px; background-color: #f3f4f6; color: #111827; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 600;">${discountPct}% OFF</span>` : ''}
                </div>
                <a href="${productUrl}" target="_blank" style="display: inline-block; background-color: #111827; color: #ffffff !important; padding: 8px 18px; font-size: 12px; font-weight: 500; text-decoration: none; border-radius: 6px; font-family: ${DEFAULT_EMAIL_FONT};">Shop Now</a>
              </td>
            </tr>
          </table>
        `;
      }

      case 'productGrid': {
        const products = Array.isArray(content.products) ? content.products : [];
        if (products.length === 0) return '';

        let gridHtml = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;"><tr>`;
        products.forEach((prod: any, idx: number) => {
          if (idx > 0 && idx % 2 === 0) {
            gridHtml += `</tr><tr><td height="16" colspan="2"></td></tr><tr>`;
          }
          const price = Number(prod.price || 0);
          const pUrl = this.wrapUrl(
            prod.slug ? `/product/${prod.slug}` : `/products`,
            context,
            `${block.id}-${idx}`,
          );

          gridHtml += `
            <td width="48%" valign="top" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;">
              ${prod.imageSrc ? `<img src="${prod.imageSrc}" alt="${prod.title || ''}" width="200" height="160" style="width: 100%; max-height: 160px; object-fit: cover; border-radius: 4px; display: block; margin-bottom: 12px; border: 1px solid #e5e7eb;" />` : ''}
              <div style="font-family: ${DEFAULT_EMAIL_FONT}; font-size: 13px; font-weight: 600; color: #111827; height: 36px; overflow: hidden; margin-bottom: 6px;">${prod.title || 'Handcrafted Art'}</div>
              <div style="font-family: ${MONO_FONT}; font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 12px;">₹${price.toLocaleString('en-IN')}</div>
              <a href="${pUrl}" target="_blank" style="display: inline-block; background-color: #111827; color: #ffffff !important; padding: 8px 16px; font-size: 12px; font-weight: 500; text-decoration: none; border-radius: 6px; font-family: ${DEFAULT_EMAIL_FONT};">View Details</a>
            </td>
            ${idx % 2 === 0 && idx < products.length - 1 ? `<td width="4%"></td>` : ''}
          `;
        });
        gridHtml += `</tr></table>`;
        return gridHtml;
      }

      case 'cartSummary': {
        const cartItems = context.cart?.items || [];
        const cartTotal = context.cart?.total || 0;
        const returnUrl = this.wrapUrl(context.cart?.url || '/cart', context, block.id);

        if (cartItems.length === 0 && !context.previewMode) return '';

        let itemsHtml = '';
        (cartItems.length > 0
          ? cartItems
          : [
              {
                title: 'Example Decor Piece (Preview)',
                price: 1499,
                quantity: 1,
                variant: 'Standard Gold',
                imageSrc: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300',
              },
            ]
        ).forEach((item) => {
          itemsHtml += `
            <tr>
              <td width="60" style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                ${item.imageSrc ? `<img src="${item.imageSrc}" width="48" height="48" style="object-fit: cover; border-radius: 4px; display: block; border: 1px solid #e5e7eb;" />` : ''}
              </td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-family: ${DEFAULT_EMAIL_FONT}; font-size: 13px; color: #374151;">
                <div style="font-weight: 600; color: #111827;">${item.title}</div>
                ${item.variant ? `<div style="font-size: 12px; color: #6b7280;">Variant: ${item.variant}</div>` : ''}
                <div style="font-size: 12px; color: #6b7280;">Qty: ${item.quantity}</div>
              </td>
              <td align="right" style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-family: ${MONO_FONT}; font-size: 14px; font-weight: 600; color: #111827;">
                ₹${(item.price * item.quantity).toLocaleString('en-IN')}
              </td>
            </tr>
          `;
        });

        return `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <tr>
              <td colspan="3" style="font-family: ${DEFAULT_EMAIL_FONT}; font-size: 16px; font-weight: 600; color: #111827; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                Items Waiting in Your Cart
              </td>
            </tr>
            ${itemsHtml}
            <tr>
              <td colspan="2" align="right" style="padding-top: 14px; font-family: ${DEFAULT_EMAIL_FONT}; font-size: 14px; font-weight: 500; color: #374151;">
                Cart Total:
              </td>
              <td align="right" style="padding-top: 14px; font-family: ${MONO_FONT}; font-size: 16px; font-weight: 700; color: #111827;">
                ₹${(cartTotal || 1499).toLocaleString('en-IN')}
              </td>
            </tr>
            <tr>
              <td colspan="3" align="center" style="padding-top: 20px;">
                <a href="${returnUrl}" target="_blank" style="display: inline-block; background-color: #111827; color: #ffffff !important; padding: 12px 28px; font-family: ${DEFAULT_EMAIL_FONT}; font-size: 13px; font-weight: 500; text-decoration: none; border-radius: 6px;">Return to My Cart</a>
              </td>
            </tr>
          </table>
        `;
      }

      case 'coupon': {
        const code = content.code || context.campaign?.discountCode || 'WELCOME10';
        const discountText = content.discountText || '10% OFF ON YOUR ENTIRE ORDER';
        const expiry = content.expiryText || 'Valid for a limited time';

        return `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
            <tr>
              <td align="center" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px 20px;">
                <span style="display: block; color: #6b7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; font-family: ${DEFAULT_EMAIL_FONT};">EXCLUSIVE OFFER</span>
                <h3 style="color: #111827; font-size: 18px; font-weight: 700; margin: 0 0 14px 0; font-family: ${DEFAULT_EMAIL_FONT};">${discountText}</h3>
                <div style="display: inline-block; background-color: #ffffff; border: 1px solid #d1d5db; padding: 10px 24px; font-family: ${MONO_FONT}; font-size: 20px; font-weight: 700; color: #111827; letter-spacing: 4px; border-radius: 6px; margin-bottom: 8px;">
                  ${code}
                </div>
                <div style="color: #6b7280; font-size: 12px; font-family: ${DEFAULT_EMAIL_FONT}; margin-top: 6px;">${expiry}</div>
              </td>
            </tr>
          </table>
        `;
      }

      case 'button': {
        const label = this.interpolateVariables(content.label || 'Learn More', context);
        const url = this.wrapUrl(content.url || '/', context, block.id);
        const bgColor = content.bgColor || '#111827';
        const textColor = content.textColor || '#ffffff';

        return `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
            <tr>
              <td align="${content.align || 'center'}">
                <a href="${url}" target="_blank" style="display: inline-block; background-color: ${bgColor}; color: ${textColor} !important; padding: 12px 24px; font-family: ${DEFAULT_EMAIL_FONT}; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 6px;">
                  ${label}
                </a>
              </td>
            </tr>
          </table>
        `;
      }

      case 'divider': {
        return `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
            <tr>
              <td style="border-top: 1px solid #f3f4f6;"></td>
            </tr>
          </table>
        `;
      }

      case 'spacer': {
        const height = content.height || 20;
        return `
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td height="${height}" style="line-height: ${height}px; font-size: 0px;">&nbsp;</td>
            </tr>
          </table>
        `;
      }

      case 'footer': {
        const storeName = storeSettings?.general?.storeName || 'Siri Arts & Crafts';
        const supportEmail = storeSettings?.general?.supportEmail || 'support@siriarts.in';
        const backendUrl = getBackendUrl();
        const recipientEmail = context.customer?.email || '';
        const unsubscribeUrl = `${backendUrl}/api/v1/notifications/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;

        return `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-top: 24px; border-top: 1px solid #f3f4f6; margin-top: 32px; font-family: ${DEFAULT_EMAIL_FONT}; font-size: 12px; color: #6b7280; text-align: center; line-height: 1.6;">
            <tr>
              <td align="center">
                <p style="margin: 0 0 6px 0; font-weight: 600; color: #111827;">${storeName}</p>
                <p style="margin: 0 0 8px 0; color: #6b7280;">Need help? Reach us at <a href="mailto:${supportEmail}" style="color: #111827; text-decoration: underline;">${supportEmail}</a></p>
                <p style="margin: 0 0 8px 0; color: #6b7280;">
                  You are receiving this email because you opted in to updates from ${storeName}.
                </p>
                <p style="margin: 0;">
                  <a href="${unsubscribeUrl}" target="_blank" style="color: #6b7280; text-decoration: underline;">Unsubscribe from marketing emails</a>
                </p>
              </td>
            </tr>
          </table>
        `;
      }

      default:
        return '';
    }
  }

  /**
   * Assembles full email document with desktop/mobile outer table wrapping and open-pixel injection
   * Uses canonical codebase email card architecture matching emailTemplates.ts
   */
  static async renderFullEmail(
    blocks: IDesignBlock[],
    context: IRenderContext = {},
    customHtml?: string,
  ): Promise<string> {
    try {
      const storeSettings = await storeSettingsService.getSettings();

      let bodyContent = '';

      if (customHtml && customHtml.trim()) {
        bodyContent = this.interpolateVariables(customHtml, context);
      } else if (blocks && blocks.length > 0) {
        let hasFooter = false;
        bodyContent = blocks
          .map((b) => {
            if (b.type === 'footer') hasFooter = true;
            return this.renderBlock(b, context, storeSettings);
          })
          .join('');

        // Automatically guarantee CAN-SPAM compliant footer if not present
        if (!hasFooter) {
          bodyContent += this.renderBlock(
            { id: 'auto-footer', type: 'footer', content: {} },
            context,
            storeSettings,
          );
        }
      } else {
        bodyContent = `
          <div style="font-family: ${DEFAULT_EMAIL_FONT}; padding: 20px; text-align: center; color: #6b7280;">
            <p>No content specified for this campaign.</p>
          </div>
        `;
      }

      // Open tracking pixel (only when not in preview and trackingToken exists)
      const openPixel =
        !context.previewMode && context.trackingToken
          ? `<img src="${getBackendUrl()}/api/v1/notifications/track/open/${encodeURIComponent(context.trackingToken)}" width="1" height="1" alt="" style="display:none; width:1px; height:1px; border:0;" />`
          : '';

      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
          <title>${context.campaign?.title || 'Special Update'}</title>
          <style type="text/css">
            body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
            table { border-collapse: collapse !important; }
            body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f9fafb; color: #111827; font-family: ${DEFAULT_EMAIL_FONT}; }
            @media screen and (max-width: 600px) {
              .main-card { padding: 24px 16px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 24px 10px; background-color: #f9fafb; font-family: ${DEFAULT_EMAIL_FONT};">
          <center>
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
              <tr>
                <td class="main-card" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 36px 40px; text-align: left;">
                  ${bodyContent}
                  ${openPixel}
                </td>
              </tr>
            </table>
          </center>
        </body>
        </html>
      `;
    } catch (err: any) {
      logger.error(`[EmailBlockRenderer.renderFullEmail] Render error: ${err.message}`);
      return `<div style="font-family: ${DEFAULT_EMAIL_FONT}; padding: 20px; color: #dc2626;">Rendering error: ${err.message}</div>`;
    }
  }
}

export default EmailBlockRenderer;
