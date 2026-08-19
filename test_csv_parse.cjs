const fs = require('fs');
const content = fs.readFileSync('Storage/activities_export_2026-08-19.csv', 'utf8');

function parseCSVLine(text) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && (i === 0 || text[i-1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
const rawHeaders = parseCSVLine(lines[0]);
const headers = rawHeaders.map(h => h.replace(/["']/g, '').trim());

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const vals = parseCSVLine(lines[i]);
  const obj = {};
  headers.forEach((h, idx) => { obj[h] = vals[idx] ? vals[idx].replace(/["']/g, '').trim() : ''; });
  rows.push(obj);
}

const activities = [];
rows.forEach(row => {
    let distRaw = Object.entries(row).find(([k,v]) => k.includes('Distance') || k.includes('km') || k.includes('Quãng Đường') || k.includes('Quang Du?ng'))?.[1] || 0;
    let dist = parseFloat(String(distRaw).replace(',', '.').replace(/[^\d.-]/g, ''));
    dist = isNaN(dist) ? 0 : dist * 1000;
    
    let timeRaw = Object.entries(row).find(([k,v]) => k.includes('Time') || k.includes('Thời Gian') || k.includes('Th?i Gian') || k.includes('phút'))?.[1] || '00:00:00';
    let movingTimeStr = String(timeRaw);
    let movingTimeSec = 0;
    if (movingTimeStr.includes(':')) {
      let timeParts = movingTimeStr.split(':').map(Number);
      if (timeParts.length === 3) movingTimeSec = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
      else if (timeParts.length === 2) movingTimeSec = timeParts[0] * 60 + timeParts[1];
    } else {
      movingTimeSec = Math.round(parseFloat(movingTimeStr) * 60) || 0;
    }

    let athleteIdRaw = Object.entries(row).find(([k,v]) => k.includes('Athlete ID'))?.[1] || null;
    let athleteId = athleteIdRaw ? parseInt(athleteIdRaw, 10) : null;
    if (!athleteId && row.Athlete && String(row.Athlete).includes('/athletes/')) {
      athleteId = parseInt(String(row.Athlete).replace('/athletes/', ''), 10);
    }

    let nameRaw = Object.entries(row).find(([k,v]) => k.includes('Name') || k.includes('Tên VĐV') || k.includes('Tn VDV'))?.[1] || '';
    let athleteName = String(nameRaw);

    let dateRaw = Object.entries(row).find(([k,v]) => k.includes('Date') || k.includes('Ngày') || k.includes('Ngy') || k.includes('Ng?y'))?.[1] || Object.values(row).find(v => String(v).includes('T') && String(v).includes('Z')) || '';
    let dateStr = String(dateRaw);
    let localIsoStr = null;
    if (dateStr.includes('T')) {
      localIsoStr = dateStr.substring(0, 19) + 'Z';
    }

    activities.push({
      distance: dist,
      moving_time: movingTimeSec,
      athleteId,
      athleteName,
      localIsoStr
    });
});
console.log('Parsed activities (first 2):', activities.slice(0, 2));
