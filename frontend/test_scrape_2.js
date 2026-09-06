import { scrapeClubActivities } from './server/scraper.js';
import { getSavedCookie } from './server/scraper.js';

async function test() {
  try {
    const cookie = getSavedCookie();
    // Use the club ID from the user's data or hardcode a known one. Let's find the club ID first.
    // Let's check what club ID they used. It's in Storage/challenge_config.json probably.
    console.log("Starting scrape test...");
    // Let's use 1121339 or whatever club ID is.
    const clubId = '878992';
    const activities = await scrapeClubActivities(clubId, cookie, 80);
    console.log(`Total scraped: ${activities.length}`);
    const runs = activities.filter(a => a.type === 'Run');
    console.log(`Total runs: ${runs.length}`);
  } catch (e) {
    console.error(e);
  }
}

test();
