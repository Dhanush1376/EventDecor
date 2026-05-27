const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    await mongoose.connection.collection('orders').dropIndex('razorpayPaymentId_1');
    console.log('Index dropped');
  } catch (e) {
    console.log(e.message);
  }
  process.exit();
}
fix();
