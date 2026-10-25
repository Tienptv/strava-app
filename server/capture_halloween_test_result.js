import { getBrowserExecutable } from './scraper.js';
import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/926166/.gemini/antigravity-ide/brain/0620d8ff-d901-4371-9fc6-82da13e37b40';

async function main() {
  const exe = getBrowserExecutable();
  console.log('Launching browser with:', exe);
  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 2200, height: 1100 });

  // 1. Setup session with Halloween theme & English (matching reference image)
  console.log('Setting localStorage for Halloween theme and logging in...');
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('athleteId', '133066813');
    localStorage.setItem('athlete', JSON.stringify({ id: 133066813, firstname: 'Tien', lastname: 'Pham', isSuperAdmin: true }));
    localStorage.setItem('strava_seasonal_theme', 'halloween');
    localStorage.setItem('lang', 'en');
  });

  // 2. Navigate to Dashboard with Leaderboard
  console.log('Navigating to Leaderboard...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));

  // Wait for challenge table and halloween header bar
  await page.waitForSelector('.halloween-header-bar', { timeout: 10000 });

  // Capture specifically the Halloween Header Bar closeup
  const headerEl = await page.$('.halloween-header-bar');
  if (headerEl) {
    const headerShotPath = path.join(ARTIFACT_DIR, 'halloween_header_actual_result.png');
    await headerEl.screenshot({ path: headerShotPath });
    console.log('Captured Halloween Header Bar closeup to:', headerShotPath);
  }

  // Capture the full Leaderboard table (Header is Halloween, table is 100% Default)
  const tableEl = await page.$('.challenge-container');
  if (tableEl) {
    const tableShotPath = path.join(ARTIFACT_DIR, 'halloween_leaderboard_actual_result.png');
    await tableEl.screenshot({ path: tableShotPath });
    console.log('Captured Halloween Leaderboard (Default table + Halloween Header) to:', tableShotPath);
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
