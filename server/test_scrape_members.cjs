const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function test() {
  const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new"
  });
  const page = await browser.newPage();
  
  await page.goto('https://www.strava.com/clubs/878992/members');
  
  const content = await page.content();
  fs.writeFileSync('test_members.html', content);
  
  await browser.close();
}

test();
