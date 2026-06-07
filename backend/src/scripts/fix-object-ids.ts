import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB } from '../config/db';

async function fixObjectIds() {
  // 1. Critical Safeguards
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: fix-object-ids.ts cannot be run in production mode.');
    process.exit(1);
  }

  const MONGO_URI = process.env.MONGO_URI || '';
  if (MONGO_URI.includes('mongodb.net') || MONGO_URI.includes('mongodb+srv')) {
    console.error('❌ FATAL: fix-object-ids.ts cannot be run against an Atlas cluster.');
    process.exit(1);
  }

  if (process.env.I_KNOW_THIS_WIPES_DATA !== 'true') {
    console.error('❌ FATAL: Must set I_KNOW_THIS_WIPES_DATA=true to authorize mass data modification.');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB via safe connection manager...');
  await connectDB();
  const db = mongoose.connection.db!;
  const collections = await db.collections();

  let totalFixed = 0;

  for (const collection of collections) {
    console.log(`Processing collection: ${collection.collectionName}`);
    
    // Find all documents where _id is a string
    const docs = await collection.find({ _id: { $type: 'string' } }).toArray();
    
    if (docs.length === 0) {
      continue;
    }

    console.log(`Found ${docs.length} documents with string _id in ${collection.collectionName}`);

    // We have to delete and re-insert to change the type of _id
    const bulkOps = docs.map(doc => {
      const oldId = doc._id;
      
      // Recursively fix all string ObjectIds in the document
      const fixStrings = (obj: any): any => {
        if (!obj) return obj;
        if (typeof obj === 'string' && /^[0-9a-fA-F]{24}$/.test(obj)) {
          return new mongoose.Types.ObjectId(obj);
        }
        if (Array.isArray(obj)) {
          return obj.map(fixStrings);
        }
        if (typeof obj === 'object') {
          // Keep Dates as Dates
          if (obj instanceof Date) return obj;
          if (obj instanceof mongoose.Types.ObjectId) return obj;
          
          const newObj: any = {};
          for (const key of Object.keys(obj)) {
            newObj[key] = fixStrings(obj[key]);
          }
          return newObj;
        }
        return obj;
      };

      const fixedDoc = fixStrings(doc);
      
      return [
        { deleteOne: { filter: { _id: oldId } } },
        { insertOne: { document: fixedDoc } }
      ];
    }).flat();

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps as any);
      console.log(`Fixed ${docs.length} documents in ${collection.collectionName}`);
      totalFixed += docs.length;
    }
  }

  console.log(`\nDONE. Total documents fixed: ${totalFixed}`);
  process.exit(0);
}

fixObjectIds().catch(console.error);
