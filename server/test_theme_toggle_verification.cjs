const { getBrowserExecutable } = require('./scraper.js');
const puppeteer = require('puppeteer-core');
const assert = require('assert');

async function testThemeToggle() {
  console.log('--- STARTING THEME TOGGLE VERIFICATION TEST ---');
  const exe = getBrowserExecutable();
  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  // Test Case 1: Load with Halloween theme ON
  console.log('Test Case 1: Testing Halloween Theme ON...');
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('athleteId', '133066813');
    localStorage.setItem('athlete', JSON.stringify({ id: 133066813, firstname: 'Tien', lastname: 'Pham', isSuperAdmin: true }));
    localStorage.setItem('strava_seasonal_theme', 'halloween');
  });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  const hasHalloweenClass = await page.$eval('.challenge-container', el => el.classList.contains('challenge-table--halloween'));
  console.log(`[Halloween ON] .challenge-table--halloween present: ${hasHalloweenClass}`);
  assert.strictEqual(hasHalloweenClass, true, 'Halloween class should be present when theme is halloween');

  const pumpkinIconPresent = await page.$eval('.halloween-title-pumpkin', el => el !== null);
  console.log(`[Halloween ON] .halloween-title-pumpkin present: ${pumpkinIconPresent}`);
  assert.strictEqual(pumpkinIconPresent, true, 'Pumpkin icon should be in title');

  // Test Case 2: Switch to Default theme OFF
  console.log('Test Case 2: Testing Default Theme (Halloween OFF)...');
  await page.evaluate(() => {
    localStorage.setItem('strava_seasonal_theme', 'default');
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: 'default' } }));
  });
  await new Promise(r => setTimeout(r, 1000));

  const hasHalloweenClassAfterOff = await page.$eval('.challenge-container', el => el.classList.contains('challenge-table--halloween'));
  console.log(`[Halloween OFF] .challenge-table--halloween present: ${hasHalloweenClassAfterOff}`);
  assert.strictEqual(hasHalloweenClassAfterOff, false, 'Halloween class should NOT be present when theme is default');

  const pumpkinIconAfterOff = await page.$('.halloween-title-pumpkin');
  console.log(`[Halloween OFF] .halloween-title-pumpkin present: ${pumpkinIconAfterOff !== null}`);
  assert.strictEqual(pumpkinIconAfterOff, null, 'Pumpkin icon should NOT be in title when theme is default');

  // Test Case 3: Admin Tab 10 navigation
  console.log('Test Case 3: Testing Admin Tab 10 Navigation...');
  await page.goto('http://localhost:3001/administer?tab=themes', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  const tab10Active = await page.$eval('.admin-content h2', el => el.innerText.includes('Chủ Đề') || el.innerText.includes('Themes'));
  console.log(`[Admin Tab 10] Active header rendered: ${tab10Active}`);
  assert.strictEqual(tab10Active, true, 'Tab 10 should render seasonal themes header');

  await browser.close();
  console.log('--- ALL TEST CASES PASSED 100%! ---');
}

testThemeToggle().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
