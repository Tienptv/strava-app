const fs = require('fs');
const html = fs.readFileSync('athlete_profile.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);
const stats = [];
$('table').each((i, table) => {
  if ($(table).text().includes('All-Time')) {
    $(table).find('tr').each((j, tr) => {
      stats.push($(tr).text().replace(/\s+/g, ' ').trim());
    });
  }
});
console.log(stats);
