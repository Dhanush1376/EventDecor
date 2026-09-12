const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

async function migrate() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI not found in environment');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const Order = mongoose.model(
    'Order',
    new mongoose.Schema({}, { strict: false, collection: 'orders' }),
  );

  // 1. Fix COD orders marked Returned or Cancelled that still have COD Collected
  const returnedCodResult = await Order.updateMany(
    {
      paymentMethod: { $regex: /^cod$/i },
      orderStatus: 'Returned',
      $or: [
        { paymentStatus: 'COD Collected' },
        { codCollected: true },
        { settlementStatus: { $ne: 'Not Applicable' } },
      ],
    },
    {
      $set: {
        paymentStatus: 'returned',
        codCollected: false,
        settlementStatus: 'Not Applicable',
        settledAmount: 0,
      },
    },
  );
  console.log(`Updated Returned COD orders: ${returnedCodResult.modifiedCount}`);

  const cancelledCodResult = await Order.updateMany(
    {
      paymentMethod: { $regex: /^cod$/i },
      orderStatus: 'Cancelled',
      $or: [
        { paymentStatus: 'COD Collected' },
        { codCollected: true },
        { settlementStatus: { $ne: 'Not Applicable' } },
      ],
    },
    {
      $set: {
        paymentStatus: 'cancelled',
        codCollected: false,
        settlementStatus: 'Not Applicable',
        settledAmount: 0,
      },
    },
  );
  console.log(`Updated Cancelled COD orders: ${cancelledCodResult.modifiedCount}`);

  // 2. Safely tag abandoned Razorpay online checkouts (non-destructive)
  const abandonedResult = await Order.updateMany(
    {
      paymentMethod: { $regex: /^razorpay$/i },
      $or: [
        { razorpayPaymentId: { $in: [null, '', undefined] } },
        { razorpayPaymentId: { $exists: false } },
      ],
      paymentStatus: { $in: ['pending', 'failed'] },
    },
    {
      $set: {
        isAbandonedCheckout: true,
        checkoutStatus: 'abandoned',
      },
    },
  );
  console.log(`Tagged abandoned Razorpay checkout intents: ${abandonedResult.modifiedCount}`);

  console.log('Migration completed successfully.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
