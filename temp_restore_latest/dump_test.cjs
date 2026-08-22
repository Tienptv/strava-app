const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

(async () => {
  dotenv.config({ path: path.join(__dirname, '.env') });
  const { StravaAPI } = await import('./server/strava.js');
  
  const strava = new StravaAPI(
    process.env.STRAVA_CLIENT_ID,
    process.env.STRAVA_CLIENT_SECRET
  );

  const TOKENS_FILE = path.join(__dirname, 'Storage/tokens.json');
  const tokensData = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  const adminId = Object.keys(tokensData)[0];
  const access_token = tokensData[adminId].access_token;
  
  console.log('Fetching club activities...');
  const CLUB_ID = '878992';
  try {
    const acts = await strava.getClubActivities(access_token, CLUB_ID, { page: 1, per_page: 2 });
    console.log(JSON.stringify(acts, null, 2));
  } catch (err) {
    console.error(err.message);
  }
})();
