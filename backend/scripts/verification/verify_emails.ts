import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { TransactionalEmailService } from './src/services/TransactionalEmailService';
import Order from './src/models/Order';
import User from './src/models/User';
import * as notificationService from './src/services/notificationService';

dotenv.config();
dotenv.config({ path: '.env.local' });

async function verifyEmails() {
  console.log('--- STARTING E2E EMAIL VERIFICATION ---');

  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('Connected to DB');

  // 1. Setup mock email sender to capture HTML
  const sentEmails: any[] = [];

  // Monkey patch notificationService.sendDirectEmailProcessor
  const originalSend = notificationService.sendDirectEmailProcessor;
  (notificationService as any).sendDirectEmailProcessor = async (payload: any) => {
    console.log(`[Mock] Email queued for ${payload.email} - Subject: ${payload.subject}`);
    sentEmails.push(payload);
    return { messageId: 'mock-id' };
  };

  try {
    // 2. Create a dummy order
    const mockUser = await User.findOne({ email: { $exists: true } });
    if (!mockUser) throw new Error('No user found in DB');

    const mockOrder = new Order({
      user: mockUser._id,
      orderUuid: 'TEST-ORD-' + Date.now(),
      shippingAddress: {
        name: 'Test User',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        pincode: '123456',
        phone: '9999999999',
        email: mockUser.email,
      },
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          title: 'Test Product A',
          price: 500,
          quantity: 2,
          imageSrc: 'https://example.com/image.png',
        },
      ],
      subtotal: 1000,
      tax: { totalTax: 180 },
      shippingFee: 50,
      total: 1230,
      paymentMethod: 'Razorpay',
      paymentStatus: 'Paid',
      status: 'Processing',
      statusHistory: [{ status: 'Processing', timestamp: new Date(), note: 'Order placed' }],
    });

    // 3. Test Order Creation Emails
    console.log('\n--- Testing Order Placed Emails ---');
    sentEmails.length = 0; // Clear
    await TransactionalEmailService.sendOrderPlacedEmails(mockOrder, mockUser, 'test-event-1');

    // Assert exactly 1 customer email and N admin emails (but logical deduplication means 1 path)
    const customerEmails = sentEmails.filter(
      (e) => e.type === 'order' && e.email === mockUser.email,
    );
    console.log(`Customer emails sent: ${customerEmails.length}`);
    if (customerEmails.length !== 1) console.error('FAIL: Expected exactly 1 customer email');

    const customerHtml = customerEmails[0].customHtml;

    // Check for raw variables
    const rawVars = customerHtml.match(/\$\{.*\}|\{\{.*\}\}|\\\$\{.*\}/g);
    if (rawVars) {
      console.error('FAIL: Found raw variables in HTML:', rawVars);
    } else {
      console.log('PASS: No raw variables found in customer order email');
    }

    // Check for attachment
    if (customerEmails[0].attachments && customerEmails[0].attachments.length > 0) {
      console.log('PASS: Invoice attachment found');
    } else {
      console.error('FAIL: Missing invoice attachment');
    }

    // Check for admin emails
    const adminEmails = sentEmails.filter((e) => e.action === 'order_confirmation_admin');
    console.log(`Admin emails sent: ${adminEmails.length}`);
    if (adminEmails.length > 0) {
      const adminHtml = adminEmails[0].customHtml;
      const rawVarsAdmin = adminHtml.match(/\$\{.*\}|\{\{.*\}\}|\\\$\{.*\}/g);
      if (rawVarsAdmin) console.error('FAIL: Found raw variables in admin HTML:', rawVarsAdmin);
      else console.log('PASS: No raw variables found in admin email');
    }

    // 4. Test Order Status Change
    console.log('\n--- Testing Order Status Change ---');
    sentEmails.length = 0;
    await TransactionalEmailService.sendOrderStatusChangeEmail(
      mockOrder,
      mockUser,
      'Processing',
      'Shipped',
      'test-event-2',
    );

    const statusCustomerEmails = sentEmails.filter((e) => e.email === mockUser.email);
    console.log(`Customer status emails sent: ${statusCustomerEmails.length}`);

    const statusAdminEmails = sentEmails.filter((e) => e.action.includes('admin'));
    console.log(`Admin status emails sent: ${statusAdminEmails.length}`);
    if (statusAdminEmails.length === 0) {
      console.log('PASS: Zero admin status emails sent (as expected, only notifications)');
    } else {
      console.error('FAIL: Admin received status change email');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log('--- E2E VERIFICATION COMPLETE ---');
  }
}

verifyEmails();
