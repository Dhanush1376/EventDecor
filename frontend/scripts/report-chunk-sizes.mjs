import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '../dist/assets/js');
const RAW_LIMIT_KB = 300;
const GZIP_LIMIT_KB = 120;

if (!fs.existsSync(assetsDir)) {
  console.error('[build:report] dist/assets/js not found — run vite build first');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
let overRaw = 0;
let overGzip = 0;

const rows = files.map((file) => {
  const buf = fs.readFileSync(path.join(assetsDir, file));
  const rawKb = buf.length / 1024;
  const gzipKb = gzipSync(buf).length / 1024;
  return { file, rawKb, gzipKb };
}).sort((a, b) => b.rawKb - a.rawKb);

console.log('\n[build:report] JS chunk audit (raw + gzip estimates):\n');
for (const { file, rawKb, gzipKb } of rows) {
  const flags = [];
  if (rawKb > RAW_LIMIT_KB) {
    overRaw++;
    flags.push(`raw>${RAW_LIMIT_KB}KB`);
  }
  if (gzipKb > GZIP_LIMIT_KB) {
    overGzip++;
    flags.push(`gzip≈>${GZIP_LIMIT_KB}KB`);
  }
  const flag = flags.length ? ` [WARNING: ${flags.join(', ')}]` : '';
  const vendor = file.startsWith('vendor-') ? ' [vendor]' : '';
  console.log(
    `  ${file.padEnd(48)} ${rawKb.toFixed(1).padStart(7)} KB raw  ${gzipKb.toFixed(1).padStart(6)} KB gzip${vendor}${flag}`
  );
}

console.log(
  `\n[build:report] ${files.length} chunks — ${overRaw} over ${RAW_LIMIT_KB}KB raw, ${overGzip} over ~${GZIP_LIMIT_KB}KB gzip`
);
console.log('[build:report] Large vendor-* chunks are lazy-loaded for admin/maps — watch LCP if index-* grows.\n');
