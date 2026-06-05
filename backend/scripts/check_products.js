const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const checkProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const products = await mongoose.connection.collection('products').find({}).toArray();

    console.log(`Total products in DB: ${products.length}`);
    const activeProducts = products.filter((p) => p.isActive);
    console.log(`Active products: ${activeProducts.length}`);

    console.log('Sample of 3 products:');
    products.slice(0, 3).forEach((p) => {
      console.log(
        `- Title: ${p.title}, Slug: ${p.slug}, isActive: ${p.isActive}, category: ${p.category}`,
      );
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkProducts();
