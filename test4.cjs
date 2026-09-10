const fs = require('fs');

function getCompKey(act) {
  const d = (act.start_date_local || '').substring(0, 16);
  const t = act.moving_time || 0;
  const dist = Math.round(act.distance || 0);
  const athId = act.athlete?.id || '';
  const name = `${act.athlete?.firstname || ''}_${act.athlete?.lastname || ''}`.toLowerCase().replace(/[\.\s]/g, '');
  return `comp_${athId || name}_${d}_${t}_${dist}`;
}

function isBetterRecord(a, b) {
  if (!b) return true;
  if (a.start_date_local && !b.start_date_local) return true;
  if (!a.start_date_local && b.start_date_local) return false;
  
  if (a.start_date_local && b.start_date_local) {
    const dateA = new Date(a.start_date_local);
    const dateB = new Date(b.start_date_local);
    if (dateA.getTime() > dateB.getTime()) return true;
  }
  
  const aLastname = a.athlete?.lastname || '';
  const bLastname = b.athlete?.lastname || '';
  if (aLastname.length > 2 && bLastname.length <= 2) return true;
  
  // Ưu tiên bản có map_url
  if (a.map_url && !b.map_url) return true;
  if (a.map_url && b && !b.map_url) b.map_url = a.map_url;
  
  return false;
}

function mergeActivitiesList(existingList, newList) {
  const uniqueMap = new Map();

  const addRecord = (act) => {
    if (!act) return;
    const idKey = act.id ? `id_${act.id}` : null;
    const cKey = getCompKey(act);

    if (idKey) {
      const existing = uniqueMap.get(idKey);
      if (!existing || isBetterRecord(act, existing)) {
        uniqueMap.set(idKey, act);
      }
    }
    
    const existingComp = uniqueMap.get(cKey);
    if (!existingComp || isBetterRecord(act, existingComp)) {
      uniqueMap.set(cKey, act);
    }
  };

  (existingList || []).forEach(addRecord);
  (newList || []).forEach(addRecord);

  const finalSet = new Set(uniqueMap.values());
  return Array.from(finalSet);
}

const existing = require('./Storage/imported_activities.json');

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
    const rawDistStr = String(row.Distance || 0).toLowerCase();
    const isMiles = rawDistStr.includes('mi') || rawDistStr.includes('mile') || rawDistStr.includes('dặm');
    let distNum = parseFloat(rawDistStr.replace(',', '.').replace(/[^\d.-]/g, ''));
    if (!isNaN(distNum) && isMiles) { distNum = distNum * 1.609344; }
    let dist = isNaN(distNum) ? 0 : Math.round(distNum * 1000);
    
    activities.push({
      id: row['Activity ID'] || row.id || row.Id,
      distance: dist,
      map_url: row['Map URL'] || ''
    });
  });
  return activities;
}

const newActs = parseStorageCSV(content);
console.log('existing count:', existing.length);
console.log('newActs count:', newActs.length);
const merged = mergeActivitiesList(existing, newActs);
console.log('merged count:', merged.length);
const withMap = merged.filter(a => a.map_url);
console.log('merged with map:', withMap.length);
if(withMap.length > 0) {
    console.log(withMap[0].map_url);
}
