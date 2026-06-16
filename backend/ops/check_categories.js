const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const checkCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection;
    const categories = await db.collection('categories').find({}).toArray();
    console.log(`Total categories in DB: ${categories.length}`);
    console.log(categories);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};
checkCategories();
