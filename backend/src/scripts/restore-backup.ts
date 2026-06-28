import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB } from '../config/db';

const backupPath = path.resolve(
  __dirname,
  '../../recovery/backups/full_backup_2026-06-06T11-50-54-577Z.json',
);

async function restoreBackup() {
  console.log('Starting robust database restoration with Mongoose casting...');

  // 1. Critical Safeguards
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: restore-backup.ts cannot be run in production mode.');
    process.exit(1);
  }

  const MONGO_URI = process.env.MONGO_URI || '';
  if (MONGO_URI.includes('mongodb.net') || MONGO_URI.includes('mongodb+srv')) {
    console.error('FATAL: restore-backup.ts cannot be run against an Atlas cluster.');
    process.exit(1);
  }

  if (process.env.I_KNOW_THIS_WIPES_DATA !== 'true') {
    console.error('FATAL: Must set I_KNOW_THIS_WIPES_DATA=true to authorize mass deletion.');
    process.exit(1);
  }

  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found at ${backupPath}`);
    process.exit(1);
  }

  // Connect to DB
  console.log('� Connecting to MongoDB via safe connection manager...');
  await connectDB();
  console.log('� Connected.');

  // Dynamically load all models to register them
  const modelsDir = path.resolve(__dirname, '../models');
  if (fs.existsSync(modelsDir)) {
    const files = fs.readdirSync(modelsDir);
    for (const file of files) {
      if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        try {
          console.log('Requiring model:', file);
          require(path.join(modelsDir, file));
        } catch (e: any) {
          console.log('Failed requiring model:', file, e.message);
        }
      }
    }
  }

  const modelMap: Record<string, mongoose.Model<any>> = {};
  for (const modelName of Object.keys(mongoose.models)) {
    const model = mongoose.models[modelName];
    modelMap[model.collection.collectionName] = model;
  }

  console.log(`Loaded ${Object.keys(modelMap).length} Mongoose models for schema casting.`);

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const collections = Object.keys(backupData);

  for (const collectionName of collections) {
    const documents = backupData[collectionName];
    if (!Array.isArray(documents) || documents.length === 0) {
      console.log(`⏩ Skipping ${collectionName} (0 documents)`);
      continue;
    }

    console.log(`\n⏳ Restoring ${documents.length} documents into '${collectionName}'...`);
    const Model = modelMap[collectionName];
    const nativeCollection = mongoose.connection.collection(collectionName);

    // Clear existing collection safely (bypassing DestructionGuard logic which protects Models)
    await nativeCollection.deleteMany({});

    if (Model) {
      console.log(`   └ Using Mongoose Model [${Model.modelName}] to cast ObjectIds and Dates`);
      // We process in chunks to prevent memory bloat, although 1500 docs is small enough
      try {
        await Model.insertMany(documents, { validateBeforeSave: false, rawResult: true } as any);
        console.log(`Successfully restored '${collectionName}'with casting`);
      } catch (err: any) {
        console.error(`Mongoose insertMany failed for ${collectionName}:`, err.message);
        await nativeCollection.deleteMany({});

        const fixStrings = (obj: any): any => {
          if (!obj) return obj;
          if (typeof obj === 'string' && /^[0-9a-fA-F]{24}$/.test(obj)) {
            return new mongoose.Types.ObjectId(obj);
          }
          if (Array.isArray(obj)) return obj.map(fixStrings);
          if (typeof obj === 'object') {
            if (obj instanceof Date || obj instanceof mongoose.Types.ObjectId) return obj;
            const newObj: any = {};
            for (const key of Object.keys(obj)) newObj[key] = fixStrings(obj[key]);
            return newObj;
          }
          return obj;
        };

        const fallbackDocs = documents.map((doc: any) => fixStrings(doc));
        await nativeCollection.insertMany(fallbackDocs);
        console.log(`Successfully restored '${collectionName}'with manual fallback casting`);
      }
    } else {
      console.log(`   └ No Mongoose model found, inserting via native driver`);
      const fixStrings = (obj: any): any => {
        if (!obj) return obj;
        if (typeof obj === 'string' && /^[0-9a-fA-F]{24}$/.test(obj)) {
          return new mongoose.Types.ObjectId(obj);
        }
        if (Array.isArray(obj)) return obj.map(fixStrings);
        if (typeof obj === 'object') {
          if (obj instanceof Date || obj instanceof mongoose.Types.ObjectId) return obj;
          const newObj: any = {};
          for (const key of Object.keys(obj)) newObj[key] = fixStrings(obj[key]);
          return newObj;
        }
        return obj;
      };
      const fallbackDocs = documents.map((doc: any) => fixStrings(doc));
      await nativeCollection.insertMany(fallbackDocs);
      console.log(`Successfully restored '${collectionName}'with manual fallback casting`);
    }
  }

  // Restore PRODUCTS separately
  const productsBackupPath = path.resolve(
    __dirname,
    '../../recovery/backups/products_daily_export_2026-06-06T11-57-47-535Z.json',
  );
  if (fs.existsSync(productsBackupPath)) {
    console.log('\n� Restoring separate products daily export...');
    const productsData = JSON.parse(fs.readFileSync(productsBackupPath, 'utf8'));
    if (productsData && productsData.products && Array.isArray(productsData.products)) {
      const nativeCollection = mongoose.connection.collection('products');
      await nativeCollection.deleteMany({});

      const Model = modelMap['products'];
      if (Model) {
        await Model.insertMany(productsData.products, { validateBeforeSave: false } as any);
        console.log(`Successfully restored ${productsData.products.length} products with casting!`);
      } else {
        const formattedProducts = productsData.products.map((p: any) => ({
          ...p,
          _id: new mongoose.Types.ObjectId(p._id),
        }));
        await nativeCollection.insertMany(formattedProducts);
        console.log(`Successfully restored ${formattedProducts.length} products (manual casting)!`);
      }
    }
  }

  console.log('\n🎉 FULL RESTORATION COMPLETE!');
  process.exit(0);
}

restoreBackup().catch((err) => {
  console.error('\n Restoration failed:', err);
  process.exit(1);
});
