import fs from 'fs';
import path from 'path';

/**
 * Validates VITE_* variables required for production builds (run in CI before vite build).
 */

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      if (!process.env[key]) {
        process.env[key] = match[2].trim();
      }
    }
  });
}

const required = [
  'VITE_API_URL',
  'VITE_SITE_URL',
  'VITE_RAZORPAY_KEY_ID',
];

const recommended = [
  'VITE_SITE_NAME',
  'VITE_OG_IMAGE_URL',
  'VITE_CONTACT_PHONE',
];

const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error('[check-env] Missing required frontend VITE_* variables:');
  missing.forEach((k) => console.error(`  - ${k}`));
  process.exit(1);
}

const missingRecommended = recommended.filter((key) => !process.env[key]?.trim());
if (missingRecommended.length > 0) {
  console.warn('[check-env] Recommended VITE_* variables not set (build will use fallbacks):');
  missingRecommended.forEach((k) => console.warn(`  - ${k}`));
}

const apiUrl = process.env.VITE_API_URL?.trim() || '';
if (apiUrl.startsWith('/')) {
  console.error('[check-env] VITE_API_URL must be an absolute URL in production (not a relative path).');
  process.exit(1);
}

if (apiUrl && !/^https:\/\//i.test(apiUrl)) {
  console.warn('[check-env] VITE_API_URL should use HTTPS in production:', apiUrl);
}

console.log('[check-env] Frontend environment variables OK');
