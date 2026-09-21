import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function check() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('MONGO_URI is missing');
      process.exit(1);
    }
    await mongoose.connect(uri);
    const doc = await mongoose.connection.db?.collection('storesettings').findOne();
    console.log('--- MONGO DB STORE SETTINGS ---');
    console.log('shipping:', JSON.stringify(doc?.shipping, null, 2));
    console.log('orders:', JSON.stringify(doc?.orders, null, 2));
    console.log('general:', JSON.stringify(doc?.general, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
