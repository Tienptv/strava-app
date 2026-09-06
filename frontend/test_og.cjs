const fs = require('fs');
fetch('https://www.strava.com/athletes/72851794')
  .then(r => r.text())
  .then(html => {
    const match = html.match(/<meta property="og:image" content="([^"]+)"/);
    console.log(match ? match[1] : 'Not found');
  });
