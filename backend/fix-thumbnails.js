require('dotenv').config();
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const RecycleBin = require('./src/models/RecycleBin').default;
  const items = await RecycleBin.find({ entityThumbnail: null });
  let count = 0;
  for (const item of items) {
    if (item.entityData) {
      const thumb =
        item.entityData.imageSrc ||
        item.entityData.image ||
        item.entityData.heroImage ||
        item.entityData.thumbnail;
      if (thumb) {
        item.entityThumbnail = thumb;
        await item.save();
        count++;
      }
    }
  }
  console.log(`Fixed ${count} thumbnails.`);
  process.exit(0);
}
fix().catch(console.error);
