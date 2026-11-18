/**
 * Build-time head prerendering (runs after `vite build`).
 *
 * The site is a client-rendered SPA, so before this step every URL returned the same HTML
 * (homepage title, homepage canonical). This script writes one HTML file per static public
 * page with that page's own title, description, robots, canonical, Open Graph and JSON-LD in
 * the initial response. The <body> is untouched — React still renders everything client-side,
 * and react-helmet-async takes over the same tags (they carry data-rh="true").
 *
 * Output (dist/):
 *   index.html          → homepage head (served for "/")
 *   app-shell.html      → generic shell, no canonical (SPA fallback for every other route)
 *   _seo/<key>.html     → one file per static page; vercel.json rewrites each path to it
 *
 * The build fails if vercel.json is missing a rewrite for a prerendered page, so the two
 * cannot drift apart silently.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATIC_PAGES, renderHeadTags, staticPageHead } from '../src/seo/seoConfig.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const SEO_BLOCK = /<!-- SEO:START[\s\S]*?<!-- SEO:END -->/;

/**
 * Writes an HTML file and refreshes its precompressed sidecars. vite-plugin-compression has
 * already compressed the *original* index.html, and servers using gzip_static/brotli_static
 * would otherwise serve that stale copy instead of the prerendered one.
 */
function writeHtml(file, html) {
  fs.writeFileSync(file, html);
  for (const ext of ['.br', '.gz']) {
    if (fs.existsSync(file + ext)) fs.rmSync(file + ext);
  }
  if (Buffer.byteLength(html) > 1024) {
    fs.writeFileSync(`${file}.br`, zlib.brotliCompressSync(html));
    fs.writeFileSync(`${file}.gz`, zlib.gzipSync(html, { level: 9 }));
  }
}

const shellPath = path.join(dist, 'index.html');
if (!fs.existsSync(shellPath)) {
  console.error('[prerender-seo] dist/index.html not found — run vite build first.');
  process.exit(1);
}

let shell = fs.readFileSync(shellPath, 'utf8');
// Re-running against an already-prerendered index.html: start from the saved shell instead.
const savedShell = path.join(dist, 'app-shell.html');
if (!SEO_BLOCK.test(shell) && fs.existsSync(savedShell))
  shell = fs.readFileSync(savedShell, 'utf8');
if (!SEO_BLOCK.test(shell)) {
  console.error('[prerender-seo] SEO:START/SEO:END markers missing from index.html.');
  process.exit(1);
}

writeHtml(savedShell, shell);

const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const rewrites = new Map((vercelConfig.rewrites || []).map((r) => [r.source, r.destination]));

fs.mkdirSync(path.join(dist, '_seo'), { recursive: true });
const missing = [];
const written = [];

for (const pagePath of Object.keys(STATIC_PAGES)) {
  const head = staticPageHead(pagePath);
  const html = shell.replace(
    SEO_BLOCK,
    `<!-- SEO (prerendered: ${pagePath}) -->\n    ${renderHeadTags(head)}`,
  );

  if (pagePath === '/') {
    writeHtml(shellPath, html);
    written.push('/ → index.html');
    continue;
  }

  const file = `_seo/${STATIC_PAGES[pagePath].key}.html`;
  writeHtml(path.join(dist, file), html);
  written.push(`${pagePath} → ${file}`);
  if (rewrites.get(pagePath) !== `/${file}`)
    missing.push(`{ "source": "${pagePath}", "destination": "/${file}" }`);
}

if (![...rewrites.values()].includes('/app-shell.html')) {
  missing.push('a catch-all rewrite to /app-shell.html (SPA fallback)');
}

console.log(
  `[prerender-seo] Wrote ${written.length} prerendered heads:\n  ${written.join('\n  ')}`,
);

if (missing.length) {
  console.error(`[prerender-seo] vercel.json is missing rewrites:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
