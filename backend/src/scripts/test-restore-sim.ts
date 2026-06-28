import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const testRestore = async () => {
  console.log('� Testing Restore Process...');
  try {
    // Connect to a temporary test database
    const testUri = process.env.MONGO_URI!.replace(
      'siri-arts-crafts',
      'siri-arts-crafts-test-restore',
    );
    await mongoose.connect(testUri);
    console.log('Connected to temporary restore database: siri-arts-crafts-test-restore');

    // Find latest backup
    const backupDir = path.resolve(__dirname, '../../recovery/backups');
    const backupFiles = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('products_daily_export_'))
      .sort()
      .reverse();

    if (backupFiles.length === 0) {
      throw new Error('No backup files found!');
    }

    const latestBackup = path.join(backupDir, backupFiles[0]);
    console.log(`� Using backup file: ${backupFiles[0]}`);

    const backupData = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));
    console.log(
      `� Found in backup: ${backupData.products.length} Products, ${backupData.categories.length} Categories, ${backupData.galleries.length} Galleries`,
    );

    // Restore to temp database
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection failed');

    await db.collection('products_test').deleteMany({});

    // Cast ObjectIDs
    const formattedProducts = backupData.products.map((p: any) => ({
      ...p,
      _id: new mongoose.Types.ObjectId(p._id),
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }));

    await db.collection('products_test').insertMany(formattedProducts);

    const restoredCount = await db.collection('products_test').countDocuments();
    console.log(`Restore Successful! Restored document count: ${restoredCount}`);

    if (restoredCount === backupData.products.length) {
      console.log('🎯 VERIFICATION PASSED: Restored count matches backup count.');
    } else {
      console.log('VERIFICATION FAILED: Counts do not match.');
    }

    // Cleanup temp collection
    await db.collection('products_test').drop();
    await mongoose.disconnect();
    console.log('🧹 Cleaned up temporary test database.');
  } catch (error) {
    console.error('Restore test failed:', error);
  }
};

testRestore();
