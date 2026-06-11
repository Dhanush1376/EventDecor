import puppeteer from 'puppeteer';
import fs from 'fs';

const URLS_TO_AUDIT = [
  'http://localhost:5173/',
  'http://localhost:5173/collections',
  'http://localhost:5173/events/collections',
];

async function runAudit() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const allImageStats = [];

  for (const url of URLS_TO_AUDIT) {
    const page = await browser.newPage();

    // Store network requests
    const networkData = new Map();
    await page.setRequestInterception(true);

    page.on('request', (req) => req.continue());

    page.on('response', async (response) => {
      const resUrl = response.url();
      if (resUrl.includes('res.cloudinary.com')) {
        try {
          const buffer = await response.buffer();
          const format = response.headers()['content-type'] || 'unknown';
          networkData.set(resUrl, {
            sizeBytes: buffer.length,
            format: format,
          });
        } catch (e) {
          // Ignore
        }
      }
    });

    console.log(`Navigating to ${url}...`);
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Scroll to bottom to trigger lazy loading
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });

    // Wait a bit more for images to load
    await new Promise((r) => setTimeout(r, 2000));

    // Extract image dimensions from DOM
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .filter((img) => img.src && img.src.includes('res.cloudinary.com'))
        .map((img) => {
          const rect = img.getBoundingClientRect();
          return {
            src: img.currentSrc || img.src,
            displayWidth: rect.width,
            displayHeight: rect.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            dpr: window.devicePixelRatio,
          };
        });
    });

    for (const img of images) {
      const netData = networkData.get(img.src) || { sizeBytes: 0, format: 'unknown' };

      const deliveredPixels = img.naturalWidth * img.naturalHeight;
      const displayedPixels = img.displayWidth * img.displayHeight * (img.dpr * img.dpr);
      const ratio = displayedPixels > 0 ? deliveredPixels / displayedPixels : 0;

      // Extract transformation parameters
      const urlMatch = img.src.match(/\/upload\/(.*?)\/v\d+\//);
      const transforms = urlMatch ? urlMatch[1] : '';

      allImageStats.push({
        page: url,
        url: img.src,
        displayWidth: Math.round(img.displayWidth),
        displayHeight: Math.round(img.displayHeight),
        deliveredWidth: img.naturalWidth,
        deliveredHeight: img.naturalHeight,
        sizeKB: Math.round(netData.sizeBytes / 1024),
        format: netData.format,
        transforms: transforms,
        pixelRatio: Math.round(ratio * 10) / 10,
        dpr: img.dpr,
      });
    }

    await page.close();
  }

  await browser.close();

  // Sort by size
  allImageStats.sort((a, b) => b.sizeKB - a.sizeKB);

  // Deduplicate by URL
  const uniqueUrls = new Set();
  const dedupedStats = allImageStats.filter((img) => {
    if (uniqueUrls.has(img.url)) return false;
    uniqueUrls.add(img.url);
    return true;
  });

  fs.writeFileSync('cloudinary-audit-report.json', JSON.stringify(dedupedStats, null, 2));
  console.log('Audit complete! Results saved to cloudinary-audit-report.json');
}

runAudit().catch(console.error);
