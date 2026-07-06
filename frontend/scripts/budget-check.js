import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { brotliCompressSync, gzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');
const jsDir = path.join(distDir, 'assets', 'js');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(jsDir)) {
  console.error('[budget-check] dist/assets/js not found. Run vite build first.');
  process.exit(1);
}

const BUDGETS_KB = {
  maxChunkRaw: 500,
  maxChunkGzip: 160,
  maxChunkBrotli: 150,
  maxInitialJsBrotli: 400,
};

const kb = (bytes) => bytes / 1024;
const formatKb = (value) => `${value.toFixed(2)}KB`;

const jsFiles = fs.readdirSync(jsDir).filter((file) => file.endsWith('.js'));
const rows = jsFiles
  .map((file) => {
    const fullPath = path.join(jsDir, file);
    const buffer = fs.readFileSync(fullPath);
    return {
      file,
      rawKb: kb(buffer.length),
      gzipKb: kb(gzipSync(buffer).length),
      brotliKb: kb(brotliCompressSync(buffer).length),
    };
  })
  .sort((a, b) => b.rawKb - a.rawKb);

const errors = [];

for (const row of rows) {
  if (row.rawKb > BUDGETS_KB.maxChunkRaw) {
    errors.push(
      `${row.file} is ${formatKb(row.rawKb)} raw; limit ${formatKb(BUDGETS_KB.maxChunkRaw)}`,
    );
  }
  if (row.gzipKb > BUDGETS_KB.maxChunkGzip) {
    errors.push(
      `${row.file} is ${formatKb(row.gzipKb)} gzip; limit ${formatKb(BUDGETS_KB.maxChunkGzip)}`,
    );
  }
  if (row.brotliKb > BUDGETS_KB.maxChunkBrotli) {
    errors.push(
      `${row.file} is ${formatKb(row.brotliKb)} brotli; limit ${formatKb(BUDGETS_KB.maxChunkBrotli)}`,
    );
  }
}

if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const initialScripts = [
    ...indexHtml.matchAll(/<script[^>]+src="\/assets\/js\/([^"]+\.js)"/g),
  ].map((match) => match[1]);
  const initialJsBrotli = initialScripts.reduce((total, file) => {
    const row = rows.find((item) => item.file === file);
    return total + (row?.brotliKb || 0);
  }, 0);

  if (initialJsBrotli > BUDGETS_KB.maxInitialJsBrotli) {
    errors.push(
      `initial entry JS is ${formatKb(initialJsBrotli)} brotli; limit ${formatKb(
        BUDGETS_KB.maxInitialJsBrotli,
      )}`,
    );
  }
}

console.log('[budget-check] Largest production JS chunks:');
for (const row of rows.slice(0, 12)) {
  console.log(
    `- ${row.file}: raw ${formatKb(row.rawKb)}, gzip ${formatKb(row.gzipKb)}, brotli ${formatKb(
      row.brotliKb,
    )}`,
  );
}

if (errors.length) {
  console.error('\n[budget-check] Failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('\n[budget-check] Bundle size budgets passed.');
