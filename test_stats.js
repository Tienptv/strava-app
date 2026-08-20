const fs = require('fs');
const path = require('path');
const { calculateChallengeStats } = require('./src/utils/challengeStats.js');

const importedData = JSON.parse(fs.readFileSync('./Storage/imported_activities.json', 'utf8'));
const config = JSON.parse(fs.readFileSync('./Storage/challenge_config.json', 'utf8'));

const year = 2026;
const month = parseInt(config.monthKey.split('_')[1], 10);
// Wait, the user selected month might be 8? Let's check the date of activities.
const stats = calculateChallengeStats(importedData, year, month, config.participants, 0);

console.log(JSON.stringify(stats['Thinh_V.'], null, 2));
