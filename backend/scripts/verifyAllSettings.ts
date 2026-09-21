import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import StoreSettings from '../src/models/StoreSettings';
import StoreSettingsService from '../src/services/StoreSettingsService';
import { getStoreConfigSync, getStoreLegalDetails } from '../src/config/storeConfig';
import { generateInvoicePDF } from '../src/utils/pdfGenerator';

async function runVerification() {
  console.log('--- STARTING STORE SETTINGS VERIFICATION ---');

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI not found in env');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // 1. Fetch current settings from DB
  const settings = await StoreSettingsService.getSettings(true);
  console.log('\n[1] Current Settings in DB:');
  console.log('  Store Name:', settings.general.storeName);
  console.log('  Tagline:', settings.general.tagline);
  console.log('  Support Email:', settings.general.supportEmail);
  console.log('  Phone:', settings.general.phone);
  console.log('  Alternate Phone:', settings.general.alternatePhone);
  console.log('  WhatsApp Number:', settings.general.whatsappNumber);
  console.log('  Support Hours:', settings.contact.supportHours);
  console.log('  Address:', settings.contact.address);
  console.log('  City:', settings.contact.city);
  console.log('  State:', settings.contact.state);
  console.log('  Postal Code:', settings.contact.postalCode);
  console.log('  Country:', settings.contact.country);
  console.log('  Legal Company Name:', settings.legal.legalCompanyName);
  console.log('  CIN:', settings.legal.cin);
  console.log('  Registered Address:', settings.legal.registeredAddress);

  // 2. Test getStoreConfigSync()
  const syncIdentity = getStoreConfigSync();
  console.log('\n[2] getStoreConfigSync() in-memory resolution:');
  console.log('  Name:', syncIdentity.name);
  console.log('  Email:', syncIdentity.contact.email);
  console.log('  Phone:', syncIdentity.contact.phone);
  console.log('  Alternate Phone:', syncIdentity.contact.alternatePhone);
  console.log('  WhatsApp:', syncIdentity.contact.whatsappNumber);
  console.log('  Address:', syncIdentity.contact.address);

  // 3. Test updateSection immediate cache refresh
  console.log('\n[3] Testing updateSection cache refresh...');
  const testTagline = 'Handcrafted Heritage & Artistry';
  const testLegalName = 'Siri Arts and Crafts Private Limited';
  const testCin = 'U74999AP2026PTC123456';
  const testRegisteredAddr =
    '#28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh';

  // Save updated general and legal
  await StoreSettingsService.updateSection(
    'general',
    { tagline: testTagline },
    new mongoose.Types.ObjectId('65a123456789abcdef123456'),
  );
  await StoreSettingsService.updateSection(
    'legal',
    {
      legalCompanyName: testLegalName,
      cin: testCin,
      registeredAddress: testRegisteredAddr,
    },
    new mongoose.Types.ObjectId('65a123456789abcdef123456'),
  );

  const refreshedSync = getStoreConfigSync();
  console.log('  Refreshed in-memory Name:', refreshedSync.name);
  console.log('  Refreshed in-memory Address:', refreshedSync.contact.address);

  // 4. Test getStoreLegalDetails
  const updatedSettings = await StoreSettingsService.getSettings(true);
  const legalDetails = getStoreLegalDetails(updatedSettings);
  console.log('\n[4] getStoreLegalDetails() output:');
  console.log('  Legal Name:', legalDetails.legalName);
  console.log('  GSTIN:', legalDetails.gstin);
  console.log('  CIN:', legalDetails.cin);
  console.log('  Address:', legalDetails.address);
  console.log('  Registered Address:', legalDetails.registeredAddress);

  if (legalDetails.legalName !== testLegalName) {
    console.error(
      'FAIL: Legal Name mismatch. Expected:',
      testLegalName,
      'Got:',
      legalDetails.legalName,
    );
  } else {
    console.log('  PASS: Legal Name resolved correctly to legalCompanyName.');
  }

  if (legalDetails.cin !== testCin) {
    console.error('FAIL: CIN mismatch. Expected:', testCin, 'Got:', legalDetails.cin);
  } else {
    console.log('  PASS: CIN resolved correctly.');
  }

  // 5. Test PDF Generation
  console.log('\n[5] Testing PDF Generation with complete address, tagline, and CIN...');
  const mockOrderData = {
    orderId: 'ORD-TEST-2026-99',
    date: new Date(),
    customerName: 'Dhanush',
    shippingAddress: {
      name: 'Dhanush',
      address: 'Flat 101, Test Residency',
      city: 'Ongole',
      state: 'Andhra Pradesh',
      pincode: '523001',
    },
    items: [{ name: 'Handcrafted Brass Diya', quantity: 2, price: 999 }],
    subtotal: 1998,
    shipping: 0,
    total: 1998,
    invoiceNumber: 'INV-TEST-0099',
    paymentMethod: 'ONLINE_PREPAID',
    store: {
      displayName: updatedSettings.general.storeName,
      legalCompanyName: updatedSettings.legal.legalCompanyName,
      tagline: updatedSettings.general.tagline,
      gstin: updatedSettings.taxes.gstNumber,
      cin: updatedSettings.legal.cin,
      addressLine1: updatedSettings.contact.address,
      city: updatedSettings.contact.city,
      state: updatedSettings.contact.state,
      postalCode: updatedSettings.contact.postalCode,
      country: updatedSettings.contact.country,
    },
  };

  const pdfBuffer = await generateInvoicePDF(mockOrderData as any);
  console.log('  PASS: PDF Buffer generated successfully. Size:', pdfBuffer.length, 'bytes');

  // Verify buffer contains expected text elements by decompressing PDF streams
  const zlib = require('zlib');
  let extractedText = '';
  const bufferString = pdfBuffer.toString('binary');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(bufferString)) !== null) {
    try {
      const decompressed = zlib.inflateSync(Buffer.from(match[1], 'binary'));
      extractedText += decompressed.toString('utf-8') + '\n';
    } catch (e) {
      // not compressed or different format
    }
  }

  // Decode hex tokens in PDF stream (PDFKit outputs [<hex> kern <hex>] TJ)
  let plainText = '';
  const hexRegex = /<([0-9a-fA-F]+)>/g;
  let hexMatch;
  while ((hexMatch = hexRegex.exec(extractedText)) !== null) {
    plainText += Buffer.from(hexMatch[1], 'hex').toString('utf-8');
  }

  const hasGstin = plainText.includes(updatedSettings.taxes.gstNumber);
  const hasCin = plainText.includes(testCin);
  const hasStoreName = plainText.includes('Siri Arts');
  const hasTagline = plainText.includes(testTagline);
  const hasAddress = plainText.includes('South Street');

  console.log('  Decoded Plain Text from PDF:');
  console.log('    Store / Legal Name:', hasStoreName ? 'FOUND' : 'NOT FOUND');
  console.log('    Tagline:', hasTagline ? 'FOUND' : 'NOT FOUND');
  console.log('    GSTIN:', hasGstin ? 'FOUND' : 'NOT FOUND');
  console.log('    CIN:', hasCin ? 'FOUND' : 'NOT FOUND');
  console.log('    Street Address:', hasAddress ? 'FOUND' : 'NOT FOUND');

  if (!hasTagline || !hasCin || !hasAddress || !hasGstin) {
    console.error('PDF text missing expected elements. Decoded text:', plainText);
  } else {
    console.log('  PASS: PDF contains Tagline, CIN, GSTIN, and full Street Address!');
  }

  await mongoose.disconnect();
  console.log('\n--- VERIFICATION COMPLETE ---');
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
