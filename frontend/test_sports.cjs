const fs = require('fs');
const html = fs.readFileSync('athlete_profile.html', 'utf8');

const tableRegex = /<table[^>]*class=\"[^\"]*striped[^\"]*\"[^>]*>([\s\S]*?)<\/table>/is;
const match = html.match(tableRegex);
if(match) {
    const tableHtml = match[1];
    
    // Get headers
    const buttons = tableHtml.match(/<button[^>]*title=\"([^\"]+)\"/gis);
    if(buttons) {
        console.log("Sports:");
        console.log(buttons.map(b => b.match(/title=\"([^\"]+)\"/i)[1]));
    }
}
