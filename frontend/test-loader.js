import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', (err) => console.log('BROWSER ERROR:', err.toString()));
  page.on('requestfailed', (request) => {
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });

  console.log('Navigating to http://localhost:5174...');
  await page
    .goto('http://localhost:5174', { waitUntil: 'networkidle2', timeout: 15000 })
    .catch((e) => console.log('Goto error:', e.message));

  console.log('Waiting for 5 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  console.log('\n--- BODY HTML (first 1000 chars) ---\n');
  console.log(bodyHtml.substring(0, 1000));

  await browser.close();
})();
