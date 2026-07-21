/**
 * Migration Script: Backfill Invoice Snapshots
 *
 * This script populates the `invoice`, `store`, and `tax` snapshot fields
 * on all existing Order documents that were created before the snapshot system.
 *
 * IMPORTANT DESIGN DECISIONS:
 * 1. Tax values are derived from the stored order.total using CURRENT tax config.
 *    Since we cannot reconstruct historical tax config, this is the best approximation.
 * 2. All backfilled invoices are marked with `migrationGenerated: true` so the
 *    frontend can show a warning that these values may be approximate.
 * 3. Invoice numbers are generated using SequenceGeneratorService to maintain
 *    the sequential numbering guarantee.
 *
 * Usage:
 *   npx ts-node src/scripts/backfillInvoiceSnapshots.ts
 *   npx ts-node src/scripts/backfillInvoiceSnapshots.ts --dry-run
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import Order from '../models/Order';
import storeSettingsService from '../services/StoreSettingsService';
import { SequenceGeneratorService } from '../services/SequenceGeneratorService';
import logger from '../config/logger';

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 50;

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ No MONGODB_URI found in environment');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE — no changes will be saved\n');
  }

  // Fetch current store settings for the store snapshot
  const settings = await storeSettingsService.getSettings(true);

  const storeSnapshot = {
    displayName: settings.general.storeName || '',
    legalCompanyName: settings.legal.legalCompanyName || settings.legal.companyName || '',
    logo: settings.general.logo || '',
    gstin: settings.taxes.gstNumber || '',
    addressLine1: settings.contact.addressLine1 || settings.contact.address || '',
    addressLine2: settings.contact.addressLine2 || '',
    city: settings.contact.city || '',
    state: settings.contact.state || '',
    country: settings.contact.country || 'India',
    postalCode: settings.contact.postalCode || '',
    email: settings.general.supportEmail || settings.contact.email || '',
    phone: settings.contact.phone || '',
  };

  const taxRate = settings.taxes.gstRate || 0.18;
  const cgstRate = settings.taxes.cgstRate || 0.09;
  const sgstRate = settings.taxes.sgstRate || 0.09;
  const taxInclusive = settings.taxes.taxInclusive !== false;

  // Find all orders missing the invoice snapshot
  const query = {
    $or: [{ 'invoice.number': { $exists: false } }, { 'invoice.number': null }],
  };

  const totalCount = await Order.countDocuments(query);
  console.log(`📦 Found ${totalCount} orders missing invoice snapshots\n`);

  if (totalCount === 0) {
    console.log('✅ Nothing to migrate');
    await mongoose.disconnect();
    return;
  }

  let processed = 0;
  let errors = 0;

  // Process in batches
  while (processed < totalCount) {
    const orders = await Order.find(query)
      .sort({ createdAt: 1 })
      .skip(0) // Always 0 because we update as we go
      .limit(BATCH_SIZE)
      .lean();

    if (orders.length === 0) break;

    for (const order of orders) {
      try {
        const orderId = order._id.toString();
        const total = order.total || 0;
        const subtotal = order.subtotal || 0;
        const discount = order.discount || 0;

        // Generate sequential invoice number
        // If order already has an invoiceNumber field, use it; otherwise generate new
        let invoiceNumber = order.invoiceNumber;
        if (!invoiceNumber || invoiceNumber.includes(orderId.slice(-6))) {
          // Old fake invoice number or missing — generate a real one
          invoiceNumber = await SequenceGeneratorService.generateInvoiceNumber(
            new Date(order.createdAt).getFullYear(),
          );
        }

        // Build tax snapshot from stored totals (best approximation)
        let taxableAmount: number;
        let totalTax: number;

        if (taxInclusive) {
          taxableAmount = parseFloat((total / (1 + taxRate)).toFixed(2));
          totalTax = parseFloat((total - taxableAmount).toFixed(2));
        } else {
          taxableAmount = subtotal - discount;
          totalTax = parseFloat((taxableAmount * taxRate).toFixed(2));
        }

        const cgstRatio = cgstRate / (taxRate || 1);
        const sgstRatio = sgstRate / (taxRate || 1);

        const taxSnapshot = {
          subtotal,
          discount,
          taxableAmount,
          cgst: parseFloat((totalTax * cgstRatio).toFixed(2)),
          sgst: parseFloat((totalTax * sgstRatio).toFixed(2)),
          igst: 0,
          totalTax,
          grandTotal: total,
          currency: 'INR',
          currencySymbol: '₹',
        };

        const invoiceData = {
          number: invoiceNumber,
          issuedAt: order.createdAt,
          generatedAt: new Date(),
          migrationGenerated: true,
        };

        if (DRY_RUN) {
          console.log(`  [DRY] Order ${orderId} → ${invoiceNumber} (₹${total})`);
        } else {
          await Order.updateOne(
            { _id: order._id },
            {
              $set: {
                invoice: invoiceData,
                store: storeSnapshot,
                tax: taxSnapshot,
                invoiceNumber: invoiceNumber,
              },
            },
          );
        }

        processed++;
      } catch (err: any) {
        errors++;
        logger.error(`Failed to backfill order ${order._id}:`, err);
        console.error(`  ❌ Order ${order._id}: ${err.message}`);
        // Skip this order and continue
        processed++;
      }
    }

    const pct = ((processed / totalCount) * 100).toFixed(1);
    console.log(`  Progress: ${processed}/${totalCount} (${pct}%)`);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Migration complete`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Errors:    ${errors}`);
  console.log(`   Mode:      ${DRY_RUN ? 'DRY RUN (no changes saved)' : 'LIVE'}`);
  console.log(`${'═'.repeat(50)}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
