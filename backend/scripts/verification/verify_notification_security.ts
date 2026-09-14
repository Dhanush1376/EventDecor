import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  getNotifications,
  markAsRead,
  archiveNotification,
  markAllAsRead,
} from './src/controllers/notifications/notificationCenterController';
import InAppNotification from './src/models/InAppNotification';
import User from './src/models/User';
import { Request, Response } from 'express';

dotenv.config({ path: '.env.local' });
dotenv.config();

const mockResponse = () => {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
};

async function verifyNotificationSecurity() {
  console.log('──────────────────────────────────────────────────────────────────────');
  console.log('  NOTIFICATION SECURITY (TENANT ISOLATION) VERIFICATION');
  console.log('──────────────────────────────────────────────────────────────────────\n');

  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('[DB] Connected to MongoDB');

    // 1. Create two test users
    let userA = await User.findOne({ email: 'customerA@eventdecor.com' });
    if (!userA) {
      userA = await User.create({
        name: 'Customer A',
        email: 'customerA@eventdecor.com',
        password: 'password',
        role: 'user',
        isVerified: true,
      } as any);
    }
    let userB = await User.findOne({ email: 'customerB@eventdecor.com' });
    if (!userB) {
      userB = await User.create({
        name: 'Customer B',
        email: 'customerB@eventdecor.com',
        password: 'password',
        role: 'user',
        isVerified: true,
      } as any);
    }

    // Clear notifications for these users
    await InAppNotification.deleteMany({ user: { $in: [userA._id, userB._id] } });

    // 2. Create a notification for Customer A
    const notifA = await InAppNotification.create({
      user: userA._id,
      event: 'ORDER_CREATED',
      title: 'Customer A Notification',
      message: 'This belongs to A',
      type: 'order',
    } as any);
    console.log(`[SETUP] Created Notification ${notifA._id} for Customer A`);

    // 3. Test: Customer A GET notifications -> should see it
    const reqA_get = { user: { id: userA._id.toString() }, query: {} } as any;
    const resA_get = mockResponse();
    await getNotifications(reqA_get, resA_get);

    if (
      resA_get.statusCode === 200 &&
      resA_get.body.data.length === 1 &&
      resA_get.body.data[0]._id.toString() === notifA._id.toString()
    ) {
      console.log('✅ PASS: Customer A can see their own notification');
    } else {
      console.log('❌ FAIL: Customer A cannot see their notification', resA_get.body);
    }

    // 4. Test: Customer B GET notifications -> should NOT see A's notification
    const reqB_get = { user: { id: userB._id.toString() }, query: {} } as any;
    const resB_get = mockResponse();
    await getNotifications(reqB_get, resB_get);

    if (resB_get.statusCode === 200 && resB_get.body.data.length === 0) {
      console.log("✅ PASS: Customer B cannot see Customer A's notification in list");
    } else {
      console.log("❌ FAIL: Customer B can see Customer A's notification", resB_get.body);
    }

    // 5. Test: Customer B attempts to mark A's notification as read
    const reqB_markRead = {
      user: { id: userB._id.toString() },
      params: { id: notifA._id.toString() },
    } as any;
    const resB_markRead = mockResponse();
    await markAsRead(reqB_markRead, resB_markRead);

    if (resB_markRead.statusCode === 404) {
      console.log(
        "✅ PASS: Customer B gets 404 attempting to mark Customer A's notification as read",
      );
    } else {
      console.log(`❌ FAIL: Expected 404, got ${resB_markRead.statusCode}`, resB_markRead.body);
    }

    // 6. Test: Customer B attempts to archive A's notification
    const reqB_archive = {
      user: { id: userB._id.toString() },
      params: { id: notifA._id.toString() },
    } as any;
    const resB_archive = mockResponse();
    await archiveNotification(reqB_archive, resB_archive);

    if (resB_archive.statusCode === 404) {
      console.log("✅ PASS: Customer B gets 404 attempting to archive Customer A's notification");
    } else {
      console.log(`❌ FAIL: Expected 404, got ${resB_archive.statusCode}`, resB_archive.body);
    }

    // 7. Test: Customer A attempts to mark their own notification as read
    const reqA_markRead = {
      user: { id: userA._id.toString() },
      params: { id: notifA._id.toString() },
    } as any;
    const resA_markRead = mockResponse();
    await markAsRead(reqA_markRead, resA_markRead);

    if (resA_markRead.statusCode === 200 && resA_markRead.body.data.read === true) {
      console.log('✅ PASS: Customer A can mark their own notification as read');
    } else {
      console.log(`❌ FAIL: Expected 200, got ${resA_markRead.statusCode}`, resA_markRead.body);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n[DB] Disconnected');
  }
}

verifyNotificationSecurity();
