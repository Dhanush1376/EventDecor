const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    console.log('--- AUDIT LOGS FOR DELETION ---');
    const deleteLogs = await db
      .collection('adminauditlogs')
      .find({
        $or: [
          { action: { $regex: /delete/i } },
          { action: { $regex: /wipe/i } },
          { action: { $regex: /drop/i } },
          { action: { $regex: /reset/i } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    console.log(JSON.stringify(deleteLogs, null, 2));

    console.log('\n--- AUDIT LOGS FOR PRODUCTS/USERS ---');
    const resourceLogs = await db
      .collection('adminauditlogs')
      .find({
        resource: { $in: ['Product', 'User', 'product', 'user', 'Database'] },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    console.log(JSON.stringify(resourceLogs, null, 2));

    console.log('\n--- USERS COUNT ---');
    const usersCount = await db.collection('users').countDocuments();
    console.log('Users:', usersCount);
    const users = await db.collection('users').find().toArray();
    console.log(
      JSON.stringify(
        users.map((u) => ({ email: u.email, role: u.role })),
        null,
        2,
      ),
    );

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
