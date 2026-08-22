const fs = require('fs');

const content = fs.readFileSync('Storage/data-2026-8-16-21.csv', 'utf-8');
const lines = content.split('\n');
const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
console.log("Headers:", headers);

const firstData = lines[1].split(',').map(h => h.replace(/"/g, '').trim());
console.log("First data:", firstData);

const row = {};
headers.forEach((h, i) => { row[h] = firstData[i]; });
console.log("Parsed row:", row);

let activityId = null;
if (row.Activity) {
  const match = String(row.Activity).match(/\d+/);
  if (match) activityId = match[0];
} else if (row['Activity ID'] || row.id || row.Id) {
  activityId = String(row['Activity ID'] || row.id || row.Id);
}

console.log("Activity ID:", activityId);
