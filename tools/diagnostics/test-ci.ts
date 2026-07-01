import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { CustomerIntelligenceService } from './src/services/analytics/CustomerIntelligenceService';
import User from './src/models/User';

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eventdecor');
    const users = await User.find({ role: { $in: ['user', 'customer'] } }).limit(2).lean();
    console.log('Found users:', users.length);
    for (const u of users) {
      console.log('Testing user:', u._id);
      const res = await CustomerIntelligenceService.getCustomer360(u._id.toString());
      console.log('Success for', u._id);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}
test();
