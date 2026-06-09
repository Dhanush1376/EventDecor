import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Product from '../src/models/Product';
import Gallery from '../src/models/Gallery';
import Category from '../src/models/Category';

async function runAudit() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const models = [
    { name: 'Product', model: Product, imageFields: ['imageSrc', 'images'] },
    { name: 'Gallery', model: Gallery, imageFields: ['image'] },
    { name: 'Category', model: Category, imageFields: ['image', 'bannerImage'] },
  ];

  let totalImages = 0;
  let legacyUploads = 0;
  let cloudinaryImages = 0;
  let hasEagerVariants = 0;
  let usesWebp = 0;

  for (const { name, model, imageFields } of models) {
    console.log(`\nAnalyzing ${name} collection...`);
    const docs = await model.find({}).lean();

    for (const doc of docs) {
      for (const field of imageFields) {
        const val = doc[field];
        if (!val) continue;

        const processUrl = (url) => {
          totalImages++;
          if (url.includes('res.cloudinary.com')) {
            cloudinaryImages++;
            if (url.includes('/w_') || url.includes('/q_') || url.includes('/f_auto')) {
              hasEagerVariants++;
            }
            if (url.includes('f_webp') || url.includes('f_auto')) {
              usesWebp++;
            }
          } else {
            legacyUploads++;
          }
        };

        if (Array.isArray(val)) {
          val.forEach(processUrl);
        } else {
          processUrl(val);
        }
      }
    }
  }

  console.log('\n--- Legacy Media Audit Report ---');
  console.log(`Total Images Found: ${totalImages}`);
  console.log(
    `Cloudinary Optimized: ${cloudinaryImages} (${Math.round((cloudinaryImages / totalImages) * 100 || 0)}%)`,
  );
  console.log(
    `Legacy Uploads (Raw/Unoptimized): ${legacyUploads} (${Math.round((legacyUploads / totalImages) * 100 || 0)}%)`,
  );
  console.log(`Eager Variants Identified: ${hasEagerVariants}`);
  console.log(`Using WebP / Auto-Format: ${usesWebp}`);
  console.log(`---------------------------------`);
  console.log(`Migration Count: ${legacyUploads} images require migration to Cloudinary.`);

  await mongoose.disconnect();
}

runAudit().catch(console.error);
