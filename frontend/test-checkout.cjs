const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173');
  
  // Try to find an item and click it
  await page.waitForSelector('a[href^="/product/"]', { timeout: 10000 }).catch(() => console.log('no product link found'));
  const products = await page.$$('a[href^="/product/"]');
  if (products.length > 0) {
    await products[0].click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    
    // Click add to bag
    const btnHandle = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Add to Bag'));
    });
    if (btnHandle) {
        await btnHandle.click();
    }
    
    await page.waitForTimeout(2000);
    await page.goto('http://localhost:5173/cart');
    await page.waitForTimeout(2000);
    
    // Click checkout
    const checkoutBtnHandle = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Proceed to Checkout'));
    });
    if (checkoutBtnHandle) {
        await checkoutBtnHandle.click();
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'checkout_issue.png', fullPage: true });
    console.log('Screenshot taken at checkout_issue.png');
  } else {
    console.log('No products found on home page');
  }
  await browser.close();
})();
