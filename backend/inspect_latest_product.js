const mongoose = require('mongoose');

require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const productSchema = new mongoose.Schema({}, { strict: false });
  const Product = mongoose.model('Product', productSchema, 'products');

  const latestProduct = await Product.findOne().sort({ createdAt: -1 }).lean();
  console.log(JSON.stringify(latestProduct, null, 2));

  mongoose.disconnect();
}

run();
