const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('No MONGO_URI found');
  process.exit(1);
}

const mapTags = (tags) => {
  if (!tags || !Array.isArray(tags)) return tags;
  const newTags = new Set();
  tags.forEach((tag) => {
    const t = tag.trim().toLowerCase();

    // Ganesh normalization
    if (['ganesh', 'vinayaka pooja', 'ganesh decoration', 'ganesh chaturthi'].includes(t)) {
      newTags.add('Ganesh Chaturthi');
    }
    // Pooja normalization
    else if (['pooja decoration', 'pooja backdrop', 'pooja'].includes(t)) {
      newTags.add('Pooja');
    }
    // Wedding normalization
    else if (['wedding decor', 'wedding decoration', 'wedding'].includes(t)) {
      newTags.add('Wedding');
    }
    // Default
    else {
      // Keep original casing
      newTags.add(tag.trim());
    }
  });
  return Array.from(newTags);
};

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const db = mongoose.connection.db;

  // Normalize Products
  const products = await db.collection('products').find({}).toArray();
  let pUpdated = 0;
  for (let p of products) {
    if (p.tags && p.tags.length > 0) {
      const newTags = mapTags(p.tags);
      if (JSON.stringify(newTags) !== JSON.stringify(p.tags)) {
        await db.collection('products').updateOne({ _id: p._id }, { $set: { tags: newTags } });
        pUpdated++;
      }
    }
  }
  console.log(`Updated ${pUpdated} products.`);

  // Normalize Galleries
  const gallery = await db.collection('galleries').find({}).toArray();
  let gUpdated = 0;
  for (let g of gallery) {
    if (g.tags && g.tags.length > 0) {
      const newTags = mapTags(g.tags);
      if (JSON.stringify(newTags) !== JSON.stringify(g.tags)) {
        await db.collection('galleries').updateOne({ _id: g._id }, { $set: { tags: newTags } });
        gUpdated++;
      }
    }
  }
  console.log(`Updated ${gUpdated} galleries.`);

  mongoose.disconnect();
  console.log('Done');
}

run().catch(console.error);
