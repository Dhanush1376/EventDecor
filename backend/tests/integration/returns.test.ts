import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app';
import Order from '../../src/models/Order';
import Product from '../../src/models/Product';
import User from '../../src/models/User';
import ReturnRequest from '../../src/models/ReturnRequest';
import { generateAuthToken } from '../../src/utils/testHelpers';

describe('Return & Exchange Ecosystem - Integration Tests', () => {
  let customerToken: string;
  let adminToken: string;
  let customer: any;
  let admin: any;
  let product1: any;
  let product2: any;
  let order: any;

  beforeAll(async () => {
    // Setup users
    customer = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password',
      role: 'user',
    });
    admin = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password',
      role: 'admin',
    });

    customerToken = generateAuthToken(customer._id, 'user');
    adminToken = generateAuthToken(admin._id, 'admin');

    // Setup products
    product1 = await Product.create({ title: 'Product 1', price: 100, inventory: 10 });
    product2 = await Product.create({ title: 'Product 2', price: 200, inventory: 5 });

    // Setup an order
    order = await Order.create({
      user: customer._id,
      orderStatus: 'Delivered',
      items: [
        { productId: product1._id, quantity: 2, price: 100 },
        { productId: product2._id, quantity: 1, price: 200 },
      ],
      totalAmount: 400,
      statusHistory: [{ status: 'Delivered', timestamp: new Date() }],
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await ReturnRequest.deleteMany({});
  });

  beforeEach(async () => {
    await ReturnRequest.deleteMany({});
  });

  it('should return eligibility state for an order', async () => {
    const res = await request(app)
      .get(`/api/v1/returns/order-state/${order._id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.canInitiateReturn).toBe(true);
    expect(res.body.data.items.length).toBe(2);
    expect(res.body.data.items[0].isLocked).toBe(false);
  });

  it('should create a return request and lock the item', async () => {
    const payload = {
      orderId: order._id,
      refundMethod: 'wallet',
      items: [
        {
          productId: product1._id,
          returnQuantity: 1,
          reason: 'Damaged',
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('submitted');

    // Check lock state
    const stateRes = await request(app)
      .get(`/api/v1/returns/order-state/${order._id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    const p1State = stateRes.body.data.items.find(
      (i: any) => i.productId.toString() === product1._id.toString(),
    );
    const p2State = stateRes.body.data.items.find(
      (i: any) => i.productId.toString() === product2._id.toString(),
    );

    expect(p1State.isLocked).toBe(true);
    expect(p2State.isLocked).toBe(false);
  });

  it('should prevent duplicate return requests for the same item', async () => {
    const payload = {
      orderId: order._id,
      refundMethod: 'wallet',
      items: [{ productId: product1._id, returnQuantity: 1, reason: 'Damaged' }],
    };

    // First request
    await request(app)
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(payload);

    // Second request should fail
    const res = await request(app)
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(payload);

    expect(res.status).toBe(400); // Or whatever error code for duplicate
    expect(res.body.success).toBe(false);
  });

  it('should successfully transition states by admin', async () => {
    const payload = {
      orderId: order._id,
      refundMethod: 'wallet',
      items: [{ productId: product1._id, returnQuantity: 1, reason: 'Damaged' }],
    };
    const createRes = await request(app)
      .post('/api/v1/returns')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(payload);
    const returnId = createRes.body.data._id;

    // Transition to approved
    const approveRes = await request(app)
      .patch(`/api/v1/admin/returns/${returnId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nextStatus: 'approved' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');
  });
});
