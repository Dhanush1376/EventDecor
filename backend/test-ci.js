const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eventdecor');

const { CustomerIntelligenceService } =
  require('./build/services/analytics/CustomerIntelligenceService') || {};
const User = require('./build/models/User').default;

async function test() {
  try {
    const users = await User.find({ role: { $in: ['user', 'customer'] } })
      .limit(2)
      .lean();
    console.log('Found users:', users.length);
    for (const u of users) {
      console.log('Testing user:', u._id);
      // Try to load 360
      if (CustomerIntelligenceService) {
        const res = await CustomerIntelligenceService.getCustomer360(u._id.toString());
        console.log('Success for', u._id);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}
test();
