const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('PAGE_ERROR:', error.message));
  await page.goto('file://' + __dirname + '/frontend/index.html');
  await page.waitForTimeout(2000);
  await browser.close();
})();
