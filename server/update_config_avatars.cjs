const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../Storage/challenge_config.json');
const avatarsPath = path.join(__dirname, '../Storage/avatars.json');

if (!fs.existsSync(configPath) || !fs.existsSync(avatarsPath)) {
  console.error('Missing config or avatars file');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const avatars = JSON.parse(fs.readFileSync(avatarsPath, 'utf8'));

let updated = 0;

if (config.participants) {
  Object.keys(config.participants).forEach(key => {
    if (avatars[key] && avatars[key].profile_medium) {
      config.participants[key].profile_medium = avatars[key].profile_medium;
      config.participants[key].profile = avatars[key].profile;
      updated++;
    }
  });
}

if (config.monthlyParticipants) {
  Object.keys(config.monthlyParticipants).forEach(month => {
    const monthData = config.monthlyParticipants[month];
    Object.keys(monthData).forEach(key => {
      if (avatars[key] && avatars[key].profile_medium) {
        monthData[key].profile_medium = avatars[key].profile_medium;
        monthData[key].profile = avatars[key].profile;
      }
    });
  });
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
console.log(`Updated ${updated} participants with avatars in challenge_config.json.`);
