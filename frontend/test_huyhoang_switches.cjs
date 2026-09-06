const fs = require('fs');
const html = fs.readFileSync('huyhoang_profile.html', 'utf8');

const regex = /<ul class=\"switches\">([\s\S]*?)<\/ul>/g;
let match = regex.exec(html);
if(match) {
    console.log(match[1]);
}
