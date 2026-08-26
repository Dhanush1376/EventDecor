import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InAppNotification from './src/models/InAppNotification';
import User from './src/models/User';

dotenv.config({ path: '.env.local' });

async function seedNotifications() {
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('Connected to MongoDB');

  const email = 'dhanush1376@gmail.com';
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: 'Test Customer',
      email: 'customer@eventdecor.com',
      password: 'password123',
      role: 'user',
      isVerified: true,
    } as any);
  }

  await InAppNotification.deleteMany({ user: user._id });

  const notifications = [
    {
      user: user._id,
      event: 'ORDER_CREATED',
      title: 'Order Confirmed',
      message: 'Your order #TEST-1 has been successfully placed.',
      type: 'order',
      actionUrl: '/dashboard/orders/test1',
      read: false,
    },
    {
      user: user._id,
      event: 'PAYMENT_SUCCESSFUL',
      title: 'Payment Successful',
      message: 'Payment for order #TEST-2 was successful.',
      type: 'payment',
      actionUrl: '/dashboard/orders/test2',
      read: true,
    },
    {
      user: user._id,
      event: 'BOOKING_CREATED',
      title: 'Booking Request Received',
      message: 'Your event booking request has been received.',
      type: 'booking',
      actionUrl: '/events/dashboard',
      read: false,
    },
  ];

  await InAppNotification.insertMany(notifications);
  console.log('Seeded customer notifications');

  await mongoose.disconnect();
}

seedNotifications().catch(console.error);
