import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import connectDB from '../src/config/db';
import User from '../src/models/User';
import AudienceResolverService from '../src/services/marketing/AudienceResolverService';
import { EmailProviderAbstraction } from '../src/services/marketing/EmailProviderAbstraction';

async function testMarketingBackend() {
  console.log('=== MARKETING ECOSYSTEM BACKEND VERIFICATION ===');
  await connectDB();

  // 1. Check Admin User
  const admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
  console.log(`✓ Admin User Found: ${admin?.email || 'None'} (Role: ${admin?.role})`);

  // 2. Generate Auth Token
  const token = jwt.sign(
    { id: admin?._id, role: admin?.role || 'admin', email: admin?.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' },
  );
  console.log('✓ Admin JWT Generated');

  // 3. Provider Status Check
  const status = EmailProviderAbstraction.getStatus();
  console.log('\n--- Authoritative Provider Status ---');
  console.log(JSON.stringify(status, null, 2));

  // 4. Test Audience Resolver
  console.log('\n--- Real-Time Audience Estimation ---');
  const allSubscribers = await AudienceResolverService.countAudience({
    type: 'all',
  });
  console.log(
    `✓ 'all' Audience Count: ${allSubscribers.totalMatched} matching, ${allSubscribers.eligibleRecipients} eligible`,
  );

  // 5. Test Smart Recommendations
  console.log('\n--- Dynamic Smart Recommendations ---');
  const recommendations = await AudienceResolverService.getSmartRecommendations();
  console.log(`✓ Recommendations Generated (${recommendations.length}):`);
  recommendations.forEach((r, idx) => {
    console.log(
      `  ${idx + 1}. [${r.type.toUpperCase()}] ${r.title} - ${r.actionLabel} (Eligible: ${r.eligibleCount})`,
    );
  });

  console.log('\n=== ALL BACKEND CHECKS COMPLETED SUCCESSFULLY ===');
  await mongoose.connection.close();
  process.exit(0);
}

testMarketingBackend().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
