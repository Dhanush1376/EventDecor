const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const extract = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    console.log('Fetching all adminauditlogs...');
    const logs = await db.collection('adminauditlogs').find({}).toArray();

    console.log(`Found ${logs.length} total audit logs.`);

    if (logs.length > 0) {
      console.log(JSON.stringify(logs, null, 2));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};
extract();
