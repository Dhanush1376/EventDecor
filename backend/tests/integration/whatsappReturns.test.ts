import './setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';

import User from '../../src/models/User';
import Product from '../../src/models/Product';
import Category from '../../src/models/Category';
import Order from '../../src/models/Order';
import ReturnRequest from '../../src/models/ReturnRequest';
import OutboxEvent from '../../src/models/OutboxEvent';
import RefundRecord from '../../src/models/RefundRecord';
import WalletTransaction from '../../src/models/WalletTransaction';
import storeSettingsService from '../../src/services/StoreSettingsService';
import {
  WhatsAppReturnService,
  normalizeWhatsAppNumber,
} from '../../src/services/returns/WhatsAppReturnService';
import { whatsappReturnRequestSchema } from '../../src/validators/returnValidator';

const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const DAY = 24 * 60 * 60 * 1000;
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'testcloud';

let settings: any;

const seed = async (opts: { deliveredDaysAgo?: number | null; orderStatus?: string } = {}) => {
  const category = await Category.create({ name: `Cat ${uniq()}`, slug: `cat-${uniq()}` } as any);
  const mkProduct = (title: string, extra: Record<string, any> = {}) =>
    Product.create({
      title,
      slug: `${title.toLowerCase().replace(/\s/g, '-')}-${uniq()}`,
      primaryCategory: category._id,
      price: 500,
      imageSrc: 'https://example.com/p.webp',
      description: 'Handcrafted item',
      stock: 10,
      ...extra,
    } as any);

  const returnable = await mkProduct('Brass Diya', { returnSettings: { returnWindow: 10 } });
  const locked = await mkProduct('Custom Torans', { isNonRefundable: true });

  const owner = await User.create({
    name: 'Asha Rao',
    email: `asha_${uniq()}@example.com`,
    password: 'password_hash_placeholder',
    isVerified: true,
  } as any);
  const other = await User.create({
    name: 'Someone Else',
    email: `else_${uniq()}@example.com`,
    password: 'password_hash_placeholder',
    isVerified: true,
  } as any);

  const daysAgo = opts.deliveredDaysAgo === undefined ? 2 : opts.deliveredDaysAgo;
  const status = opts.orderStatus || 'Delivered';
  const order = await Order.create({
    user: owner._id,
    customerName: 'Asha Rao',
    customerEmail: 'asha@example.com',
    customerPhone: '9876543210',
    items: [
      {
        productId: returnable._id,
        title: 'Brass Diya',
        price: 500,
        quantity: 2,
        variant: 'Large',
        imageSrc: 'x',
      },
      { productId: locked._id, title: 'Custom Torans', price: 500, quantity: 1, imageSrc: 'x' },
    ],
    shippingAddress: {
      name: 'Asha Rao',
      phone: '9876543210',
      email: 'asha@example.com',
      pincode: '500001',
      locality: 'Banjara Hills',
      address: '1 Main St',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
    },
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    orderStatus: status,
    statusHistory:
      status === 'Delivered' && daysAgo !== null
        ? [{ status: 'Delivered', timestamp: new Date(Date.now() - daysAgo * DAY) }]
        : [],
    subtotal: 1500,
    total: 1500,
  } as any);

  return {
    owner,
    other,
    order,
    diyaItemId: String(order.items[0]._id),
    toranItemId: String(order.items[1]._id),
  };
};

const request = (overrides: Record<string, any> = {}) => ({
  requestType: 'return' as const,
  reason: 'damaged' as const,
  preferredResolution: 'refund' as const,
  description: 'Arrived with a cracked base.',
  ...overrides,
});

describe('WhatsApp return & exchange requests', () => {
  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = CLOUD;
    settings = {
      general: { storeName: 'Siri Arts & Crafts', whatsappNumber: '98765 43210' },
      contact: { whatsappNumber: '' },
      returnsExchanges: { enableReturns: true, enableExchanges: true, returnWindowDays: 7 },
    };
    vi.spyOn(storeSettingsService, 'getSettings').mockImplementation(async () => settings);
  });
  afterEach(() => vi.restoreAllMocks());

  it('evaluates eligibility per order item (enabled vs disabled product)', async () => {
    const { owner, order, diyaItemId, toranItemId } = await seed();
    const result = await WhatsAppReturnService.getEligibility(String(order._id), String(owner._id));

    const diya = result.items.find((i) => i.itemId === diyaItemId)!;
    const toran = result.items.find((i) => i.itemId === toranItemId)!;
    expect(diya.eligible).toBe(true);
    expect(diya.windowDays).toBe(10); // product-level window wins over the store default
    expect(toran.eligible).toBe(false);
    expect(toran.ineligibleReason).toMatch(/not eligible/);
    expect(result.customer).toMatchObject({ name: 'Asha Rao', phone: '+91 98765 43210' });
    expect(result.whatsappConfigured).toBe(true);
  });

  it("returns 404 for another customer's order", async () => {
    const { other, order } = await seed();
    await expect(
      WhatsAppReturnService.getEligibility(String(order._id), String(other._id)),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      WhatsAppReturnService.buildRequest(String(order._id), String(other._id), {
        ...request(),
        items: [{ itemId: String(order.items[0]._id), quantity: 1 }],
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('marks undelivered orders and closed windows as ineligible', async () => {
    const pending = await seed({ orderStatus: 'Processing', deliveredDaysAgo: null });
    const p = await WhatsAppReturnService.getEligibility(
      String(pending.order._id),
      String(pending.owner._id),
    );
    expect(p.items.every((i) => !i.eligible)).toBe(true);
    expect(p.items[0].ineligibleReason).toMatch(/delivered/);

    const old = await seed({ deliveredDaysAgo: 30 });
    const o = await WhatsAppReturnService.getEligibility(
      String(old.order._id),
      String(old.owner._id),
    );
    expect(o.items.find((i) => i.itemId === old.diyaItemId)!.ineligibleReason).toMatch(
      /window has closed/,
    );
  });

  it('rejects an ineligible item even when another item in the order is eligible', async () => {
    const { owner, order, diyaItemId, toranItemId } = await seed();
    await expect(
      WhatsAppReturnService.buildRequest(String(order._id), String(owner._id), {
        ...request(),
        items: [
          { itemId: diyaItemId, quantity: 1 },
          { itemId: toranItemId, quantity: 1 },
        ],
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/Custom Torans/) });
  });

  it('rejects quantities above the ordered quantity and items from other orders', async () => {
    const { owner, order, diyaItemId } = await seed();
    await expect(
      WhatsAppReturnService.buildRequest(String(order._id), String(owner._id), {
        ...request(),
        items: [{ itemId: diyaItemId, quantity: 3 }],
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/at most 2/) });

    await expect(
      WhatsAppReturnService.buildRequest(String(order._id), String(owner._id), {
        ...request(),
        items: [{ itemId: new mongoose.Types.ObjectId().toString(), quantity: 1 }],
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/not part/) });
  });

  it('builds a complete, correctly encoded wa.me message from server-side order data', async () => {
    const { owner, order, diyaItemId } = await seed();
    const photo = `https://res.cloudinary.com/${CLOUD}/image/upload/v1/inspirations/crack.jpg`;
    const { message, whatsappUrl } = await WhatsAppReturnService.buildRequest(
      String(order._id),
      String(owner._id),
      {
        ...request({ description: 'Base cracked & chipped — 50% broken?' }),
        items: [{ itemId: diyaItemId, quantity: 1 }],
        imageUrls: [photo],
      },
    );

    for (const expected of [
      'Hello Siri Arts & Crafts Team!',
      `Order ID: #${order._id}`,
      'Order Date:',
      'Name: Asha Rao',
      'Product: Brass Diya',
      'Variant: Large',
      'Quantity: 1 of 2',
      'Request Type: Return',
      'Reason: Damaged product',
      'Base cracked & chipped — 50% broken?',
      'Preferred Resolution: Refund',
      photo,
      'Thank you!',
    ]) {
      expect(message).toContain(expected);
    }

    // Contact details stay out of the URL: staff see the sender's number in WhatsApp.
    expect(message).not.toContain('asha@example.com');
    expect(message).not.toContain('98765');

    const url = new URL(whatsappUrl);
    expect(url.origin + url.pathname).toBe('https://wa.me/919876543210');
    expect(url.searchParams.get('text')).toBe(message);
    const encodedText = whatsappUrl.split('?text=')[1];
    expect(encodedText).not.toMatch(/[\s&#]/); // spaces, newlines, "&" and "#" are all encoded
    expect(encodedText).toContain('%26'); // "&" in the description
    expect(encodedText).toContain('%0A'); // line breaks
  });

  it('only accepts photos uploaded to this store', async () => {
    const { owner, order, diyaItemId } = await seed();
    for (const bad of [
      'https://res.cloudinary.com/someone-else/image/upload/v1/x.jpg',
      'blob:https://siriartsandcrafts.com/1234',
      'http://evil.example.com/x.jpg',
    ]) {
      await expect(
        WhatsAppReturnService.buildRequest(String(order._id), String(owner._id), {
          ...request(),
          items: [{ itemId: diyaItemId, quantity: 1 }],
          imageUrls: [bad],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    }
  });

  it('works without photos and with an exchange', async () => {
    const { owner, order, diyaItemId } = await seed();
    const { message } = await WhatsAppReturnService.buildRequest(
      String(order._id),
      String(owner._id),
      {
        ...request({ requestType: 'exchange', preferredResolution: 'replacement' }),
        items: [{ itemId: diyaItemId, quantity: 2 }],
      },
    );
    expect(message).toContain('Request Type: Exchange');
    expect(message).toContain('Preferred Resolution: Replacement / Exchange');
    expect(message).toContain('Supporting Images: Not attached');
  });

  it('rejects a resolution that does not fit the request type, and disabled types', async () => {
    const { owner, order, diyaItemId } = await seed();
    await expect(
      WhatsAppReturnService.buildRequest(String(order._id), String(owner._id), {
        ...request({ preferredResolution: 'replacement' }),
        items: [{ itemId: diyaItemId, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ statusCode: 400 });

    settings.returnsExchanges.enableExchanges = false;
    await expect(
      WhatsAppReturnService.buildRequest(String(order._id), String(owner._id), {
        ...request({ requestType: 'exchange', preferredResolution: 'replacement' }),
        items: [{ itemId: diyaItemId, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/Exchanges/) });
  });

  it('handles a missing or invalid business WhatsApp number safely', async () => {
    const { owner, order, diyaItemId } = await seed();
    settings.general.whatsappNumber = '12345';
    const eligibility = await WhatsAppReturnService.getEligibility(
      String(order._id),
      String(owner._id),
    );
    expect(eligibility.whatsappConfigured).toBe(false);
    await expect(
      WhatsAppReturnService.buildRequest(String(order._id), String(owner._id), {
        ...request(),
        items: [{ itemId: diyaItemId, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ statusCode: 503 });

    settings.contact.whatsappNumber = '+91 91234-56789';
    const { whatsappUrl } = await WhatsAppReturnService.buildRequest(
      String(order._id),
      String(owner._id),
      { ...request(), items: [{ itemId: diyaItemId, quantity: 1 }] },
    );
    expect(whatsappUrl.startsWith('https://wa.me/919123456789?text=')).toBe(true);
  });

  it('stores nothing and triggers no refund, wallet or outbox processing', async () => {
    const { owner, order, diyaItemId } = await seed();
    await WhatsAppReturnService.buildRequest(String(order._id), String(owner._id), {
      ...request(),
      items: [{ itemId: diyaItemId, quantity: 1 }],
    });
    expect(await ReturnRequest.countDocuments()).toBe(0);
    expect(await RefundRecord.countDocuments()).toBe(0);
    expect(await WalletTransaction.countDocuments()).toBe(0);
    expect(await OutboxEvent.countDocuments()).toBe(0);
    const fresh = await Order.findById(order._id).lean();
    expect(fresh!.orderStatus).toBe('Delivered');
    expect(fresh!.paymentStatus).toBe('paid');
  });
});

describe('WhatsApp request validation schema', () => {
  const base = {
    params: { orderId: new mongoose.Types.ObjectId().toString() },
    body: {
      requestType: 'return',
      items: [{ itemId: new mongoose.Types.ObjectId().toString(), quantity: 1 }],
      reason: 'damaged',
      preferredResolution: 'refund',
    },
  };

  it('accepts a minimal valid request', () => {
    expect(whatsappReturnRequestSchema.safeParse(base).success).toBe(true);
  });

  it('rejects zero/negative quantities, duplicates, unknown reasons and short "other"', () => {
    const itemId = base.body.items[0].itemId;
    const cases = [
      { items: [{ itemId, quantity: 0 }] },
      { items: [{ itemId, quantity: -1 }] },
      {
        items: [
          { itemId, quantity: 1 },
          { itemId, quantity: 1 },
        ],
      },
      { items: [] },
      { reason: 'changed_mind' },
      { reason: 'other', description: 'short' },
      { requestType: 'refund' },
      { imageUrls: Array(6).fill('https://res.cloudinary.com/x/image/upload/a.jpg') },
    ];
    for (const override of cases) {
      const parsed = whatsappReturnRequestSchema.safeParse({
        ...base,
        body: { ...base.body, ...override },
      });
      expect(parsed.success).toBe(false);
    }
  });
});

describe('normalizeWhatsAppNumber', () => {
  it('normalizes Indian numbers and rejects unusable ones', () => {
    expect(normalizeWhatsAppNumber('98765 43210')).toBe('919876543210');
    expect(normalizeWhatsAppNumber('098765 43210')).toBe('919876543210');
    expect(normalizeWhatsAppNumber('+91-98765-43210')).toBe('919876543210');
    expect(normalizeWhatsAppNumber('+44 7700 900123')).toBe('447700900123');
    expect(normalizeWhatsAppNumber('12345')).toBeNull();
    expect(normalizeWhatsAppNumber('')).toBeNull();
    expect(normalizeWhatsAppNumber(undefined)).toBeNull();
  });
});
