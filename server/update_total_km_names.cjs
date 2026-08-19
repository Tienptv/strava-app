const fs = require('fs');
const path = require('path');

const TOTAL_KM_FILE = path.join(__dirname, '../Storage/Total-km-17-08-2026.csv');
const EXPORT_FILE = path.join(__dirname, '../Storage/club_members_export.csv');

// 1. Đọc club_members_export.csv để tạo map: ID -> Tên (theo định dạng CLB)
const exportContent = fs.readFileSync(EXPORT_FILE, 'utf8');
const exportLines = exportContent.split(/\r?\n/).filter(line => line.trim() !== '');

const idToClubNameMap = new Map();

// Bỏ qua dòng header
for (let i = 1; i < exportLines.length; i++) {
  const parts = exportLines[i].split(',');
  if (parts.length >= 5) {
    const id = parts[0].trim();
    const firstName = parts[1].trim();
    const lastName = parts[2].trim();
    if (id !== 'undefined' && id !== '') {
      idToClubNameMap.set(id, `${firstName} ${lastName}`);
    }
  }
}

// 2. Đọc và cập nhật Total-km-17-08-2026.csv
const totalKmContent = fs.readFileSync(TOTAL_KM_FILE, 'utf8');
const totalKmLines = totalKmContent.split(/\r?\n/).filter(line => line.trim() !== '');

let updatedTotalKmCsv = '';

for (let i = 0; i < totalKmLines.length; i++) {
  if (i === 0) {
    // Giữ nguyên header
    updatedTotalKmCsv += totalKmLines[i] + '\n';
    continue;
  }

  const line = totalKmLines[i];
  const parts = line.split(',');
  if (parts.length >= 2) {
    let name = parts[0].trim();
    const athleteUrl = parts[1].trim();
    
    // Lấy ID
    const idMatch = athleteUrl.match(/\/athletes\/(\d+)/);
    const id = idMatch ? idMatch[1] : null;

    if (id && idToClubNameMap.has(id)) {
      name = idToClubNameMap.get(id); // Lấy tên từ CLB
    }

    parts[0] = name;
    updatedTotalKmCsv += parts.join(',') + '\n';
  } else {
    updatedTotalKmCsv += line + '\n';
  }
}

fs.writeFileSync(TOTAL_KM_FILE, updatedTotalKmCsv, 'utf8');
console.log('Đã cập nhật tên trong Total-km theo tên của CLB!');
