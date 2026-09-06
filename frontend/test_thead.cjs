const fs = require('fs');
const html = fs.readFileSync('athlete_profile.html', 'utf8');

const theadRegex = /<thead[^>]*>(.*?)<\/thead>/gis;
let match;
while ((match = theadRegex.exec(html)) !== null) {
    const thead = match[1];
    const ths = thead.match(/<th[^>]*>(.*?)<\/th>/gis);
    if (ths) {
        const texts = ths.map(th => th.replace(/<[^>]+>/g, '').trim());
        if (texts.includes('All-Time')) {
            console.log("Found All-Time table headers:");
            console.log(texts);
        }
    }
}
