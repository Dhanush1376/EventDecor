import '../setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import User from '../../../src/models/User';
import Order from '../../../src/models/Order';
import ReturnRequest from '../../../src/models/ReturnRequest';
import InAppNotification from '../../../src/models/InAppNotification';
import Product from '../../../src/models/Product';
import Category from '../../../src/models/Category';
import { getOrderById } from '../../../src/controllers/commerce/orderController';
import { getReturnById } from '../../../src/controllers/returns/returnController';
import { markAsRead } from '../../../src/controllers/notifications/notificationCenterController';
import { requireAdmin } from '../../../src/middleware/authMiddleware';
import { UserService } from '../../../src/services/users/userService';
import ApiError from '../../../src/utils/ApiError';

type MockRes = {
  statusCode: number;
  body: any;
  status: (code: number) => MockRes;
  json: (payload: any) => MockRes;
  once: (event: string, cb: () => void) => void;
};

const makeRes = (): MockRes => {
  const res: MockRes = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
    once: vi.fn(),
  };
  return res;
};

const makeReq = (overrides: Record<string, any> = {}) => ({
  method: 'GET',
  path: '/',
  originalUrl: '/',
  params: {},
  query: {},
  body: {},
  headers: {},
  get: vi.fn().mockReturnValue('mock-agent'),
  ...overrides,
});

const executeHandler = (handler: any, req: any, res: any, next: any): Promise<void> => {
  return new Promise<void>((resolve) => {
    const wrappedNext = (err?: any) => {
      next(err);
      resolve();
    };
    const origJson = res.json.bind(res);
    res.json = (payload: any) => {
      origJson(payload);
      resolve();
      return res;
    };
    handler(req, res, wrappedNext);
  });
};

describe('Authorization & IDOR Security Integration Suite', () => {
  let userA: any;
  let userB: any;
  let adminUser: any;
  let category: any;
  let product: any;

  beforeEach(async () => {
    category = await Category.create({
      name: 'Security Test Cat',
      slug: `security-cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    } as any);

    product = await Product.create({
      title: 'Handcrafted Lamp',
      description: 'Handcrafted brass lamp for home decor',
      slug: `lamp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      primaryCategory: category._id,
      price: 2500,
      stock: 20,
      imageSrc: 'https://example.com/lamp.webp',
    } as any);

    userA = await User.create({
      name: 'Customer A',
      email: `customer_a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`,
      password: 'password_hash_placeholder',
      role: 'user',
      isVerified: true,
    } as any);

    userB = await User.create({
      name: 'Customer B (Attacker)',
      email: `customer_b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`,
      password: 'password_hash_placeholder',
      role: 'user',
      isVerified: true,
    } as any);

    adminUser = await User.create({
      name: 'Store Admin',
      email: `admin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`,
      password: 'password_hash_placeholder',
      role: 'admin',
      isVerified: true,
    } as any);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  describe('1. Order Ownership & IDOR Protection', () => {
    it('Customer B cannot view Customer A order via getOrderById (throws 403 Forbidden)', async () => {
      const orderA = await Order.create({
        orderNumber: `ORD-${Date.now()}`,
        user: userA._id,
        items: [
          {
            productId: product._id,
            title: product.title,
            price: 2500,
            quantity: 1,
            imageSrc: product.imageSrc,
          },
        ],
        shippingAddress: {
          name: 'Customer A',
          phone: '9876543210',
          email: 'customera@example.com',
          pincode: '500001',
          locality: 'Banjara Hills',
          address: '123 Main St',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India',
        },
        paymentMethod: 'razorpay',
        paymentStatus: 'paid',
        orderStatus: 'Confirmed',
        subtotal: 2500,
        total: 2500,
      } as any);

      // Customer B tries to view Customer A's order
      const req = makeReq({
        params: { id: orderA._id.toString() },
        user: { id: userB._id.toString(), role: 'user', email: userB.email },
      });
      const res = makeRes();
      const next = vi.fn();

      await executeHandler(getOrderById, req, res, next);

      expect(next).toHaveBeenCalled();
      const errorPassed = next.mock.calls[0][0];
      expect(errorPassed).toBeInstanceOf(ApiError);
      expect(errorPassed.statusCode).toBe(403);
      expect(errorPassed.message).toMatch(/not authorized to view this order/i);
    });

    it('Customer A can successfully view their own order (returns 200)', async () => {
      const orderA = await Order.create({
        orderNumber: `ORD-${Date.now()}-2`,
        user: userA._id,
        items: [
          {
            productId: product._id,
            title: product.title,
            price: 2500,
            quantity: 1,
            imageSrc: product.imageSrc,
          },
        ],
        shippingAddress: {
          name: 'Customer A',
          phone: '9876543210',
          email: 'customera@example.com',
          pincode: '500001',
          locality: 'Banjara Hills',
          address: '123 Main St',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India',
        },
        paymentMethod: 'razorpay',
        paymentStatus: 'paid',
        orderStatus: 'Confirmed',
        subtotal: 2500,
        total: 2500,
      } as any);

      const req = makeReq({
        params: { id: orderA._id.toString() },
        user: { id: userA._id.toString(), role: 'user', email: userA.email },
      });
      const res = makeRes();
      const next = vi.fn();

      await executeHandler(getOrderById, req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(orderA._id.toString());
    });

    it('Admin/Staff can inspect any customer order (returns 200)', async () => {
      const orderA = await Order.create({
        orderNumber: `ORD-${Date.now()}-3`,
        user: userA._id,
        items: [
          {
            productId: product._id,
            title: product.title,
            price: 2500,
            quantity: 1,
            imageSrc: product.imageSrc,
          },
        ],
        shippingAddress: {
          name: 'Customer A',
          phone: '9876543210',
          email: 'customera@example.com',
          pincode: '500001',
          locality: 'Banjara Hills',
          address: '123 Main St',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India',
        },
        paymentMethod: 'razorpay',
        paymentStatus: 'paid',
        orderStatus: 'Confirmed',
        subtotal: 2500,
        total: 2500,
      } as any);

      const req = makeReq({
        params: { id: orderA._id.toString() },
        user: { id: adminUser._id.toString(), role: 'admin', email: adminUser.email },
      });
      const res = makeRes();
      const next = vi.fn();

      await executeHandler(getOrderById, req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(orderA._id.toString());
    });
  });

  describe('2. Return Request Ownership & IDOR Protection', () => {
    it('Customer B cannot access Customer A return request (returns 404 Not Found)', async () => {
      const dummyOrderId = new mongoose.Types.ObjectId();
      const returnRequestA = await ReturnRequest.create({
        userId: userA._id,
        orderId: dummyOrderId,
        returnId: `RET-${Date.now()}`,
        returnType: 'return',
        items: [
          {
            productId: product._id,
            title: product.title,
            orderedQuantity: 1,
            returnQuantity: 1,
            unitPrice: 2500,
            reason: 'Item defective',
          },
        ],
        refundMethod: 'original',
        pickupAddress: {
          name: 'Customer A',
          addressLine1: '123 Main St',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500001',
          phone: '9876543210',
        },
        status: 'submitted',
      } as any);

      // Customer B attempts to fetch Customer A's return request by ID
      const req = makeReq({
        params: { id: returnRequestA._id.toString() },
        user: { id: userB._id.toString(), role: 'user', email: userB.email },
      });
      const res = makeRes();
      const next = vi.fn();

      await executeHandler(getReturnById, req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(404);
      expect(err.message).toMatch(/return request not found/i);
    });
  });

  describe('3. In-App Notification IDOR & Cross-User Tampering Protection', () => {
    it('Customer B cannot mark Customer A notification as read', async () => {
      const notifA = await InAppNotification.create({
        user: userA._id,
        event: 'order_confirmed',
        title: 'Order Confirmed',
        message: 'Your order has been placed.',
        type: 'order',
        read: false,
      } as any);

      // Customer B attempts to mark Customer A's notification as read
      const req = makeReq({
        params: { id: notifA._id.toString() },
        user: { id: userB._id.toString() },
      });
      const res = makeRes();

      await markAsRead(req as any, res as any);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify notification in DB remains unread
      const verifyDoc = await InAppNotification.findById(notifA._id);
      expect(verifyDoc?.read).toBe(false);
    });

    it('Customer A can mark their own notification as read', async () => {
      const notifA = await InAppNotification.create({
        user: userA._id,
        event: 'order_shipped',
        title: 'Shipping Update',
        message: 'Your order is out for delivery.',
        type: 'order',
        read: false,
      } as any);

      const req = makeReq({
        params: { id: notifA._id.toString() },
        user: { id: userA._id.toString() },
      });
      const res = makeRes();

      await markAsRead(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const verifyDoc = await InAppNotification.findById(notifA._id);
      expect(verifyDoc?.read).toBe(true);
    });
  });

  describe('4. RBAC & Route Access Guard', () => {
    it('Customer token accessing admin-guarded route is rejected with 403 Forbidden', async () => {
      const req = makeReq({
        user: { id: userA._id.toString(), role: 'user', email: userA.email },
        originalUrl: '/api/v1/admin/users',
      });
      const res = makeRes();
      const next = vi.fn();

      await requireAdmin(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toMatch(/access denied/i);
    });

    it('Staff/Admin token accessing admin-guarded route passes through to next()', async () => {
      const req = makeReq({
        user: { id: adminUser._id.toString(), role: 'admin', email: adminUser.email },
        originalUrl: '/api/v1/admin/users',
      });
      const res = makeRes();
      const next = vi.fn();

      await requireAdmin(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(); // called with no error
    });
  });

  describe('5. Privilege Escalation Defense', () => {
    it('Customer cannot escalate their own or another user role to admin', async () => {
      await expect(
        UserService.updateUserRole(userA._id.toString(), 'admin', 'user'),
      ).rejects.toThrow(ApiError);

      try {
        await UserService.updateUserRole(userA._id.toString(), 'admin', 'user');
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toMatch(/does not have sufficient clearance/i);
      }

      // Verify User A role was not mutated in MongoDB
      const freshUserA = await User.findById(userA._id);
      expect(freshUserA?.role).toBe('user');
    });

    it('Non-owner staff (e.g. manager) cannot demote or modify owner account', async () => {
      const ownerUser = await User.create({
        name: 'Master Owner',
        email: `owner_${Date.now()}@example.com`,
        password: 'password_hash_placeholder',
        role: 'owner',
        isVerified: true,
      } as any);

      await expect(
        UserService.updateUserRole(ownerUser._id.toString(), 'user', 'manager'),
      ).rejects.toThrow(ApiError);

      try {
        await UserService.updateUserRole(ownerUser._id.toString(), 'user', 'manager');
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toMatch(/Access denied/i);
      }

      const freshOwner = await User.findById(ownerUser._id);
      expect(freshOwner?.role).toBe('owner');
    });
  });
});
