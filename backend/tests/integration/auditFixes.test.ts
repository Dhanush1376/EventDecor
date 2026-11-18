import './setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import crypto from 'crypto';

import User from '../../src/models/User';
import Product from '../../src/models/Product';
import Category from '../../src/models/Category';
import Coupon from '../../src/models/Coupon';
import Order from '../../src/models/Order';
import PaymentEvent from '../../src/models/PaymentEvent';
import PaymentAttempt from '../../src/models/PaymentAttempt';
import InventoryReservation from '../../src/models/InventoryReservation';
import { InventoryService } from '../../src/services/InventoryService';
import { OrderCheckoutService } from '../../src/services/orders/OrderCheckoutService';
import { claimCouponUsage } from '../../src/services/couponUsage';
import { LogisticsService } from '../../src/services/logisticsService';
import { S3StorageProvider } from '../../src/services/backup/StorageManager';
import { RazorpayGateway } from '../../src/utils/payment/RazorpayGateway';
import {
  getOrderTimeline,
  updateOrderPublicStatus,
} from '../../src/controllers/commerce/orderController';
import ApiError from '../../src/utils/ApiError';

const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const makeRes = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (code: number) => ((res.statusCode = code), res);
  res.json = (payload: any) => ((res.body = payload), res);
  res.once = vi.fn();
  return res;
};

/** Runs an asyncHandler-wrapped controller; resolves with the error passed to next, if any. */
const run = (handler: any, req: any) =>
  new Promise<{ res: any; error?: any }>((resolve) => {
    const res = makeRes();
    const origJson = res.json;
    res.json = (payload: any) => {
      origJson(payload);
      resolve({ res });
      return res;
    };
    handler(req, res, (error?: any) => resolve({ res, error }));
  });

const seedUser = (role = 'user', walletBalance = 0) =>
  User.create({
    name: `User ${role}`,
    email: `u_${uniq()}@example.com`,
    password: 'password_hash_placeholder',
    role,
    isVerified: true,
    walletBalance,
  } as any);

const seedProduct = async (overrides: Record<string, any> = {}) => {
  const category = await Category.create({ name: `Cat ${uniq()}`, slug: `cat-${uniq()}` } as any);
  return Product.create({
    title: 'Brass Diya',
    slug: `diya-${uniq()}`,
    primaryCategory: category._id,
    category: category.name,
    price: 500,
    imageSrc: 'https://example.com/diya.webp',
    description: 'Handcrafted brass diya',
    stock: 2,
    ...overrides,
  } as any);
};

const shippingAddress = {
  name: 'Test Buyer',
  phone: '9876543210',
  email: 'buyer@example.com',
  pincode: '500001',
  locality: 'Banjara Hills',
  address: '1 Main St',
  city: 'Hyderabad',
  state: 'Telangana',
  country: 'India',
};

const seedOrder = (userId: mongoose.Types.ObjectId, productId: mongoose.Types.ObjectId) =>
  Order.create({
    user: userId,
    items: [{ productId, title: 'Brass Diya', price: 500, quantity: 1, imageSrc: 'x' }],
    shippingAddress,
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    orderStatus: 'Delivered',
    subtotal: 500,
    total: 500,
  } as any);

describe('Inventory modes (SAC-001)', () => {
  it('rejects a reservation larger than available stock for tracked products', async () => {
    const user = await seedUser();
    const product = await seedProduct({ stock: 2 });
    await expect(
      InventoryService.reserveInventory(product._id.toString(), 3, user._id.toString()),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/Insufficient/) });
  });

  it('lets exactly one of two concurrent checkouts take the last unit', async () => {
    const [a, b] = await Promise.all([seedUser(), seedUser()]);
    const product = await seedProduct({ stock: 1 });
    const results = await Promise.allSettled([
      InventoryService.reserveInventory(product._id.toString(), 1, a._id.toString()),
      InventoryService.reserveInventory(product._id.toString(), 1, b._id.toString()),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const fresh = await Product.findById(product._id).lean();
    expect(fresh!.reservedStock).toBe(1);
  });

  it('accepts any quantity for made-to-order products without consuming stock', async () => {
    const user = await seedUser();
    const product = await seedProduct({ stock: 0, inventoryMode: 'made_to_order' });

    const reservation = await InventoryService.reserveInventory(
      product._id.toString(),
      5,
      user._id.toString(),
    );
    expect(reservation.tracksStock).toBe(false);

    await InventoryService.confirmReservation(reservation._id.toString());
    const fresh = await Product.findById(product._id).lean();
    expect(fresh!.stock).toBe(0);
    expect(fresh!.reservedStock).toBe(0);
    expect((await InventoryReservation.findById(reservation._id))!.status).toBe('confirmed');

    await InventoryService.restoreStock(product._id.toString(), 5, 'order_cancelled');
    expect((await Product.findById(product._id).lean())!.stock).toBe(0);
  });

  it('defaults new products to tracked inventory with zero stock', async () => {
    const product = await seedProduct({ stock: undefined });
    expect(product.inventoryMode).toBe('tracked');
    expect(product.stock).toBe(0);
  });
});

describe('Checkout guards (SAC-001/004/005)', () => {
  beforeEach(() => {
    vi.spyOn(RazorpayGateway, 'createOrder').mockImplementation(
      async (opts: any) => ({ id: `order_${uniq()}`, amount: opts.amount, currency: 'INR' }) as any,
    );
  });
  afterEach(() => vi.restoreAllMocks());

  const checkout = (userId: string, productId: string, extra: Record<string, any> = {}) =>
    OrderCheckoutService.createOrder(userId, {
      items: [{ productId, quantity: 1, type: 'purchase' }],
      shippingAddress,
      paymentMethod: 'razorpay',
      idempotencyKey: `idem-${uniq()}`,
      ...extra,
    });

  it('rejects ordering more than tracked stock', async () => {
    const user = await seedUser();
    const product = await seedProduct({ stock: 1 });
    await expect(
      OrderCheckoutService.createOrder(user._id.toString(), {
        items: [{ productId: product._id.toString(), quantity: 2, type: 'purchase' }],
        shippingAddress,
        paymentMethod: 'razorpay',
        idempotencyKey: `idem-${uniq()}`,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses a coupon the customer has already used, even when posted directly', async () => {
    const user = await seedUser();
    const product = await seedProduct({ stock: 10 });
    await Coupon.create({
      code: 'WELCOME10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 0,
      expiryDate: new Date(Date.now() + 86_400_000),
      isActive: true,
      usedBy: [{ userId: user._id, orderId: new mongoose.Types.ObjectId() }],
      usedCount: 1,
    } as any);

    await expect(
      checkout(user._id.toString(), product._id.toString(), { couponCode: 'WELCOME10' }),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/already used/) });
  });

  it('blocks a second Siri Cash checkout while another one is pending', async () => {
    const user = await seedUser('user', 100);
    const product = await seedProduct({ stock: 10 });

    await checkout(user._id.toString(), product._id.toString(), { useWallet: true });
    expect(await PaymentAttempt.countDocuments({ userId: user._id })).toBe(1);

    await expect(
      checkout(user._id.toString(), product._id.toString(), { useWallet: true }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('Coupon redemption (SAC-004)', () => {
  it('redeems at most once per customer and never beyond usageLimit under concurrency', async () => {
    const [a, b] = await Promise.all([seedUser(), seedUser()]);
    await Coupon.create({
      code: 'ONCE',
      discountType: 'fixed',
      discountValue: 50,
      minOrderAmount: 0,
      expiryDate: new Date(Date.now() + 86_400_000),
      isActive: true,
      usageLimit: 1,
    } as any);

    const results = await Promise.all([
      claimCouponUsage('ONCE', a._id.toString(), new mongoose.Types.ObjectId()),
      claimCouponUsage('ONCE', b._id.toString(), new mongoose.Types.ObjectId()),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await Coupon.findOne({ code: 'ONCE' }).lean())!.usedCount).toBe(1);

    await Coupon.updateOne({ code: 'ONCE' }, { $set: { usageLimit: 10 } });
    const winner = results[0] ? a : b;
    expect(
      await claimCouponUsage('ONCE', winner._id.toString(), new mongoose.Types.ObjectId()),
    ).toBeNull();
  });
});

describe('Order timeline authorization (SAC-003)', () => {
  it('denies other customers and hides gateway payloads from the owner', async () => {
    const [owner, other, admin] = await Promise.all([seedUser(), seedUser(), seedUser('admin')]);
    const product = await seedProduct();
    const order = await seedOrder(owner._id, product._id);
    await PaymentEvent.create({
      eventId: crypto.randomUUID(),
      orderId: order._id,
      orderType: 'purchase',
      eventType: 'paid',
      amount: 500,
      currency: 'INR',
      performedBy: 'system',
      gatewayResponse: { email: 'owner@example.com', contact: '+919876543210' },
    } as any);

    const asUser = (u: any, role = 'user') => ({
      params: { id: order._id.toString() },
      user: { id: u._id.toString(), role },
    });

    const denied = await run(getOrderTimeline, asUser(other));
    expect(denied.error).toBeInstanceOf(ApiError);
    expect(denied.error.statusCode).toBe(403);

    const mine = await run(getOrderTimeline, asUser(owner));
    const ownerPayment = mine.res.body.data.find((e: any) => e.domain === 'payment');
    expect(ownerPayment).toBeDefined();
    expect(ownerPayment.gatewayResponse).toBeUndefined();

    const staff = await run(getOrderTimeline, asUser(admin, 'admin'));
    const staffPayment = staff.res.body.data.find((e: any) => e.domain === 'payment');
    expect(staffPayment.gatewayResponse.email).toBe('owner@example.com');
  });
});

describe('Public order tracking (SAC-006)', () => {
  it('issues a token per order and only accepts it for that order', async () => {
    const owner = await seedUser();
    const product = await seedProduct();
    const [orderA, orderB] = await Promise.all([
      seedOrder(owner._id, product._id),
      seedOrder(owner._id, product._id),
    ]);
    const tokenA = (await Order.findById(orderA._id).select('+publicTrackingToken').lean())!
      .publicTrackingToken!;
    expect(tokenA).toMatch(/^[0-9a-f]{48}$/);

    const tracked = await LogisticsService.verifyPublicTrackingAccess(
      orderA._id.toString(),
      tokenA,
    );
    expect(String(tracked._id)).toBe(String(orderA._id));

    await expect(
      LogisticsService.verifyPublicTrackingAccess(orderB._id.toString(), tokenA),
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      LogisticsService.verifyPublicTrackingAccess(orderA._id.toString(), 'deadbeef'),
    ).rejects.toMatchObject({ statusCode: 403 });

    const logisticsJwt = LogisticsService.generateTrackingToken(orderA._id.toString());
    await expect(
      LogisticsService.verifyPublicTrackingAccess(orderA._id.toString(), logisticsJwt),
    ).resolves.toBeTruthy();
  });

  it('backfills a token for orders created before tokens existed', async () => {
    const owner = await seedUser();
    const product = await seedProduct();
    const order = await seedOrder(owner._id, product._id);
    await Order.updateOne({ _id: order._id }, { $unset: { publicTrackingToken: 1 } });

    const token = await LogisticsService.ensurePublicTrackingToken(order._id);
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    expect(await LogisticsService.ensurePublicTrackingToken(order._id)).toBe(token);
  });

  it('does not let a tracking-link holder mark an order Returned (no self-refund)', async () => {
    const owner = await seedUser();
    const product = await seedProduct();
    const order = await seedOrder(owner._id, product._id);

    const { error } = await run(updateOrderPublicStatus, {
      params: { id: order._id.toString() },
      body: { status: 'Returned' },
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(403);
    expect((await Order.findById(order._id).lean())!.orderStatus).toBe('Delivered');
  });
});

describe('Backups (SAC-002)', () => {
  it('S3 provider refuses to report fake uploads or verification', async () => {
    const s3 = new S3StorageProvider('ap-south-1', 'bucket');
    await expect(s3.upload('/tmp/x', 'x')).rejects.toThrow(/not implemented/);
    await expect(s3.verify('x', 'abc')).rejects.toThrow(/not implemented/);
  });
});
