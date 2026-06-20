import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load the local .env files that will be synced to Railway
const envConfig = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.local')));

const requiredVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'FIELD_ENCRYPTION_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'REDIS_URL',
  'SENTRY_DSN',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'ALERT_WEBHOOK_URL',
  'GITHUB_BACKUP_TOKEN',
  'GITHUB_BACKUP_OWNER',
  'GITHUB_BACKUP_REPO',
];

console.log('\\n=========================================');
console.log('   PHASE A.0: PRE-DEPLOYMENT VALIDATION  ');
console.log('=========================================\\n');

let allPass = true;

for (const key of requiredVars) {
  const value = envConfig[key] || process.env[key];

  if (!value) {
    console.log(`[MISSING] ${key}`);
    allPass = false;
    continue;
  }

  // Validation rules
  let isInvalid = false;
  let reason = '';

  if (value.includes('change_me') || value.includes('YOUR_')) {
    isInvalid = true;
    reason = 'Placeholder value detected';
  } else if (value.includes('localhost') || value.includes('127.0.0.1')) {
    isInvalid = true;
    reason = 'Localhost URL detected';
  } else if (key === 'MONGO_URI' && !value.includes('mongodb+srv://')) {
    isInvalid = true;
    reason = 'Must use Atlas/Production cluster (mongodb+srv://)';
  } else if ((key === 'JWT_SECRET' || key === 'FIELD_ENCRYPTION_KEY') && value.length < 32) {
    isInvalid = true;
    reason = 'Secret must be at least 32 characters';
  } else if (key === 'RAZORPAY_KEY_ID' && value.includes('test')) {
    isInvalid = true;
    reason = 'Test credentials detected (must be live key)';
  }

  if (isInvalid) {
    console.log(`[INVALID] ${key} - ${reason}`);
    allPass = false;
  } else {
    console.log(`[READY]   ${key}`);
  }
}

console.log('\\n=========================================');
if (allPass) {
  console.log('✅ VALIDATION PASSED. Ready for deployment.');
  process.exit(0);
} else {
  console.log('❌ VALIDATION FAILED. Fix issues before deployment.');
  process.exit(1);
}
