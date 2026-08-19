const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Storage', 'challenge_config.json');
const targetsPath = path.join(__dirname, '..', 'Storage', 'targets.json');
const csvPath = path.join(__dirname, '..', 'Storage', 'Total-km-17-08-2026.csv');
const histPath = path.join(__dirname, '..', 'Storage', 'historical_activities.json');
const impPath = path.join(__dirname, '..', 'Storage', 'imported_activities.json');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const targets = fs.existsSync(targetsPath) ? JSON.parse(fs.readFileSync(targetsPath, 'utf8')) : {};
const csvLines = fs.existsSync(csvPath) ? fs.readFileSync(csvPath, 'utf8').split('\n') : [];
const histActs = fs.existsSync(histPath) ? JSON.parse(fs.readFileSync(histPath, 'utf8') || '[]') : [];
const impActs = fs.existsSync(impPath) ? JSON.parse(fs.readFileSync(impPath, 'utf8') || '[]') : [];
const allActs = [...histActs, ...impActs];

const normalize = (n) => (n||'').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[\.\s_-]/g, '');

function findId(p) {
  if (p.id) return p.id;
  
  // Try CSV
  for (let l of csvLines) {
    const parts = l.split(',');
    if (parts.length >= 2 && parts[1].includes('/athletes/')) {
      const cname = normalize(parts[0]);
      const pFname = normalize(p.firstname);
      const pLname = normalize(p.lastname);
      const full = normalize(p.firstname + p.lastname);
      const csvFirst = normalize(parts[0].split(' ')[0]);
      const csvRest = normalize(parts[0].split(' ').slice(1).join(''));
      
      if (cname === full || (pFname === csvFirst && csvRest.startsWith(pLname))) {
        return parseInt(parts[1].split('/athletes/')[1].trim(), 10);
      }
    }
  }
  
  // Try Activities
  for (let act of allActs) {
    if (act.athlete && act.athlete.id) {
      const actFname = normalize(act.athlete.firstname);
      const actLname = normalize(act.athlete.lastname);
      const pFname = normalize(p.firstname);
      const pLname = normalize(p.lastname);
      if (actFname === pFname && (actLname === pLname || actLname.startsWith(pLname) || pLname.startsWith(actLname))) {
        return parseInt(act.athlete.id, 10);
      }
    }
  }
  
  return null;
}

const keyToIdMap = {};

// Migrate participants
const newParticipants = {};
Object.keys(config.participants).forEach(k => {
  const p = config.participants[k];
  const id = findId(p);
  if (id) {
    p.id = id;
    newParticipants[String(id)] = p;
    keyToIdMap[k] = String(id);
  } else {
    newParticipants[k] = p;
  }
});
config.participants = newParticipants;

// Migrate monthlyParticipants
if (config.monthlyParticipants) {
  Object.keys(config.monthlyParticipants).forEach(month => {
    const newMonth = {};
    Object.keys(config.monthlyParticipants[month]).forEach(k => {
      const p = config.monthlyParticipants[month][k];
      const id = findId(p);
      if (id) {
        p.id = id;
        newMonth[String(id)] = p;
        keyToIdMap[k] = String(id);
      } else {
        newMonth[k] = p;
      }
    });
    config.monthlyParticipants[month] = newMonth;
  });
}

// Migrate targets.json
const newTargets = {};
Object.keys(targets).forEach(k => {
  let mapped = false;
  for (const oldKey of Object.keys(keyToIdMap)) {
    if (k.startsWith(oldKey)) {
      const newKey = k.replace(oldKey, keyToIdMap[oldKey]);
      newTargets[newKey] = targets[k];
      mapped = true;
      break;
    }
  }
  if (!mapped) {
    newTargets[k] = targets[k];
  }
});

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
fs.writeFileSync(targetsPath, JSON.stringify(newTargets, null, 2));
console.log('Migration complete.');
