import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:4173';

async function measurePage(browser, url, pageName) {
  const page = await browser.newPage();

  let totalPayloadSize = 0;
  let cloudinaryPayloadSize = 0;
  let apiRequests = 0;

  // We wait for network idle to ensure everything loaded
  const client = await page.target().createCDPSession();
  await client.send('Network.enable');

  client.on('Network.dataReceived', (event) => {
    totalPayloadSize += event.dataLength;
  });

  page.on('response', async (response) => {
    const reqUrl = response.url();

    if (reqUrl.includes('res.cloudinary.com')) {
      // For size, we rely on the CDP event because response.buffer() can fail or alter stream,
      // but we can also check headers if we want. CDP dataReceived handles it better.
      // We will estimate Cloudinary size from Content-Length header or assume proportion
      const headers = response.headers();
      if (headers['content-length']) {
        cloudinaryPayloadSize += parseInt(headers['content-length'], 10);
      }
    }

    if (reqUrl.includes('/api/v1/')) {
      // Exclude preflight
      if (response.request().method() !== 'OPTIONS') {
        apiRequests++;
      }
    }
  });

  console.log(`\nNavigating to ${pageName} (${url})...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait a fixed amount of time to let React Query and images load
  await new Promise((r) => setTimeout(r, 5000));

  await page.close();

  return {
    totalPayloadSize: (totalPayloadSize / 1024).toFixed(2) + ' KB',
    cloudinaryPayloadSize: (cloudinaryPayloadSize / 1024).toFixed(2) + ' KB',
    apiRequests,
  };
}

async function runAudit() {
  console.log('Starting Puppeteer performance audit...');
  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    // 1. Homepage
    const homeMetrics = await measurePage(browser, BASE_URL, 'Homepage');
    console.log('--- Homepage Metrics ---');
    console.log(`Total Payload Size: ${homeMetrics.totalPayloadSize}`);
    console.log(`Cloudinary Payload Size: ${homeMetrics.cloudinaryPayloadSize}`);
    console.log(`API Requests: ${homeMetrics.apiRequests}`);

    // 2. Find a product ID from the collections page
    const tempPage = await browser.newPage();
    await tempPage.goto(`${BASE_URL}/collections`, { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 2000));

    const productLink = await tempPage.evaluate(() => {
      const link = document.querySelector('a[href^="/product/"]');
      return link ? link.getAttribute('href') : null;
    });
    await tempPage.close();

    if (productLink) {
      const productMetrics = await measurePage(
        browser,
        `${BASE_URL}${productLink}`,
        'Product Page',
      );
      console.log('\n--- Product Page Metrics ---');
      console.log(`Total Payload Size: ${productMetrics.totalPayloadSize}`);
      console.log(`Cloudinary Payload Size: ${productMetrics.cloudinaryPayloadSize}`);
      console.log(`API Requests: ${productMetrics.apiRequests}`);
    } else {
      console.log('\nCould not find a product link to test Product Page.');
    }
  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await browser.close();
  }
}

runAudit();
