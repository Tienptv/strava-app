import { getBrowserExecutable } from './scraper.js';
import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/926166/.gemini/antigravity-ide/brain/cf15cfaf-bfcc-450c-afd9-7ec6b22dad8d';

async function main() {
  const exe = getBrowserExecutable();
  console.log('Launching browser with:', exe);
  const browser = await puppeteer.launch({
    executablePath: exe,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  // 1. Set localStorage before loading
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('athleteId', '133066813');
    localStorage.setItem('athlete', JSON.stringify({ id: 133066813, firstname: 'Tien', lastname: 'Pham', isSuperAdmin: true }));
    localStorage.setItem('lang', 'en');
  });

  // 2. Navigate to Administer with Tab 9 (user_access)
  console.log('Navigating to http://localhost:3001/administer?tab=user_access ...');
  await page.goto('http://localhost:3001/administer?tab=user_access', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // 3. Screenshot Sidebar & Full Tab 9
  const tab9Full = path.join(ARTIFACT_DIR, 'admin_tab9_user_access.png');
  await page.screenshot({ path: tab9Full, fullPage: false });
  console.log('Saved Tab 9 Full screenshot to:', tab9Full);

  // 4. Capture specifically the Admin Menu sidebar
  const sidebarEl = await page.$('.admin-sidebar');
  if (sidebarEl) {
    const sidebarShot = path.join(ARTIFACT_DIR, 'admin_menu_with_tab9.png');
    await sidebarEl.screenshot({ path: sidebarShot });
    console.log('Saved Admin Menu sidebar screenshot to:', sidebarShot);
  }

  // 5. Switch to Vietnamese language and take a screenshot to verify Rule #4 (Bilingual parity)
  await page.evaluate(() => {
    localStorage.setItem('lang', 'vi');
  });
  await page.goto('http://localhost:3001/administer?tab=user_access', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  const tab9Vi = path.join(ARTIFACT_DIR, 'admin_tab9_vietnamese.png');
  await page.screenshot({ path: tab9Vi, fullPage: false });
  console.log('Saved Tab 9 Vietnamese screenshot to:', tab9Vi);

  await browser.close();
  console.log('Capture completed successfully!');
}

main().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
