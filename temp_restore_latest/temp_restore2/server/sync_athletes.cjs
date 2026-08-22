const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Storage', 'challenge_config.json');
const csvPath = path.join(__dirname, '..', 'Storage', 'Total-km-17-08-2026.csv');

function syncAthletes() {
  if (!fs.existsSync(configPath) || !fs.existsSync(csvPath)) {
    console.error('Không tìm thấy file config hoặc file csv.');
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(l => l.trim());

  let addedCount = 0;
  
  if (!config.participants) {
    config.participants = {};
  }
  if (!config.monthlyParticipants) {
    config.monthlyParticipants = {};
  }
  if (!config.monthlyParticipants['2026_8']) {
    config.monthlyParticipants['2026_8'] = {};
  }

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 2) {
      const name = (parts[0] || '').trim();
      const athleteUrl = (parts[1] || '').trim();
      
      let athleteId = null;
      const idMatch = athleteUrl.match(/\/athletes\/(\d+)/);
      if (idMatch) {
        athleteId = parseInt(idMatch[1], 10);
      }

      if (name && athleteId) {
        const nameParts = name.split(' ');
        const lastname = nameParts.length > 1 ? nameParts.pop() : '';
        const firstname = nameParts.join(' ');
        
        const key = String(athleteId);

        // Check if ID is in config.participants
        if (!config.participants[key]) {
          const newRunner = {
            id: athleteId,
            firstname: firstname,
            lastname: lastname,
            membership: 'member',
            admin: false,
            owner: false
          };
          config.participants[key] = { ...newRunner };
          config.monthlyParticipants['2026_8'][key] = { ...newRunner };
          addedCount++;
          console.log(`Added new runner by ID: ${key} (${name})`);
        }
      }
    }
  }

  if (addedCount > 0) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Đã thêm ${addedCount} runners mới từ file CSV vào challenge_config.json`);
  } else {
    console.log('Không có runner mới nào được thêm vào.');
  }
}

syncAthletes();
