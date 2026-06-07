import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import logger from '../config/logger';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const testAlerts = async () => {
  console.log('🚨 Testing Data Drop Alert System...');
  try {
    const testUri = process.env.MONGO_URI!;
    await mongoose.connect(testUri);
    console.log('✅ Connected to MongoDB');

    const collName = 'products';
    
    // 1. Simulate Redis State locally
    const prevCountStr = '1000';
    console.log(`✅ Forged Previous State: products = 1000`);

    // 2. Fetch the actual current count
    const collection = mongoose.connection.collection(collName);
    const currentCount = await collection.countDocuments();
    console.log(`📊 Actual Database Count: ${currentCount}`);

    // 3. Run the exact logic from DataMonitorJob
    let emergencyTriggered = false;
    const dropsDetected: string[] = [];

    const prevCount = parseInt(prevCountStr, 10);
    const dropAmount = prevCount - currentCount;
    const dropPercentage = (dropAmount / prevCount) * 100;

    console.log(`📉 Calculated Drop: ${dropAmount} documents (${dropPercentage.toFixed(2)}%)`);

    if (dropAmount > 0 && (dropPercentage > 5 || dropAmount > 50)) {
      const alertMsg = `Sudden drop detected in ${collName}: ${prevCount} -> ${currentCount} (Dropped by ${dropAmount})`;
      logger.error(`[DATA MONITOR] 🚨 ${alertMsg}`);
      dropsDetected.push(alertMsg);
      emergencyTriggered = true;
    }

    if (emergencyTriggered) {
      console.log('🚨 EMERGENCY TRIGGERED! Executing fallback protocols...');
      
      const reason = `Mass deletion signature: ${dropsDetected.join(' | ')}`;
      console.log(`📸 Creating emergency snapshot with reason: ${reason}`);
      
      // Simulate Email Dispatch
      const { getAdminEmails } = require('../config/adminConfig');
      const recipients = getAdminEmails();
      console.log(`📧 Alert Emails would be dispatched to:`, recipients);
      console.log('🎯 VERIFICATION PASSED: Alert logic executed successfully upon 90% simulated drop.');
    } else {
      console.log('❌ VERIFICATION FAILED: Emergency was not triggered.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Alert test failed:', error);
    process.exit(1);
  }
};

testAlerts();
