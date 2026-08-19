const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../Storage/challenge_config.json');
const CSV_FILE = path.join(__dirname, '../Storage/Total-km-17-08-2026.csv');

function syncAthletes() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error('CSV file not found');
    return;
  }
  
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error('Config file not found');
    return;
  }

  const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
  const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
  let config = JSON.parse(configContent);
  
  if (!config.participants) config.participants = {};
  if (!config.monthlyParticipants) config.monthlyParticipants = {};
  if (!config.monthlyParticipants['2026_8']) config.monthlyParticipants['2026_8'] = {};

  const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
  let addedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    const fullName = (parts[0] || '').trim();
    if (!fullName) continue;

    const nameParts = fullName.split(' ');
    const firstname = nameParts[0];
    const lastnameFull = nameParts.length > 1 ? nameParts.slice(1).join('') : '';
    const lastname = lastnameFull ? lastnameFull[0].toUpperCase() + '.' : '.';
    
    // Some logic to handle special cases like "Xuan Nguyen" -> "Xuan_N." or "Thanh_X."
    // Let's just generate the key based on firstname_lastname
    let key = `${firstname}_${lastname}`;
    
    // Check if key already exists (maybe under a different spelling but we just check exact key for now)
    // To be safe, if we find another key with same firstname we might skip or not.
    // Let's just check if it exists in participants
    let foundInGlobal = false;
    let foundInMonth = false;

    // Check by firstname
    for (const existingKey of Object.keys(config.participants)) {
      if (config.participants[existingKey].firstname === firstname && 
          config.participants[existingKey].lastname === lastname) {
        foundInGlobal = true;
        key = existingKey;
        break;
      }
      if (config.participants[existingKey].firstname === firstname && 
          config.participants[existingKey].lastname[0] === lastname[0]) {
        // approximate match
        foundInGlobal = true;
        key = existingKey;
        break;
      }
    }

    if (!foundInGlobal) {
      config.participants[key] = {
        resource_state: 2,
        firstname: firstname,
        lastname: lastname,
        membership: "member",
        admin: false,
        owner: false
      };
      console.log(`Added ${fullName} to participants as ${key}`);
      addedCount++;
    }

    // Now ensure they are in 2026_8
    if (!config.monthlyParticipants['2026_8'][key]) {
      config.monthlyParticipants['2026_8'][key] = config.participants[key];
      console.log(`Added ${fullName} to monthlyParticipants[2026_8] as ${key}`);
    }
  }

  if (addedCount > 0 || true) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    console.log('Successfully updated challenge_config.json');
  } else {
    console.log('No new athletes to add.');
  }
}

syncAthletes();
