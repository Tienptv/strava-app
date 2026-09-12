import { loginAndGetCookie } from './server/scraper.js';

async function test() {
  console.log('Testing loginAndGetCookie...');
  try {
    const cookie = await loginAndGetCookie();
    console.log('Success! Cookie:', cookie);
  } catch (err) {
    console.error('Error during login:', err);
  }
}
test();
