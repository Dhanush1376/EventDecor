require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function fixNotifications() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eventdecor');

    console.log('Connected to DB');

    // We can just use the native driver to update to avoid needing the Mongoose model schema
    const db = mongoose.connection.db;
    const collection = db.collection('adminnotifications');

    // Find garbled strings
    const result = await collection.updateMany(
      { title: { $regex: '⚠️ Fallback Queue Dead Letter' } },
      { $set: { title: 'Fallback Queue Dead Letter' } },
    );

    console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    // Also replace in message if any
    const msgResult = await collection.updateMany({ message: { $regex: 'âš ï¸ ' } }, [
      {
        $set: {
          message: {
            $replaceOne: { input: '$message', find: 'âš ï¸ ', replacement: '⚠️' },
          },
        },
      },
    ]);

    console.log(`Message Matched: ${msgResult.matchedCount}, Modified: ${msgResult.modifiedCount}`);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixNotifications();
