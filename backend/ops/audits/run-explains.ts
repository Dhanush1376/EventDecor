import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import connectDB from '../../src/config/db';
import Product from '../../src/models/Product';
import Order from '../../src/models/Order';

async function runExplains() {
  await connectDB();
  console.log('DB Connected. Running execution stats...');

  try {
    // 1. Product Listing
    const prodListing = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .explain('executionStats');

    // 2. Search
    const search = await Product.find({ $text: { $search: 'decor' }, isActive: true }).explain(
      'executionStats',
    );

    // 3. Orders
    const orders = await Order.find({ orderStatus: 'Pending' })
      .sort({ createdAt: -1 })
      .limit(10)
      .explain('executionStats');

    fs.writeFileSync(
      'explain_output.json',
      JSON.stringify(
        {
          productListing: prodListing,
          search: search,
          orders: orders,
        },
        null,
        2,
      ),
    );
    console.log('Explains written to explain_output.json');
  } catch (e) {
    console.error('Explain error:', e);
  }

  process.exit(0);
}

runExplains().catch((err) => {
  console.error(err);
  process.exit(1);
});
