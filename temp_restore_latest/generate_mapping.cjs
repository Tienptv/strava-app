const fs = require('fs');
const path = require('path');

const storageDir = path.join(__dirname, 'Storage');
const clubMembersFile = path.join(storageDir, 'club_members_export.csv');
const athleteIdFile = path.join(storageDir, 'AthleteID_Name.csv');
const configJsonFile = path.join(storageDir, 'challenge_config.json');

const clubMembersData = fs.readFileSync(clubMembersFile, 'utf8').split('\n').filter(l => l.trim().length > 0);
const athleteIdData = fs.readFileSync(athleteIdFile, 'utf8').split('\n').filter(l => l.trim().length > 0);
const configData = JSON.parse(fs.readFileSync(configJsonFile, 'utf8'));

// 1. Build map: FullName -> AthleteID
const athleteIdMap = {};
for (let i = 1; i < athleteIdData.length; i++) {
    const line = athleteIdData[i].trim();
    if (!line) continue;
    const firstComma = line.indexOf(',');
    if (firstComma > -1) {
        const id = line.substring(0, firstComma).trim();
        let name = line.substring(firstComma + 1).trim();
        if (name.startsWith('"') && name.endsWith('"')) {
             name = name.substring(1, name.length - 1);
        }
        athleteIdMap[name.toLowerCase()] = id;
    }
}

// 2. Build map: MatchKey -> FullName
const matchKeyToFullName = {};
for (let i = 1; i < clubMembersData.length; i++) {
    const parts = clubMembersData[i].split(',');
    if (parts.length >= 4) {
        const matchKey = parts[0].trim();
        const fullName = parts[3].trim();
        if (matchKey && fullName) {
            matchKeyToFullName[matchKey] = fullName;
        }
    }
}

// 3. Process challenge_config.json participants
let mapping = {};
const participants = configData.participants || configData;
for (const key of Object.keys(participants)) {
    const p = participants[key];
    const abbreviatedName = `${p.firstname} ${p.lastname}`;
    const matchKey = key;
    let fullName = matchKeyToFullName[matchKey];
    
    // If exact matchKey not found, try to reconstruct it or search
    if (!fullName) {
         const foundKey = Object.keys(matchKeyToFullName).find(k => k.replace('_', ' ') === abbreviatedName);
         if (foundKey) fullName = matchKeyToFullName[foundKey];
    }
    if (!fullName) fullName = '';

    const athleteId = athleteIdMap[fullName.toLowerCase()] || null;

    mapping[abbreviatedName] = {
        key: matchKey,
        fullName: fullName,
        athleteId: athleteId
    };
    mapping[matchKey] = {
        abbreviatedName: abbreviatedName,
        fullName: fullName,
        athleteId: athleteId
    };
}

fs.writeFileSync(path.join(storageDir, 'name_mapping.json'), JSON.stringify(mapping, null, 2), 'utf8');
console.log('Mapping file created successfully!');
