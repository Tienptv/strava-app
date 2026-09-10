const fs = require('fs');
const content = fs.readFileSync('Storage/data-autosync-scrape-2026-09-11-031303.csv', 'utf8');

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

function parseStorageCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(h => h.replace(/["']/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
    rows.push(obj);
  }
  
  const activities = [];
  rows.forEach(row => {
    activities.push({
      id: row['Activity ID'] || row.id || row.Id,
      map_url: row['Map URL'] || '',
      rawRowKeys: Object.keys(row)
    });
  });
  return activities;
}

const acts = parseStorageCSV(content);
console.log('Acts length:', acts.length);
console.log('Acts[0]:', acts[0]);
