const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const usersColl = mongoose.connection.collection('users');

    const previousAdmins = await usersColl
      .find({ role: { $in: ['admin', 'superadmin', 'owner'] } })
      .toArray();
    console.log(
      previousAdmins.map((u) => ({
        email: u.email,
        role: u.role,
        isLocked: u.isLocked,
        isVerified: u.isVerified,
      })),
    );
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
