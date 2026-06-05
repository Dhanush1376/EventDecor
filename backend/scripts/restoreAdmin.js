const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const restoreAdmins = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    console.log('Restoring admin access...');

    // Restore Sirisha
    const res1 = await db
      .collection('users')
      .updateOne({ email: 'sirisha.atmakuri@gmail.com' }, { $set: { role: 'owner' } });
    console.log(`sirisha.atmakuri@gmail.com updated: ${res1.modifiedCount > 0}`);

    // Restore Dhanush
    const res2 = await db.collection('users').updateOne(
      { email: 'dhanush1376@gmail.com' },
      { $set: { role: 'admin' } }, // Assuming admin or order_manager
    );
    console.log(`dhanush1376@gmail.com updated: ${res2.modifiedCount > 0}`);

    console.log('✅ Admin accounts successfully restored.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Failed to restore admins:', err);
    process.exit(1);
  }
};

restoreAdmins();
