const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const restoreProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection;

    // Set all products that are inactive to active, give them a default price of 999 and stock of 10
    const result = await db
      .collection('products')
      .updateMany({ isActive: false }, { $set: { isActive: true, stock: 10, price: 999 } });

    console.log(`✅ Restored and activated ${result.modifiedCount} products!`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Fatal Error:', err);
    process.exit(1);
  }
};

restoreProducts();
