// Offline Restore Verification Script
// Run this script after manually executing a mongorestore in an emergency

const mongoose = require('mongoose');
require('dotenv').config();

async function runVerification() {
  console.log('=== Starting Post-Restore Offline Verification ===');

  if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI is not set in environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[+] Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Admin Access Check
    const adminCount = await db.collection('users').countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.error('[-] FAILED: No admin users found. Dashboard will be inaccessible.');
    } else {
      console.log(`[+] PASSED: Found ${adminCount} admin users.`);
    }

    // 2. Product Integrity
    const productCount = await db.collection('products').countDocuments();
    if (productCount === 0) {
      console.error('[-] FAILED: No products found.');
    } else {
      console.log(`[+] PASSED: Found ${productCount} products.`);
    }

    // 3. Settings Check
    const settings = await db.collection('storesettings').findOne();
    if (!settings) {
      console.warn('[-] WARNING: Store settings not found. System may use defaults.');
    } else {
      console.log('[+] PASSED: Store settings recovered.');
    }

    console.log('=== Verification Complete ===');
    process.exit(0);
  } catch (err) {
    console.error('ERROR during verification:', err);
    process.exit(1);
  }
}

runVerification();
