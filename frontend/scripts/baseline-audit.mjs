/**
 * Production Baseline Audit Script
 * Analyzes dist/index.html to determine initial vs lazy chunks,
 * computes sizes, and generates a structured baseline report.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync, brotliCompressSync } from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');
const jsDir = path.join(distDir, 'assets', 'js');
const cssDir = path.join(distDir, 'assets');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html not found. Run npm run build first.');
  process.exit(1);
}

const kb = (bytes) => (bytes / 1024).toFixed(2);
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Extract initial JS from index.html (script tags and modulepreload)
const initialScripts = new Set();
// Script tags with src
for (const match of indexHtml.matchAll(/<script[^>]+src="\/assets\/js\/([^"]+\.js)"/g)) {
  initialScripts.add(match[1]);
}
// Modulepreload links
for (const match of indexHtml.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\/assets\/js\/([^"]+\.js)"/g)) {
  initialScripts.add(match[1]);
}
// Also check reverse order (href before rel)
for (const match of indexHtml.matchAll(/<link[^>]+href="\/assets\/js\/([^"]+\.js)"[^>]+rel="modulepreload"/g)) {
  initialScripts.add(match[1]);
}

// Extract initial CSS from index.html
const initialCss = new Set();
for (const match of indexHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/assets\/([^"]+\.css)"/g)) {
  initialCss.add(match[1]);
}
for (const match of indexHtml.matchAll(/<link[^>]+href="\/assets\/([^"]+\.css)"[^>]+rel="stylesheet"/g)) {
  initialCss.add(match[1]);
}

console.log('\n========================================');
console.log('PRODUCTION BASELINE AUDIT');
console.log('========================================\n');

// --- INITIAL JS ANALYSIS ---
console.log('--- INITIAL JAVASCRIPT (from index.html) ---\n');
let totalInitialJsRaw = 0;
let totalInitialJsGzip = 0;
let totalInitialJsBrotli = 0;

const initialJsFiles = [];
for (const file of initialScripts) {
  const fullPath = path.join(jsDir, file);
  if (fs.existsSync(fullPath)) {
    const buffer = fs.readFileSync(fullPath);
    const raw = buffer.length;
    const gzip = gzipSync(buffer).length;
    const brotli = brotliCompressSync(buffer).length;
    totalInitialJsRaw += raw;
    totalInitialJsGzip += gzip;
    totalInitialJsBrotli += brotli;
    initialJsFiles.push({ file, raw, gzip, brotli });
  }
}

initialJsFiles.sort((a, b) => b.gzip - a.gzip);
for (const f of initialJsFiles) {
  console.log(`  ${f.file}: raw ${kb(f.raw)}KB, gzip ${kb(f.gzip)}KB, brotli ${kb(f.brotli)}KB`);
}

console.log(`\n  TOTAL INITIAL JS: raw ${kb(totalInitialJsRaw)}KB, gzip ${kb(totalInitialJsGzip)}KB, brotli ${kb(totalInitialJsBrotli)}KB\n`);

// --- INITIAL CSS ANALYSIS ---
console.log('--- INITIAL CSS (from index.html) ---\n');
let totalInitialCssRaw = 0;
let totalInitialCssGzip = 0;
let totalInitialCssBrotli = 0;

for (const file of initialCss) {
  const fullPath = path.join(cssDir, file);
  if (fs.existsSync(fullPath)) {
    const buffer = fs.readFileSync(fullPath);
    const raw = buffer.length;
    const gzip = gzipSync(buffer).length;
    const brotli = brotliCompressSync(buffer).length;
    totalInitialCssRaw += raw;
    totalInitialCssGzip += gzip;
    totalInitialCssBrotli += brotli;
    console.log(`  ${file}: raw ${kb(raw)}KB, gzip ${kb(gzip)}KB, brotli ${kb(brotli)}KB`);
  }
}

console.log(`\n  TOTAL INITIAL CSS: raw ${kb(totalInitialCssRaw)}KB, gzip ${kb(totalInitialCssGzip)}KB, brotli ${kb(totalInitialCssBrotli)}KB\n`);

// --- LAZY JS ANALYSIS ---
console.log('--- LAZY JAVASCRIPT CHUNKS (top 20 by gzip) ---\n');
const allJsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
const lazyJsFiles = [];
let totalLazyJsRaw = 0;
let totalLazyJsGzip = 0;

for (const file of allJsFiles) {
  if (!initialScripts.has(file)) {
    const fullPath = path.join(jsDir, file);
    const buffer = fs.readFileSync(fullPath);
    const raw = buffer.length;
    const gzip = gzipSync(buffer).length;
    const brotli = brotliCompressSync(buffer).length;
    totalLazyJsRaw += raw;
    totalLazyJsGzip += gzip;
    lazyJsFiles.push({ file, raw, gzip, brotli });
  }
}

lazyJsFiles.sort((a, b) => b.gzip - a.gzip);
for (const f of lazyJsFiles.slice(0, 20)) {
  console.log(`  ${f.file}: raw ${kb(f.raw)}KB, gzip ${kb(f.gzip)}KB, brotli ${kb(f.brotli)}KB`);
}

console.log(`\n  TOTAL LAZY JS: raw ${kb(totalLazyJsRaw)}KB, gzip ${kb(totalLazyJsGzip)}KB`);
console.log(`  TOTAL LAZY JS CHUNKS: ${lazyJsFiles.length}\n`);

// --- HEAVY CHUNK CONTAINMENT VERIFICATION ---
console.log('--- HEAVY CHUNK CONTAINMENT CHECK ---\n');

const heavyChunkNames = [
  'observability', 'jspdf', 'html2canvas', 'BarChart', 'Dashboard',
  'maps', 'react-barcode', 'AdminDashboard', 'AdminLayout', 'AdminContent',
  'AdminAddProduct', 'browser-image-compression', 'websocket', 'animation',
  'index.es', 'PieChart', 'AreaChart'
];

for (const name of heavyChunkNames) {
  const isInitial = [...initialScripts].some(f => f.includes(name));
  const matchingFiles = allJsFiles.filter(f => f.includes(name));
  for (const f of matchingFiles) {
    const fullPath = path.join(jsDir, f);
    const buffer = fs.readFileSync(fullPath);
    const gzip = gzipSync(buffer).length;
    console.log(`  ${name}: ${isInitial ? '⚠️  INITIAL' : '✅ LAZY'} — ${f} (gzip ${kb(gzip)}KB)`);
  }
}

// --- TOTAL DIST SUMMARY ---
console.log('\n--- TOTAL DIST SUMMARY ---\n');
console.log(`  INITIAL JS GZIP: ${kb(totalInitialJsGzip)}KB`);
console.log(`  INITIAL JS BROTLI: ${kb(totalInitialJsBrotli)}KB`);
console.log(`  INITIAL CSS GZIP: ${kb(totalInitialCssGzip)}KB`);
console.log(`  INITIAL CSS BROTLI: ${kb(totalInitialCssBrotli)}KB`);
console.log(`  INITIAL TOTAL (JS+CSS) GZIP: ${kb(totalInitialJsGzip + totalInitialCssGzip)}KB`);
console.log(`  INITIAL TOTAL (JS+CSS) BROTLI: ${kb(totalInitialJsBrotli + totalInitialCssBrotli)}KB`);
console.log(`  LAZY JS GZIP: ${kb(totalLazyJsGzip)}KB`);
console.log(`  TOTAL JS CHUNKS: ${allJsFiles.length} (${initialJsFiles.length} initial, ${lazyJsFiles.length} lazy)`);

// --- INITIAL GRAPH LEAK CHECK ---
console.log('\n--- ADMIN/HEAVY CODE IN INITIAL GRAPH CHECK ---\n');

const forbiddenInitialPatterns = [
  'Admin', 'Dashboard', 'BarChart', 'PieChart', 'AreaChart', 'jspdf',
  'html2canvas', 'react-barcode', 'maps', 'observability', 'websocket',
  'browser-image-compression', 'BackupCenter', 'Warehouse', 'Production'
];

let leaks = 0;
for (const file of initialScripts) {
  for (const pattern of forbiddenInitialPatterns) {
    if (file.toLowerCase().includes(pattern.toLowerCase())) {
      console.log(`  ⚠️  LEAK: ${file} contains "${pattern}" in initial graph`);
      leaks++;
    }
  }
}
if (leaks === 0) {
  console.log('  ✅ No admin/heavy code detected in initial JavaScript graph');
}

console.log('\n========================================');
console.log('BASELINE AUDIT COMPLETE');
console.log('========================================\n');
