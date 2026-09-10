const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, '../Storage/data-autosync-scrape-2026-09-11-030307.csv'), 'utf8');

function parseCSVLine(text) {
  let row = [''], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') { row[row.length-1] += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else {
      row[row.length-1] += c;
    }
  }
  return row.map(s => s.trim().replace(/^["']|["']$/g, ''));
}

const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
const rawHeaders = parseCSVLine(lines[0]);
console.log('Headers:', rawHeaders);
const vals = parseCSVLine(lines[1]);
console.log('Vals length:', vals.length, 'Vals:', vals);

const headers = rawHeaders.map(h => h.replace(/["']/g, '').trim());
const obj = {};
headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
console.log('Obj Map URL:', obj['Map URL']);
