import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  let jsRequests = 0;
  let jsBytes = 0;
  let totalRequests = 0;
  let totalBytes = 0;
  let fontsRequested = [];
  
  page.on('response', async (response) => {
    const url = response.url();
    // Ignore data URIs
    if (url.startsWith('data:')) return;
    
    totalRequests++;
    const type = response.request().resourceType();
    
    try {
      const buffer = await response.buffer();
      const size = buffer.length;
      totalBytes += size;
      
      if (type === 'script' || url.endsWith('.js')) {
        jsRequests++;
        jsBytes += size;
      }
      
      if (type === 'font' || url.includes('font')) {
        fontsRequested.push({ url, size });
      }
    } catch (e) {
      // Ignore missing buffers
    }
  });

  console.log('Navigating to homepage...');
  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log('Navigation timed out or failed:', e.message);
  }
  
  // Wait a little extra to catch any straggling delayed prefetches
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Total Transferred: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`JS Requests: ${jsRequests}`);
  console.log(`JS Transferred: ${(jsBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log('\nFonts Requested:');
  fontsRequested.forEach(f => console.log(`- ${f.url} (${(f.size / 1024).toFixed(2)} KB)`));
  
  const hasLocalMaterialSymbols = fontsRequested.some(f => f.url.includes('material-symbols') && f.url.includes('localhost'));
  console.log(`\nLocal Material Symbols Font Found: ${hasLocalMaterialSymbols ? 'YES (FAIL)' : 'NO (PASS)'}`);
  
  await browser.close();
})();
