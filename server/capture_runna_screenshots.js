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
  await page.setViewport({ width: 1280, height: 950 });

  // 1. Set localStorage before loading
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('athleteId', '133066813');
    localStorage.setItem('athlete', JSON.stringify({ id: 133066813, firstname: 'Tien', lastname: 'Pham' }));
  });

  // 2. Reload into dashboard
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // 3. Switch to 'overview' mode if in challenge mode
  console.log('Clicking Overview button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const overviewBtn = btns.find(b => b.textContent && b.textContent.includes('Overview'));
    if (overviewBtn) overviewBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // 4. Wait for .runna-race-widget-card
  console.log('Waiting for .runna-race-widget-card...');
  await page.waitForSelector('.runna-race-widget-card', { timeout: 15000 });

  // Scroll to widget
  await page.evaluate(() => {
    const el = document.querySelector('.runna-race-widget-card');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 600));

  // Capture Widget Overview
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'runna_widget_overview.png') });
  console.log('Saved runna_widget_overview.png');

  // 5. Open Garmin Sync Modal
  const garminBtn = await page.$('.runna-btn--garmin');
  if (garminBtn) {
    console.log('Clicking Garmin Sync button...');
    await garminBtn.click();
    await page.waitForSelector('.garmin-sync-modal-box', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'garmin_sync_modal.png') });
    console.log('Saved garmin_sync_modal.png');

    // Close modal
    const closeBtn = await page.$('.garmin-sync-modal-box button');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 600));
  }

  // 6. Open Race Roadmap Modal
  const roadmapBtn = await page.$('.runna-btn--roadmap');
  if (roadmapBtn) {
    console.log('Clicking Race Roadmap button...');
    await roadmapBtn.click();
    await page.waitForSelector('.race-roadmap-modal-box', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'race_roadmap_modal.png') });
    console.log('Saved race_roadmap_modal.png');
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
