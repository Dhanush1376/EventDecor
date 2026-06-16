const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const addMissingCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection;

    const missing = [
      { name: 'Traditional Wedding Decor', type: 'product' },
      { name: 'Customized Gift Hampers', type: 'product' },
    ];

    for (const cat of missing) {
      const slug = cat.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const existing = await db.collection('categories').findOne({ slug });

      if (!existing) {
        await db.collection('categories').insertOne({
          name: cat.name,
          slug,
          type: cat.type,
          displayOrder: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`[+] Added missing category: ${cat.name}`);
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

addMissingCategories();
