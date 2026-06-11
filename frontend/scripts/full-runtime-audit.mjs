/**
 * Full Cloudinary Runtime Image Audit
 * 
 * Navigates to Homepage, Collections, Product, and Event Collections pages.
 * For EVERY image request:
 *   - Captures actual transferred bytes from Performance API
 *   - Captures delivered dimensions (naturalWidth x naturalHeight)
 *   - Captures rendered dimensions (CSS display width x height)
 *   - Captures delivered format (content-type)
 *   - Calculates wasted pixels and estimated wasted bytes
 * 
 * Outputs:
 *   - runtime-audit-full.json  (complete raw data)
 *   - runtime-audit-report.md  (formatted markdown report)
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const PAGES = [
  { name: 'Homepage', url: 'http://localhost:5173/' },
  { name: 'Collections', url: 'http://localhost:5173/collections' },
  { name: 'Product Page', url: 'http://localhost:5173/product/6a0c764b9b8633afb920deb4' },
  { name: 'Event Collections', url: 'http://localhost:5173/events/collections' },
];

async function scrollToBottom(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight + 800) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
  // Wait for lazy images to load after scrolling
  await new Promise(r => setTimeout(r, 3000));
}

async function auditPage(browser, pageDef) {
  const page = await browser.newPage();
  
  // Track all image responses with actual transfer sizes
  const networkImages = new Map();
  
  await page.setRequestInterception(true);
  page.on('request', req => req.continue());
  
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    // Capture ALL image responses (Cloudinary and others)
    if (contentType.startsWith('image/') || 
        url.includes('res.cloudinary.com') ||
        url.match(/\.(jpg|jpeg|png|webp|avif|gif|svg)(\?|$)/i)) {
      try {
        const buffer = await response.buffer();
        networkImages.set(url, {
          transferredBytes: buffer.length,
          contentType: contentType,
          status: response.status(),
        });
      } catch (e) {
        // Response body unavailable (e.g., redirects)
      }
    }
  });

  console.log(`  Navigating to ${pageDef.name}: ${pageDef.url}`);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  
  try {
    await page.goto(pageDef.url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log(`  Warning: Navigation timeout for ${pageDef.name}, continuing...`);
  }
  
  // Wait for initial content
  await new Promise(r => setTimeout(r, 2000));
  
  // Scroll to bottom to trigger ALL lazy loaded images
  await scrollToBottom(page);
  
  // Scroll back to top slowly to ensure everything renders
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 1000));
  await scrollToBottom(page);
  await new Promise(r => setTimeout(r, 2000));

  // Also collect performance resource timing entries for transfer size verification
  const perfEntries = await page.evaluate(() => {
    return performance.getEntriesByType('resource')
      .filter(e => e.initiatorType === 'img' || e.initiatorType === 'css' || e.initiatorType === 'link')
      .filter(e => e.name.includes('cloudinary') || e.name.match(/\.(jpg|jpeg|png|webp|avif|gif|svg)/i))
      .map(e => ({
        url: e.name,
        transferSize: e.transferSize,
        encodedBodySize: e.encodedBodySize,
        decodedBodySize: e.decodedBodySize,
        duration: Math.round(e.duration),
      }));
  });
  
  // Collect all image elements from the DOM with their rendered + natural dimensions
  const domImages = await page.evaluate(() => {
    const results = [];
    
    // 1. All <img> elements
    document.querySelectorAll('img').forEach(img => {
      const rect = img.getBoundingClientRect();
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
      
      results.push({
        src: src,
        srcAttribute: img.src,
        currentSrc: img.currentSrc,
        renderedWidth: Math.round(rect.width),
        renderedHeight: Math.round(rect.height),
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        loading: img.loading,
        fetchPriority: img.fetchPriority || 'auto',
        alt: (img.alt || '').substring(0, 60),
        isVisible: rect.width > 0 && rect.height > 0,
        cssObjectFit: window.getComputedStyle(img).objectFit,
        type: 'img',
      });
    });
    
    // 2. Background images
    document.querySelectorAll('*').forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && (bg.includes('cloudinary') || bg.includes('.jpg') || bg.includes('.png') || bg.includes('.webp'))) {
        const urlMatch = bg.match(/url\(['"]?(.*?)['"]?\)/);
        if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('data:')) {
          const rect = el.getBoundingClientRect();
          results.push({
            src: urlMatch[1],
            renderedWidth: Math.round(rect.width),
            renderedHeight: Math.round(rect.height),
            naturalWidth: 0,
            naturalHeight: 0,
            isVisible: rect.width > 0 && rect.height > 0,
            type: 'background',
          });
        }
      }
    });
    
    return results;
  });
  
  // Merge network data with DOM data
  const mergedImages = domImages.map(img => {
    const netData = networkImages.get(img.src) || networkImages.get(img.currentSrc);
    const perfEntry = perfEntries.find(p => p.url === img.src || p.url === img.currentSrc);
    
    const transferredBytes = netData?.transferredBytes || perfEntry?.transferSize || 0;
    const contentType = netData?.contentType || 'unknown';
    
    // Calculate wasted pixels
    const deliveredPixels = img.naturalWidth * img.naturalHeight;
    const renderedPixels = img.renderedWidth * img.renderedHeight;
    // For object-cover, only the rendered area matters
    const neededPixels = renderedPixels;
    const wastedPixels = Math.max(0, deliveredPixels - neededPixels);
    const wastedPixelPct = deliveredPixels > 0 ? Math.round((wastedPixels / deliveredPixels) * 100) : 0;
    
    // Estimate wasted bytes proportionally
    const wastedBytes = deliveredPixels > 0 
      ? Math.round(transferredBytes * (wastedPixels / deliveredPixels)) 
      : 0;
    
    return {
      page: pageDef.name,
      url: img.src,
      type: img.type,
      alt: img.alt || '',
      // Delivered
      deliveredWidth: img.naturalWidth,
      deliveredHeight: img.naturalHeight,
      deliveredPixels,
      format: contentType,
      transferredBytes,
      transferredKB: Math.round(transferredBytes / 1024 * 10) / 10,
      // Rendered
      renderedWidth: img.renderedWidth,
      renderedHeight: img.renderedHeight,
      renderedPixels,
      isVisible: img.isVisible,
      objectFit: img.cssObjectFit || 'n/a',
      // Waste
      wastedPixels,
      wastedPixelPct,
      wastedBytes,
      wastedKB: Math.round(wastedBytes / 1024 * 10) / 10,
      // Meta
      loading: img.loading,
      fetchPriority: img.fetchPriority,
      loadDuration: perfEntry?.duration || null,
    };
  });
  
  // Also capture images that were downloaded but NOT in the DOM (prefetched/unused)
  const domSrcs = new Set(domImages.map(i => i.src).concat(domImages.map(i => i.currentSrc).filter(Boolean)));
  for (const [url, netData] of networkImages) {
    if (!domSrcs.has(url) && netData.transferredBytes > 500) {
      mergedImages.push({
        page: pageDef.name,
        url,
        type: 'network-only (no DOM element)',
        alt: '',
        deliveredWidth: 0,
        deliveredHeight: 0,
        deliveredPixels: 0,
        format: netData.contentType,
        transferredBytes: netData.transferredBytes,
        transferredKB: Math.round(netData.transferredBytes / 1024 * 10) / 10,
        renderedWidth: 0,
        renderedHeight: 0,
        renderedPixels: 0,
        isVisible: false,
        objectFit: 'n/a',
        wastedPixels: 0,
        wastedPixelPct: 0,
        wastedBytes: netData.transferredBytes, // 100% wasted if not in DOM
        wastedKB: Math.round(netData.transferredBytes / 1024 * 10) / 10,
        loading: 'n/a',
        fetchPriority: 'n/a',
        loadDuration: null,
      });
    }
  }
  
  await page.close();
  return mergedImages;
}

function generateReport(allImages) {
  let md = '# Cloudinary Runtime Image Audit Report\n\n';
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Viewport:** 1440×900 @ 1x DPR\n`;
  md += `**Pages audited:** ${PAGES.map(p => p.name).join(', ')}\n\n`;
  
  // Summary per page
  md += '## Per-Page Summary\n\n';
  md += '| Page | Images | Total Transferred | Total Wasted |\n';
  md += '|------|--------|-------------------|-------------|\n';
  
  const pageNames = [...new Set(allImages.map(i => i.page))];
  for (const pageName of pageNames) {
    const pageImgs = allImages.filter(i => i.page === pageName);
    const totalTransferred = pageImgs.reduce((s, i) => s + i.transferredBytes, 0);
    const totalWasted = pageImgs.reduce((s, i) => s + i.wastedBytes, 0);
    md += `| ${pageName} | ${pageImgs.length} | ${Math.round(totalTransferred/1024)} KB | ${Math.round(totalWasted/1024)} KB |\n`;
  }
  
  // Top 20 by transferred size
  md += '\n## Top 20 Images by Transferred Size\n\n';
  md += '| # | Page | Transferred | Delivered | Rendered | Format | Wasted KB | Wasted % | URL (truncated) |\n';
  md += '|---|------|-------------|-----------|----------|--------|-----------|----------|----------------|\n';
  
  const top20 = [...allImages]
    .sort((a, b) => b.transferredBytes - a.transferredBytes)
    .slice(0, 20);
  
  top20.forEach((img, i) => {
    const urlShort = img.url.length > 80 ? '...' + img.url.slice(-77) : img.url;
    md += `| ${i+1} | ${img.page} | ${img.transferredKB} KB | ${img.deliveredWidth}×${img.deliveredHeight} | ${img.renderedWidth}×${img.renderedHeight} | ${img.format.replace('image/', '')} | ${img.wastedKB} | ${img.wastedPixelPct}% | \`${urlShort}\` |\n`;
  });
  
  // Duplicate image downloads
  md += '\n## Duplicate Image Downloads\n\n';
  const urlCounts = {};
  allImages.forEach(img => {
    // Normalize URL by removing protocol/host differences but keeping path
    const key = img.url;
    if (!urlCounts[key]) urlCounts[key] = [];
    urlCounts[key].push(img);
  });
  
  const duplicates = Object.entries(urlCounts).filter(([, imgs]) => imgs.length > 1);
  if (duplicates.length === 0) {
    md += '_No duplicate image downloads detected across pages._\n\n';
  } else {
    md += `Found **${duplicates.length}** URLs downloaded on multiple pages:\n\n`;
    md += '| URL (truncated) | Pages | Count | Size Each |\n';
    md += '|----------------|-------|-------|-----------|\n';
    for (const [url, imgs] of duplicates) {
      const urlShort = url.length > 70 ? '...' + url.slice(-67) : url;
      const pages = [...new Set(imgs.map(i => i.page))].join(', ');
      md += `| \`${urlShort}\` | ${pages} | ${imgs.length} | ${imgs[0].transferredKB} KB |\n`;
    }
  }
  
  // Images larger than rendered
  md += '\n## Images Larger Than Rendered Size\n\n';
  md += 'Images where delivered pixels exceed rendered pixels (wasted bandwidth):\n\n';
  md += '| Page | Delivered | Rendered | Waste % | Wasted KB | Size | URL (truncated) |\n';
  md += '|------|-----------|----------|---------|-----------|------|-----------------|\n';
  
  const oversized = allImages
    .filter(i => i.wastedPixelPct > 20 && i.transferredBytes > 1000 && i.isVisible)
    .sort((a, b) => b.wastedBytes - a.wastedBytes);
  
  oversized.forEach(img => {
    const urlShort = img.url.length > 60 ? '...' + img.url.slice(-57) : img.url;
    md += `| ${img.page} | ${img.deliveredWidth}×${img.deliveredHeight} | ${img.renderedWidth}×${img.renderedHeight} | ${img.wastedPixelPct}% | ${img.wastedKB} | ${img.transferredKB} KB | \`${urlShort}\` |\n`;
  });
  
  // Full inventory per page
  for (const pageName of pageNames) {
    md += `\n## Full Image Inventory: ${pageName}\n\n`;
    md += '| # | Transferred | Delivered | Rendered | Format | Waste % | Type | URL (truncated) |\n';
    md += '|---|-------------|-----------|----------|--------|---------|------|-----------------|\n';
    
    const pageImgs = allImages
      .filter(i => i.page === pageName)
      .sort((a, b) => b.transferredBytes - a.transferredBytes);
    
    pageImgs.forEach((img, i) => {
      const urlShort = img.url.length > 65 ? '...' + img.url.slice(-62) : img.url;
      md += `| ${i+1} | ${img.transferredKB} KB | ${img.deliveredWidth}×${img.deliveredHeight} | ${img.renderedWidth}×${img.renderedHeight} | ${img.format.replace('image/', '')} | ${img.wastedPixelPct}% | ${img.type} | \`${urlShort}\` |\n`;
    });
  }
  
  return md;
}

async function main() {
  console.log('Starting Full Cloudinary Runtime Image Audit...');
  console.log('Viewport: 1440x900 @ 1x DPR\n');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  let allImages = [];
  
  for (const pageDef of PAGES) {
    try {
      const images = await auditPage(browser, pageDef);
      console.log(`  → Captured ${images.length} images on ${pageDef.name}`);
      allImages = allImages.concat(images);
    } catch (e) {
      console.error(`  ✗ Failed to audit ${pageDef.name}: ${e.message}`);
    }
  }
  
  await browser.close();
  
  // Write raw JSON
  fs.writeFileSync('runtime-audit-full.json', JSON.stringify(allImages, null, 2));
  console.log(`\nWrote ${allImages.length} image entries to runtime-audit-full.json`);
  
  // Write markdown report
  const report = generateReport(allImages);
  fs.writeFileSync('runtime-audit-report.md', report);
  console.log('Wrote runtime-audit-report.md');
  
  // Print quick summary
  const totalBytes = allImages.reduce((s, i) => s + i.transferredBytes, 0);
  const totalWasted = allImages.reduce((s, i) => s + i.wastedBytes, 0);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total images: ${allImages.length}`);
  console.log(`Total transferred: ${Math.round(totalBytes/1024)} KB`);
  console.log(`Total wasted: ${Math.round(totalWasted/1024)} KB`);
  console.log(`Waste ratio: ${Math.round(totalWasted/totalBytes*100)}%`);
}

main().catch(console.error);
