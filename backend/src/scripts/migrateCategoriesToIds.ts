import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product';
import Event from '../models/Event';
import Gallery from '../models/Gallery';
import Category from '../models/Category';

dotenv.config({ path: '.env.local' });

async function runMigration() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Connected.');

  console.log('Fetching all active categories...');
  const categories = await Category.find();
  const categoryMap = new Map<string, mongoose.Types.ObjectId>();

  categories.forEach((cat) => {
    categoryMap.set(cat.slug, cat._id as mongoose.Types.ObjectId);
    categoryMap.set(cat.name.toLowerCase().trim(), cat._id as mongoose.Types.ObjectId);
  });

  const models = [
    { name: 'Product', model: Product },
    { name: 'Event', model: Event },
    { name: 'Gallery', model: Gallery },
  ];

  for (const { name, model } of models) {
    console.log(`\nMigrating ${name}s...`);
    // Need to use raw collection because we removed 'category' from the Schema
    const cursor = model.collection.find({});
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for await (const doc of cursor) {
      if (doc.primaryCategory) {
        skipped++;
        continue;
      }

      const catStr = doc.category;
      if (!catStr) {
        skipped++;
        continue;
      }

      const searchStr = String(catStr).toLowerCase().trim();
      let catId = categoryMap.get(searchStr);

      if (!catId) {
        console.warn(`[!] No matching Category ID found for "${catStr}" on ${name} ${doc._id}.`);
        // Fallback to searching the DB directly with fuzzy match
        const regexMatch = await Category.findOne({
          name: { $regex: new RegExp(`^${searchStr}$`, 'i') },
        });
        if (regexMatch) {
          catId = regexMatch._id as mongoose.Types.ObjectId;
          categoryMap.set(searchStr, catId);
        } else {
          console.warn(`[!] Creating fallback category for "${catStr}"...`);
          const fallbackCat = new Category({
            name: catStr,
            slug: searchStr.replace(/[\s\W-]+/g, '-'),
            type: name === 'Product' ? 'product' : name === 'Event' ? 'event' : 'gallery',
            isActive: true,
          });
          await fallbackCat.save();
          catId = fallbackCat._id as mongoose.Types.ObjectId;
          categoryMap.set(searchStr, catId);
        }
      }

      if (catId) {
        await model.collection.updateOne(
          { _id: doc._id },
          {
            $set: {
              primaryCategory: catId,
              secondaryCategories: [],
            },
            $unset: { category: '' },
          },
        );
        migrated++;
      } else {
        errors++;
      }
    }

    console.log(`${name}: ${migrated} migrated, ${skipped} skipped, ${errors} errors.`);
  }

  console.log('\nMigration complete.');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
