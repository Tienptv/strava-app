const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Storage', 'challenge_config.json');
const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Copy all 44 participants from July to August
data.monthlyParticipants['2026_8'] = JSON.parse(JSON.stringify(data.monthlyParticipants['2026_7']));

// Merge them into the global participants list as well just in case
Object.assign(data.participants, data.monthlyParticipants['2026_7']);

fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
console.log('Successfully copied 44 participants from July 2026 to August 2026.');
