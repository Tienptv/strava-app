const fs = require('fs');
const content = fs.readFileSync('Storage/data-2026-8-16-21.csv', 'utf-8');
const lines = content.split('\n');
console.log("Header line:", lines[0]);
console.log("First data line:", lines[1]);
