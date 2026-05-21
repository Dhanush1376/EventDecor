import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '../dist/assets/js');
const LIMIT_KB = 500;

if (!fs.existsSync(assetsDir)) {
  console.error('[build:report] dist/assets/js not found — run vite build first');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
let overLimit = 0;

console.log('\n[build:report] JS chunk sizes:\n');
for (const file of files.sort()) {
  const sizeKb = fs.statSync(path.join(assetsDir, file)).size / 1024;
  const flag = sizeKb > LIMIT_KB ? ' ⚠️  OVER 500KB' : '';
  if (sizeKb > LIMIT_KB) overLimit++;
  console.log(`  ${file.padEnd(48)} ${sizeKb.toFixed(1)} KB${flag}`);
}

console.log(`\n[build:report] ${files.length} chunks, ${overLimit} over ${LIMIT_KB}KB limit`);
if (overLimit > 0) {
  console.warn('[build:report] Large chunks are expected for lazy-loaded admin routes — split further if LCP regresses.');
}
process.exit(0);
