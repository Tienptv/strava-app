const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../Storage/challenge_config.json');
const athleteNamesFile = path.join(__dirname, '../Storage/AthleteID_Name.csv');

if (!fs.existsSync(configPath) || !fs.existsSync(athleteNamesFile)) {
  console.error('Missing config or names file');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const lines = fs.readFileSync(athleteNamesFile, 'utf8').split('\n');

const fullNameMap = {};
lines.forEach(line => {
  const parts = line.trim().split(',');
  if (parts.length >= 2) {
    const fullName = parts.slice(1).join(',').trim();
    if (fullName && fullName !== 'Name') {
      const nameParts = fullName.split(' ');
      const fn = nameParts[0];
      const ln = nameParts.slice(1).join(' ');
      if (ln) {
        const initial = ln.charAt(0).toUpperCase() + '.';
        const matchKey = `${fn}_${initial}`;
        fullNameMap[matchKey] = {
          firstname: fn,
          lastname: ln
        };
      }
    }
  }
});

let updated = 0;

if (config.participants) {
  Object.keys(config.participants).forEach(key => {
    if (fullNameMap[key]) {
      config.participants[key].firstname = fullNameMap[key].firstname;
      config.participants[key].lastname = fullNameMap[key].lastname;
      updated++;
    }
  });
}

if (config.monthlyParticipants) {
  Object.keys(config.monthlyParticipants).forEach(month => {
    const monthData = config.monthlyParticipants[month];
    Object.keys(monthData).forEach(key => {
      if (fullNameMap[key]) {
        monthData[key].firstname = fullNameMap[key].firstname;
        monthData[key].lastname = fullNameMap[key].lastname;
      }
    });
  });
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
console.log(`Updated ${updated} participants with full names.`);
