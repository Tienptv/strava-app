const puppeteer = require('C:\\Users\\926166\\.gemini\\antigravity-ide\\brain\\993b0e25-d0a9-46f7-b60c-783c8cf5e747\\scratch\\node_modules\\puppeteer');
const express = require('C:\\Users\\926166\\.gemini\\antigravity-ide\\brain\\993b0e25-d0a9-46f7-b60c-783c8cf5e747\\scratch\\node_modules\\express');
const app = express();
app.use(express.static('dist'));
const server = app.listen(3030, '127.0.0.1', async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    await page.goto('http://127.0.0.1:3030');
    await new Promise(r => setTimeout(r, 4000));
    await browser.close();
  } catch (e) {
    console.error('Puppeteer error:', e);
  } finally {
    server.close();
  }
});
