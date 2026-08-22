const fs = require('fs');
const path = require('path');

const TOTAL_KM_FILE = path.join(__dirname, '../Storage/Total-km-17-08-2026.csv');
const EXPORT_FILE = path.join(__dirname, '../Storage/club_members_export.csv');

// Đọc Total-km-17-08-2026.csv
const totalKmContent = fs.readFileSync(TOTAL_KM_FILE, 'utf8');
const totalKmLines = totalKmContent.split(/\r?\n/).filter(line => line.trim() !== '');

const athleteMap = new Map(); // key: "Firstname L." -> value: id

for (let i = 1; i < totalKmLines.length; i++) {
  const parts = totalKmLines[i].split(',');
  if (parts.length >= 2) {
    const fullName = parts[0].trim();
    const athleteUrl = parts[1].trim();
    
    // Extract ID
    const idMatch = athleteUrl.match(/\/athletes\/(\d+)/);
    const id = idMatch ? idMatch[1] : null;

    if (id && fullName) {
      // Parse Firstname and Lastname Initial
      const nameParts = fullName.split(' ');
      if (nameParts.length > 1) {
        const lastName = nameParts.pop();
        const firstName = nameParts.join(' ');
        const initial = lastName.charAt(0).toUpperCase() + '.';
        const matchKey = `${firstName}_${initial}`;
        athleteMap.set(matchKey, id);
      } else {
        athleteMap.set(`${fullName}_`, id); // no last name
      }
    }
  }
}

// Đọc club_members_export.csv
const exportContent = fs.readFileSync(EXPORT_FILE, 'utf8');
const exportLines = exportContent.split(/\r?\n/).filter(line => line.trim() !== '');

let updatedCsv = 'ID,First Name,Last Name,Admin,Owner\n';

for (let i = 1; i < exportLines.length; i++) {
  const parts = exportLines[i].split(',');
  if (parts.length >= 5) {
    let id = parts[0];
    const firstName = parts[1];
    const lastName = parts[2]; // e.g., "H."
    const admin = parts[3];
    const owner = parts[4];
    
    // Nếu ID là undefined hoặc Match Key, thử tìm trong athleteMap
    const searchKey = `${firstName}_${lastName}`;
    if (athleteMap.has(searchKey)) {
      id = athleteMap.get(searchKey);
    } else {
      id = 'undefined';
    }

    updatedCsv += `${id},${firstName},${lastName},${admin},${owner}\n`;
  }
}

fs.writeFileSync(EXPORT_FILE, updatedCsv, 'utf8');
console.log('Đã map ID thành công!');
