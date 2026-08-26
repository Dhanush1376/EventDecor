import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const BACKEND_URL = 'http://localhost:5000';

async function verifyInvoiceAuth() {
  console.log('--- STARTING INVOICE AUTHORIZATION VERIFICATION ---\n');

  await mongoose.connect(process.env.MONGO_URI || '');

  const User = require('./src/models/User').default;
  const Order = require('./src/models/Order').default;

  // 1. Get or create two customers and an admin
  const customerA = await User.findOne({ email: 'dhanush1376@gmail.com' });
  let customerB = await User.findOne({ email: 'customer_b_test@example.com' });
  if (!customerB) {
    customerB = await User.create({
      name: 'Customer B',
      email: 'customer_b_test@example.com',
      password: 'password123',
      role: 'user',
      isVerified: true,
    });
  }
  const admin = await User.findOne({ role: 'admin' });

  // 2. Create an order belonging ONLY to Customer A
  const testOrderId = 'TEST-INV-' + Date.now();
  const orderA = await Order.create({
    user: customerA._id,
    orderUuid: testOrderId,
    orderNumber: testOrderId,
    shippingAddress: {
      name: 'A',
      address: 'A',
      locality: 'A',
      city: 'A',
      state: 'A',
      pincode: 'A',
      phone: 'A',
      email: 'dhanush1376@gmail.com',
    },
    items: [],
    subtotal: 100,
    total: 100,
    paymentStatus: 'paid',
    orderStatus: 'Pending',
  });

  // 3. Generate Auth Tokens
  const tokenA = jwt.sign(
    { id: customerA._id, role: customerA.role },
    process.env.JWT_SECRET || '',
    { expiresIn: '1h' },
  );
  const tokenB = jwt.sign(
    { id: customerB._id, role: customerB.role },
    process.env.JWT_SECRET || '',
    { expiresIn: '1h' },
  );
  const tokenAdmin = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET || '', {
    expiresIn: '1h',
  });

  // Helper to test endpoint
  async function fetchInvoice(orderId: string, token: string, userDesc: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/documents/invoice/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { status: res.status, ok: res.ok };
    } catch (err: any) {
      return { status: 500, error: err.message };
    }
  }

  // 4. Run tests
  const results = [];

  console.log(`[TEST] Customer A fetching own invoice...`);
  const resA = await fetchInvoice(orderA._id.toString(), tokenA, 'Customer A');
  console.log(`  -> Status: ${resA.status}`);
  results.push({
    test: 'Customer A -> own invoice',
    expected: 'SUCCESS (200/201)',
    actual: resA.ok ? 'SUCCESS' : 'FAIL',
    pass: resA.ok,
  });

  console.log(`[TEST] Customer B fetching Customer A's invoice...`);
  const resB = await fetchInvoice(orderA._id.toString(), tokenB, 'Customer B');
  console.log(`  -> Status: ${resB.status}`);
  results.push({
    test: 'Customer B -> Customer A invoice',
    expected: 'FAIL (403/404)',
    actual: !resB.ok ? 'FAIL' : 'SUCCESS',
    pass: !resB.ok,
  });

  console.log(`[TEST] Admin fetching Customer A's invoice...`);
  const resAdmin = await fetchInvoice(orderA._id.toString(), tokenAdmin, 'Admin');
  console.log(`  -> Status: ${resAdmin.status}`);
  results.push({
    test: 'Admin -> Customer A invoice',
    expected: 'SUCCESS (200/201)',
    actual: resAdmin.ok ? 'SUCCESS' : 'FAIL',
    pass: resAdmin.ok,
  });

  console.log('\n--- INVOICE SECURITY RESULTS ---');
  let allPass = true;
  for (const r of results) {
    console.log(
      `${r.pass ? '✅ PASS' : '❌ FAIL'} | ${r.test} | Expected: ${r.expected} | Got: ${r.actual}`,
    );
    if (!r.pass) allPass = false;
  }

  // Cleanup
  await Order.findByIdAndDelete(orderA._id);
  await mongoose.disconnect();

  if (!allPass) process.exit(1);
  process.exit(0);
}

verifyInvoiceAuth().catch(console.error);
