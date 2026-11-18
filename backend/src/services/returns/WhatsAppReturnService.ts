import Order from '../../models/Order';
import Product from '../../models/Product';
import User from '../../models/User';
import ApiError from '../../utils/ApiError';
import storeSettingsService from '../StoreSettingsService';
import { OrderStateMachine } from '../orders/OrderStateMachine';

/**
 * Return & exchange requests are handled manually over WhatsApp.
 *
 * This service only answers "which items of this order may be returned or exchanged" and builds
 * the pre-filled WhatsApp message from server-side order data. It stores nothing: a request
 * exists once the customer presses Send in WhatsApp, not when this message is generated.
 */

export type RequestType = 'return' | 'exchange';

export const RETURN_REASONS = {
  damaged: 'Damaged product',
  defective: 'Defective product',
  wrong_item: 'Wrong item received',
  missing_item: 'Missing item',
  size_variant: 'Size or variant issue',
  other: 'Other',
} as const;

export const RESOLUTIONS = {
  refund: 'Refund',
  replacement: 'Replacement / Exchange',
  discuss: 'Contact me to discuss',
} as const;

export const RESOLUTIONS_BY_TYPE: Record<RequestType, (keyof typeof RESOLUTIONS)[]> = {
  return: ['refund', 'discuss'],
  exchange: ['replacement', 'discuss'],
};

export type ReasonKey = keyof typeof RETURN_REASONS;
export type ResolutionKey = keyof typeof RESOLUTIONS;

export interface WhatsAppRequestInput {
  requestType: RequestType;
  items: { itemId: string; quantity: number }[];
  reason: ReasonKey;
  description?: string;
  preferredResolution: ResolutionKey;
  imageUrls?: string[];
}

export interface OrderItemEligibility {
  itemId: string;
  productId: string | null;
  title: string;
  variant: string | null;
  quantity: number;
  imageSrc: string;
  eligible: boolean;
  ineligibleReason: string | null;
  windowDays: number;
  windowEndsAt: Date | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Digits for wa.me (country code included), or null when the number is not usable. */
export const normalizeWhatsAppNumber = (raw: unknown): string | null => {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
};

const getBusinessWhatsApp = (settings: any): string | null =>
  normalizeWhatsAppNumber(settings?.general?.whatsappNumber) ||
  normalizeWhatsAppNumber(settings?.contact?.whatsappNumber);

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

const formatPhone = (raw: string) => {
  const digits = normalizeWhatsAppNumber(raw);
  if (!digits) return raw;
  return digits.startsWith('91') && digits.length === 12
    ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
    : `+${digits}`;
};

/** Only images uploaded to this store's Cloudinary account may be linked in the message. */
const isOwnUploadUrl = (url: string) => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'res.cloudinary.com' &&
      parsed.pathname.startsWith(`/${cloud}/image/upload/`)
    );
  } catch {
    return false;
  }
};

export class WhatsAppReturnService {
  /**
   * Per-item eligibility for the customer's own order. Throws 404 for orders that do not exist
   * or belong to someone else, so order ids cannot be probed.
   */
  static async getEligibility(orderId: string, userId: string) {
    const order: any = await Order.findOne({ _id: orderId, user: userId }).lean();
    if (!order) throw new ApiError(404, 'Order not found');

    const settings: any = await storeSettingsService.getSettings();
    const policy = settings?.returnsExchanges || {};
    const requestTypes = {
      return: policy.enableReturns !== false,
      exchange: policy.enableExchanges !== false,
    };

    const productIds = order.items.map((i: any) => i.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('isNonRefundable returnSettings title')
      .lean();
    const productsById = new Map(products.map((p: any) => [String(p._id), p]));

    const status = OrderStateMachine.normalizeState(order.orderStatus);
    const isDelivered = status === 'Delivered' || status === 'Settled';
    const isRental = order.orderType === 'rental';
    const deliveredEntry = [...(order.statusHistory || [])]
      .reverse()
      .find((h: any) => h.status === 'Delivered');
    const deliveredAt: Date | null = isDelivered
      ? new Date(deliveredEntry?.timestamp || order.updatedAt || order.createdAt)
      : null;
    const defaultWindowDays = Number(policy.returnWindowDays) || 7;

    const items: OrderItemEligibility[] = order.items.map((item: any) => {
      const product: any = item.productId ? productsById.get(String(item.productId)) : null;
      // The product's current setting decides; the purchase-time snapshot covers deleted products.
      const enabled = product ? !product.isNonRefundable : !item.isNonRefundable;
      const windowDays = Number(product?.returnSettings?.returnWindow) || defaultWindowDays;
      const windowEndsAt = deliveredAt
        ? new Date(deliveredAt.getTime() + windowDays * DAY_MS)
        : null;

      let ineligibleReason: string | null = null;
      if (isRental) ineligibleReason = 'Rental items are returned through the rental flow';
      else if (!enabled) ineligibleReason = 'This item is not eligible for return or exchange';
      else if (!isDelivered) ineligibleReason = 'Available once the order is delivered';
      else if (windowEndsAt && Date.now() > windowEndsAt.getTime())
        ineligibleReason = `The ${windowDays}-day return window has closed`;

      return {
        itemId: String(item._id),
        productId: item.productId ? String(item.productId) : null,
        title: item.title,
        variant: item.variant && item.variant !== 'Default' ? item.variant : null,
        quantity: item.quantity,
        imageSrc: item.imageSrc,
        eligible: ineligibleReason === null,
        ineligibleReason,
        windowDays,
        windowEndsAt,
      };
    });

    const user: any = await User.findById(userId).select('name email phone').lean();
    const rawPhone =
      order.customerPhone || order.shippingPhone || order.shippingAddress?.phone || user?.phone;
    const customer = {
      name: order.customerName || order.shippingAddress?.name || user?.name || 'Customer',
      phone: rawPhone ? formatPhone(rawPhone) : null,
      email: order.customerEmail || order.shippingAddress?.email || user?.email || null,
    };

    return {
      order,
      customer,
      summary: {
        orderId: String(order._id),
        invoiceNumber: order.invoiceNumber || null,
        orderDate: order.createdAt,
        deliveredAt,
      },
      items,
      requestTypes,
      whatsappConfigured: Boolean(getBusinessWhatsApp(settings)),
      settings,
    };
  }

  /**
   * Validates the request against the customer's order and returns the wa.me link with the
   * pre-filled message. Nothing is persisted.
   */
  static async buildRequest(orderId: string, userId: string, input: WhatsAppRequestInput) {
    const { summary, customer, items, requestTypes, settings } = await this.getEligibility(
      orderId,
      userId,
    );

    if (!requestTypes[input.requestType]) {
      throw new ApiError(
        400,
        input.requestType === 'return'
          ? 'Returns are currently not accepted by the store.'
          : 'Exchanges are currently not accepted by the store.',
      );
    }
    if (!RESOLUTIONS_BY_TYPE[input.requestType].includes(input.preferredResolution)) {
      throw new ApiError(400, 'Preferred resolution does not match the request type.');
    }

    const itemsById = new Map(items.map((i) => [i.itemId, i]));
    const selected = input.items.map((requested) => {
      const item = itemsById.get(requested.itemId);
      if (!item) throw new ApiError(400, 'One of the selected items is not part of this order.');
      if (!item.eligible) throw new ApiError(400, `${item.title}: ${item.ineligibleReason}`);
      if (requested.quantity > item.quantity) {
        throw new ApiError(
          400,
          `You can request at most ${item.quantity} of ${item.title} (the quantity ordered).`,
        );
      }
      return { ...item, requestedQuantity: requested.quantity };
    });

    const imageUrls = input.imageUrls || [];
    if (imageUrls.some((url) => !isOwnUploadUrl(url))) {
      throw new ApiError(400, 'Photos must be uploaded through the form.');
    }

    const whatsappDigits = getBusinessWhatsApp(settings);
    if (!whatsappDigits) {
      throw new ApiError(
        503,
        'WhatsApp support is not configured yet. Please contact us by phone or email.',
      );
    }

    // The message travels in a wa.me URL (browser history, WhatsApp's link handling), so it
    // carries only what staff need to find the order. The customer's phone number is already
    // visible to staff as the WhatsApp sender, and their email stays on the order record.
    const customerName = customer.name;

    const storeName = settings?.general?.storeName || 'Siri Arts & Crafts';
    const typeLabel = input.requestType === 'return' ? 'Return' : 'Exchange';
    const description = (input.description || '').trim();

    const lines: string[] = [
      `Hello ${storeName} Team!`,
      '',
      `I would like to request ${input.requestType === 'return' ? 'a return' : 'an exchange'} for my order.`,
      '',
      '*ORDER DETAILS*',
      `Order ID: #${summary.orderId}`,
      ...(summary.invoiceNumber ? [`Invoice: ${summary.invoiceNumber}`] : []),
      `Order Date: ${formatDate(new Date(summary.orderDate))}`,
      '',
      '*CUSTOMER DETAILS*',
      `Name: ${customerName}`,
      '',
      '*PRODUCT DETAILS*',
    ];
    selected.forEach((item, index) => {
      if (selected.length > 1) lines.push(`${index + 1}.`);
      lines.push(`Product: ${item.title}`);
      if (item.variant) lines.push(`Variant: ${item.variant}`);
      lines.push(`Quantity: ${item.requestedQuantity} of ${item.quantity}`);
      if (selected.length > 1 && index < selected.length - 1) lines.push('');
    });
    lines.push(
      '',
      '*REQUEST DETAILS*',
      `Request Type: ${typeLabel}`,
      `Reason: ${RETURN_REASONS[input.reason]}`,
    );
    if (description) lines.push('Description:', description);
    lines.push(`Preferred Resolution: ${RESOLUTIONS[input.preferredResolution]}`);
    if (imageUrls.length > 0) {
      lines.push(`Supporting Images (${imageUrls.length}):`, ...imageUrls);
    } else {
      lines.push('Supporting Images: Not attached (I can share photos in this chat)');
    }
    lines.push('', 'Please review my request and let me know the next steps.', 'Thank you!');

    const message = lines.join('\n');
    return {
      message,
      whatsappUrl: `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`,
    };
  }
}
