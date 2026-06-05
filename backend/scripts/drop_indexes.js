const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  try {
    const ordersColl = mongoose.connection.collection('orders');
    console.log('Dropping orders indexes...');
    await ordersColl.dropIndexes();
    console.log('Orders indexes dropped');
  } catch (e) {
    console.log('Error dropping orders indexes:', e.message);
  }

  try {
    const eventsColl = mongoose.connection.collection('paymentwebhookevents');
    console.log('Dropping paymentwebhookevents indexes...');
    await eventsColl.dropIndexes();
    console.log('paymentwebhookevents indexes dropped');
  } catch (e) {
    console.log('Error dropping paymentwebhookevents indexes:', e.message);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
