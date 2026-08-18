const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:5173');
  
  // Login as non-admin
  await page.evaluate(() => {
    localStorage.setItem('athlete', JSON.stringify({id: 99999, firstname: "Test", lastname: "User"}));
  });
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('.challenge-container', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 5000));
  
  const content = await page.evaluate(() => document.body.innerHTML);
  console.log('PAGE CONTENT LENGTH:', content.length);
  if (content.length < 500) {
    console.log('PAGE CONTENT:', content);
  }
  
  await browser.close();
})();
