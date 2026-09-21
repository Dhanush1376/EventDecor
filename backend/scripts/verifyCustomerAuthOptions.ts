import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import StoreSettings from '../src/models/StoreSettings';
import storeSettingsService from '../src/services/StoreSettingsService';

async function verify() {
  console.log('=== STARTING CUSTOMER AUTH METHOD VERIFICATION ===\n');

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not found');

  await mongoose.connect(uri);
  console.log('[1] Connected to MongoDB Atlas.');

  const adminId = new mongoose.Types.ObjectId('65a123456789abcdef123456');

  // Test 1: Update customerAuthMethod to 'phone_only'
  console.log('\n[2] Setting customerAuthMethod to "phone_only"...');
  await storeSettingsService.updateSection(
    'storefront',
    {
      seoTitle: 'Siri Arts and Crafts',
      seoDescription: 'Premium Handicrafts and Luxury Event Decor',
      customerAuthMethod: 'phone_only',
    },
    adminId,
  );

  let doc = await StoreSettings.findOne();
  console.log('MongoDB doc.storefront.customerAuthMethod:', doc?.storefront?.customerAuthMethod);
  if (doc?.storefront?.customerAuthMethod !== 'phone_only') {
    throw new Error('Expected doc.storefront.customerAuthMethod to be phone_only');
  }

  let publicSettings = await storeSettingsService.getPublicSettings();
  console.log('Public API customerAuthMethod:', publicSettings.storefront?.customerAuthMethod);
  if (publicSettings.storefront?.customerAuthMethod !== 'phone_only') {
    throw new Error('Expected publicSettings.storefront.customerAuthMethod to be phone_only');
  }
  console.log('PASS: phone_only successfully persisted in MongoDB and exposed in Public API');

  // Test 2: Update customerAuthMethod to 'email_only'
  console.log('\n[3] Setting customerAuthMethod to "email_only"...');
  await storeSettingsService.updateSection(
    'storefront',
    {
      seoTitle: 'Siri Arts and Crafts',
      seoDescription: 'Premium Handicrafts and Luxury Event Decor',
      customerAuthMethod: 'email_only',
    },
    adminId,
  );

  doc = await StoreSettings.findOne();
  console.log('MongoDB doc.storefront.customerAuthMethod:', doc?.storefront?.customerAuthMethod);
  if (doc?.storefront?.customerAuthMethod !== 'email_only') {
    throw new Error('Expected doc.storefront.customerAuthMethod to be email_only');
  }

  publicSettings = await storeSettingsService.getPublicSettings();
  console.log('Public API customerAuthMethod:', publicSettings.storefront?.customerAuthMethod);
  if (publicSettings.storefront?.customerAuthMethod !== 'email_only') {
    throw new Error('Expected publicSettings.storefront.customerAuthMethod to be email_only');
  }
  console.log('PASS: email_only successfully persisted in MongoDB and exposed in Public API');

  // Test 3: Reset customerAuthMethod back to 'both'
  console.log('\n[4] Resetting customerAuthMethod to "both"...');
  await storeSettingsService.updateSection(
    'storefront',
    {
      seoTitle: 'Siri Arts and Crafts',
      seoDescription: 'Premium Handicrafts and Luxury Event Decor',
      customerAuthMethod: 'both',
    },
    adminId,
  );

  doc = await StoreSettings.findOne();
  console.log('MongoDB doc.storefront.customerAuthMethod:', doc?.storefront?.customerAuthMethod);
  if (doc?.storefront?.customerAuthMethod !== 'both') {
    throw new Error('Expected doc.storefront.customerAuthMethod to be both');
  }

  publicSettings = await storeSettingsService.getPublicSettings();
  console.log('Public API customerAuthMethod:', publicSettings.storefront?.customerAuthMethod);
  if (publicSettings.storefront?.customerAuthMethod !== 'both') {
    throw new Error('Expected publicSettings.storefront.customerAuthMethod to be both');
  }
  console.log('PASS: both successfully persisted in MongoDB and exposed in Public API');

  console.log('\n✅ ALL CUSTOMER AUTH METHOD VERIFICATIONS PASSED!\n');

  await mongoose.disconnect();
  process.exit(0);
}

verify().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
