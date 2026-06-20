import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { BackupService } from '../src/services/backupService';
import User from '../src/models/User';
import Order from '../src/models/Order';
import Product from '../src/models/Product';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const URI = process.env.MONGO_URI!;
const DR_URI = URI.replace(/\/[a-zA-Z0-9_-]+\?/, '/eventdecor_dr_test?');

const timings: Record<string, number> = {};

async function runDRDrill() {
  console.log('--- PHASE C: DISASTER RECOVERY DRILL ---');

  if (!process.env.FIELD_ENCRYPTION_KEY) {
    throw new Error('FIELD_ENCRYPTION_KEY missing. Cannot test encryption integrity.');
  }

  // 1. Setup & Pre-seed
  console.log('Connecting to Primary DB...');
  await mongoose.connect(URI);

  // Seed an encrypted secret to verify decryption later
  const dummyUser = await User.create({
    name: 'DR Test User',
    email: `dr_test_${Date.now()}@example.com`,
    passwordHash: 'dummy',
    twoFactorSecret: 'dr_secret_phrase_123',
    role: 'customer',
  });
  console.log('Seeded test user with encrypted twoFactorSecret.');

  const backupService = new BackupService();
  const dateStr = new Date().toISOString().split('T')[0];
  const backupRoot = path.resolve(__dirname, '../../backups/daily', dateStr);

  // 2. Backup & Manifest
  console.log('\\n[1/5] Initiating Cryptographic Backup...');
  let start = Date.now();
  await backupService.createJsonBackup('daily');
  timings['Backup & Manifest Generation'] = Date.now() - start;

  // 3. Checksum Verification
  console.log('\\n[2/5] Verifying Checksums independently...');
  start = Date.now();
  const manifestPath = path.join(backupRoot, '_backup_manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('Manifest not generated!');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const [colName, meta] of Object.entries(manifest.collections) as [string, any][]) {
    const filePath = path.join(backupRoot, `${colName}.json`);
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    if (hash !== meta.sha256) {
      throw new Error(`Checksum mismatch for ${colName}. Expected ${meta.sha256}, got ${hash}`);
    }
    console.log(` ✓ ${colName}: Checksum verified (${meta.count} records)`);
  }
  timings['Checksum Verification'] = Date.now() - start;

  // 4. Disconnect Primary, Connect Recovery
  await mongoose.disconnect();
  console.log('\\n[3/5] Connecting to Isolated Recovery DB (eventdecor_dr_test)...');
  await mongoose.connect(DR_URI);

  // Clean old DR if exists
  try {
    const collections = await mongoose.connection.db!.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db!.dropCollection(col.name);
    }
  } catch (e) {}

  // 5. Restore Phase
  console.log('\\n[4/5] Restoring Data to Recovery DB...');
  start = Date.now();
  for (const [colName, meta] of Object.entries(manifest.collections) as [string, any][]) {
    if (meta.count === 0) continue;
    const filePath = path.join(backupRoot, `${colName}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Convert string _id and dates back to proper BSON types inside insertMany implicitly or via Mongoose
    // Since we dumped JSON, native mongo insertion might leave them as strings if we don't map them.
    // Actually, Mongoose models will cast them correctly if we use Model.insertMany!

    try {
      const collection = mongoose.connection.collection(colName);
      // Quick and dirty BSON cast for _id and dates
      const formattedData = data.map((d: any) => {
        if (d._id) d._id = new mongoose.Types.ObjectId(d._id);
        if (d.createdAt) d.createdAt = new Date(d.createdAt);
        if (d.updatedAt) d.updatedAt = new Date(d.updatedAt);
        if (colName === 'orders') {
          if (d.user) d.user = new mongoose.Types.ObjectId(d.user);
          d.items?.forEach((i: any) => {
            if (i.productId) i.productId = new mongoose.Types.ObjectId(i.productId);
          });
        }
        return d;
      });
      await collection.insertMany(formattedData);
      console.log(` ✓ Restored ${colName}: ${data.length} records`);
    } catch (e: any) {
      console.error(`Failed to restore ${colName}:`, e.message);
      throw e;
    }
  }
  timings['Restore'] = Date.now() - start;

  // 6. Verification Phase
  console.log('\\n[5/5] Performing Integrity Checks...');
  start = Date.now();

  let referentialPass = true;
  let encryptionPass = true;

  // Encryption Check
  const restoredUser = await User.findById(dummyUser._id).select('+twoFactorSecret');
  if (!restoredUser || restoredUser.twoFactorSecret !== 'dr_secret_phrase_123') {
    console.error(
      ` ❌ Encryption Verification FAILED! Expected 'dr_secret_phrase_123', got '${restoredUser?.twoFactorSecret}'`,
    );
    encryptionPass = false;
  } else {
    console.log(
      ` ✓ Encryption Verification PASSED: FIELD_ENCRYPTION_KEY decrypted records flawlessly.`,
    );
  }

  // Referential Integrity (Orders)
  const sampleOrders = await Order.find().limit(50).lean();
  let brokenRefs = 0;
  for (const o of sampleOrders) {
    const userExists = await User.exists({ _id: o.user });
    if (!userExists) brokenRefs++;
    for (const item of o.items) {
      const prodExists = await Product.exists({ _id: item.productId });
      if (!prodExists) brokenRefs++;
    }
  }
  if (brokenRefs > 0) {
    console.error(
      ` ❌ Referential Integrity FAILED! Found ${brokenRefs} broken references in sample.`,
    );
    referentialPass = false;
  } else {
    console.log(
      ` ✓ Referential Integrity PASSED: Users and Products correctly mapped on restored Orders.`,
    );
  }
  timings['Integrity Checks'] = Date.now() - start;

  // 7. Cleanup
  console.log('\\n[Cleanup] Destroying Recovery DB...');
  start = Date.now();
  try {
    const collections = await mongoose.connection.db!.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db!.dropCollection(col.name);
    }
  } catch (e) {}
  await mongoose.disconnect();

  // Also connect to primary and drop dummy user
  await mongoose.connect(URI);
  await User.findByIdAndDelete(dummyUser._id);
  await mongoose.disconnect();
  timings['Cleanup'] = Date.now() - start;

  // 8. Output Report
  console.log('\\n=========================================');
  console.log('       FINAL DR DRILL REPORT             ');
  console.log('=========================================');

  const totalRto =
    timings['Backup & Manifest Generation'] + timings['Restore'] + timings['Integrity Checks'];

  console.log(`Backup Creation:       PASS (${timings['Backup & Manifest Generation']}ms)`);
  console.log(`Checksum Validation:   PASS (${timings['Checksum Verification']}ms)`);
  console.log(`Restoration:           PASS (${timings['Restore']}ms)`);
  console.log(`Encryption Integrity:  ${encryptionPass ? 'PASS' : 'FAIL'} `);
  console.log(`Referential Integrity: ${referentialPass ? 'PASS' : 'FAIL'} `);
  console.log(`Cleanup:               PASS (${timings['Cleanup']}ms)`);
  console.log('-----------------------------------------');
  console.log(`Estimated RTO:         ~${(totalRto / 1000).toFixed(2)} seconds`);
  console.log('=========================================');

  if (!encryptionPass || !referentialPass) process.exit(1);
}

runDRDrill().catch(console.error);
