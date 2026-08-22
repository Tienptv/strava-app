const fs = require('fs');

const imported = JSON.parse(fs.readFileSync('Storage/imported_activities.json', 'utf-8'));
const totalKmCsv = fs.readFileSync('Storage/Total-km-17-08-2026.csv', 'utf-8');

// Parse Total-km
const totalKmBase = {};
const lines = totalKmCsv.split('\n');
lines.forEach(line => {
  const parts = line.split(',');
  if (parts.length >= 3) {
    const idMatch = parts[1].match(/\d+/);
    if (idMatch) {
      totalKmBase[idMatch[0]] = parseFloat(parts[2]);
    }
  }
});

// We need challengeStats.js logic
// Actually, let's just copy the logic or require it.
// Wait, challengeStats.js is ES module? Yes, it uses "export function".
// Let's just create an ES module runner or copy the deduplication logic.

const allChallengeActivities = [...imported]; // just imported for now

const normalize = (n) => (n || '').trim().toLowerCase().replace(/[\.\s]/g, '');

const activities = allChallengeActivities;
const seenActKeys = new Set();
const currentMonthActivities = activities.filter(act => {
  if (act.distance === undefined || act.distance < 5) return false;
  if (!act.start_date_local) return false;
  const localDateStr = act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local;
  const date = new Date(localDateStr);
  
  if (isNaN(date.getTime())) return false;
  const actYear = date.getFullYear();
  const actMonth = date.getMonth() + 1;
  const actDay = date.getDate();

  const now = new Date('2026-08-18T12:00:00Z'); // simulate current time
  const year = 2026;
  const month = 8;
  const isCurrentMonth = true;

  if (actYear === year && actMonth === month) {
    if (isCurrentMonth && actDay > now.getDate()) return false;
    
    const actId = act.id ? String(act.id) : null;
    const athleteId = act.athlete?.id || '';
    const athleteName = `${normalize(act.athlete?.firstname)}_${normalize(act.athlete?.lastname)}`;
    const timeMinute = localDateStr.substring(0, 16);
    const distMeter = Math.round(act.distance);
    const moveSec = act.moving_time || 0;

    const actKey = actId ? `id_${actId}` : `composite_${athleteId || athleteName}_${timeMinute}_${distMeter}_${moveSec}`;
    if (seenActKeys.has(actKey)) return false;
    seenActKeys.add(actKey);
    return true;
  }
  return false;
});

const myMap = {};
currentMonthActivities.forEach(act => {
    if (act.athlete?.firstname === 'Sang') {
        const id = act.athlete?.id;
        if (!myMap[id]) myMap[id] = 0;
        myMap[id] += act.distance;
        console.log("Adding:", act.distance, act.start_date_local, act.id);
    }
});

console.log("Sang total distance:", myMap);

