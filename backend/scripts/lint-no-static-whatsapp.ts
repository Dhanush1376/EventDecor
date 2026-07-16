import fs from 'fs';
import path from 'path';

/**
 * CI Script to enforce zero static code policy for WhatsApp Automations
 * Fails the build if hardcoded branding, URLs, or phone numbers are found in domains/notifications.
 */

const TARGET_DIR = path.join(__dirname, '../src/domains/notifications');
const EXCLUDE_FILES = ['lint-no-static-whatsapp.ts', '.spec.ts', '.test.ts'];

const PATTERNS = [
  {
    regex: /siriartsandcrafts\.com/i,
    message: 'Hardcoded brand URL found. Use getFrontendUrl() or StoreSettings.',
  },
  {
    regex: /Siri Arts \& Crafts/i,
    message: 'Hardcoded brand name found. Use StoreSettings.general.storeName.',
  },
  {
    regex: /graph\.facebook\.com\/v18\.0/i,
    message: 'Hardcoded Graph API version found. Use process.env.WA_API_VERSION.',
  },
  {
    regex: /\+91[0-9]{10}/g,
    message: 'Hardcoded phone number found. Store in DB or env vars.',
  },
];

function scanDirectory(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      scanDirectory(filePath, fileList);
    } else if (
      filePath.endsWith('.ts') &&
      !EXCLUDE_FILES.some((exclude) => filePath.endsWith(exclude))
    ) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function runLint() {
  console.log('Scanning for hardcoded WhatsApp configuration...');
  const files = scanDirectory(TARGET_DIR);
  let hasErrors = false;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of PATTERNS) {
        if (pattern.regex.test(lines[i])) {
          console.error(`\n❌ [Lint Error] ${pattern.message}`);
          console.error(`   File: ${file}:${i + 1}`);
          console.error(`   Line: ${lines[i].trim()}`);
          hasErrors = true;
        }
      }
    }
  }

  if (hasErrors) {
    console.error('\n❌ Static Code CI Failed. Remove hardcoded values to pass.');
    process.exit(1);
  } else {
    console.log('✅ Zero Static Code check passed.');
  }
}

runLint();
