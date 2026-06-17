const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const restoreCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection;

    console.log('Fetching unique categories from Products, Events, and Galleries...');

    // Get unique categories from collections
    const productCategories = await db.collection('products').distinct('category');
    const eventCategories = await db.collection('events').distinct('category');
    const galleryCategories = await db.collection('galleries').distinct('category');

    console.log('Product Categories:', productCategories);
    console.log('Event Categories:', eventCategories);
    console.log('Gallery Categories:', galleryCategories);

    const uniqueCategories = new Set([
      ...productCategories,
      ...eventCategories,
      ...galleryCategories,
    ]);

    // Determine type (if it's in products -> 'product', events -> 'event', galleries -> 'gallery', or 'global' if mixed)
    // For simplicity, let's assign based on where it was found first
    let restoredCount = 0;

    for (const catName of uniqueCategories) {
      if (!catName) continue;

      let type = 'global';
      if (productCategories.includes(catName)) type = 'product';
      else if (eventCategories.includes(catName)) type = 'event';
      else if (galleryCategories.includes(catName)) type = 'gallery';

      // Upsert category
      const slug = catName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const existing = await db.collection('categories').findOne({ slug });
      if (!existing) {
        await db.collection('categories').insertOne({
          name: catName,
          slug,
          type,
          displayOrder: restoredCount,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        restoredCount++;
        console.log(`[+] Restored category: ${catName} (${type})`);
      }
    }

    console.log(`✅ Successfully restored ${restoredCount} categories!`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Fatal Error:', err);
    process.exit(1);
  }
};

restoreCategories();
