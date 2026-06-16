import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Product from '../src/models/Product';
import Gallery from '../src/models/Gallery';
import Category from '../src/models/Category';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const EAGER_TRANSFORMATIONS = [
  { width: 400, crop: 'scale', format: 'webp' },
  { width: 800, crop: 'scale', format: 'webp' },
  { width: 1200, crop: 'scale', format: 'webp' },
];

async function uploadToCloudinary(url: string) {
  try {
    const isLocal = url.startsWith('/') && !url.startsWith('http');
    // If it's a local static path, we might need to point it to the actual deployed host or localhost
    // For migration purposes, if the image is hosted locally but we're running this, we need absolute URL
    let sourceUrl = url;
    if (isLocal) {
      const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      sourceUrl = `${baseUrl}${url}`;
    }

    const result = await cloudinary.uploader.upload(sourceUrl, {
      folder: 'eventdecor_migration',
      eager: EAGER_TRANSFORMATIONS,
      eager_async: true, // Don't wait for eager transformations to complete
    });

    // Return the secure URL with f_auto,q_auto injected by default as best practice
    // But since frontend injects it now, we can just return the raw secure_url
    return result.secure_url;
  } catch (error) {
    console.error(`Failed to upload ${url}:`, error);
    return null;
  }
}

async function migrateLegacyMedia() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Connected to MongoDB for migration');

  const models = [
    { name: 'Product', model: Product as any, imageFields: ['imageSrc', 'images'] },
    { name: 'Gallery', model: Gallery as any, imageFields: ['image'] },
    { name: 'Category', model: Category as any, imageFields: ['image', 'bannerImage'] },
  ];

  let migratedCount = 0;

  for (const { name, model, imageFields } of models) {
    console.log(`\nMigrating ${name} collection...`);
    const docs = await model.find({});

    for (const doc of docs) {
      let isModified = false;

      for (const field of imageFields) {
        const val = doc[field];
        if (!val) continue;

        const processUrl = async (url: string) => {
          if (!url.includes('res.cloudinary.com')) {
            console.log(`Migrating legacy URL: ${url}`);
            const newUrl = await uploadToCloudinary(url);
            if (newUrl) {
              migratedCount++;
              return newUrl;
            }
          }
          return url;
        };

        if (Array.isArray(val)) {
          const newArray = [];
          for (const url of val) {
            newArray.push(await processUrl(url));
            if (newArray[newArray.length - 1] !== url) isModified = true;
          }
          if (isModified) doc[field] = newArray;
        } else {
          const newUrl = await processUrl(val);
          if (newUrl !== val) {
            doc[field] = newUrl;
            isModified = true;
          }
        }
      }

      if (isModified) {
        await doc.save();
        console.log(`Updated document ID: ${doc._id} in ${name}`);
      }
    }
  }

  console.log(`\n--- Migration Complete ---`);
  console.log(`Total images migrated: ${migratedCount}`);

  await mongoose.disconnect();
}

migrateLegacyMedia().catch(console.error);
