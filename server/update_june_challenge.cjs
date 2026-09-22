const fs = require('fs');
const path = require('path');

const storageDir = path.join(__dirname, '../Storage');
const histFile = path.join(storageDir, 'historical_activities.json');
const cfgFile = path.join(storageDir, 'challenge_config.json');
const nameMappingFile = path.join(storageDir, 'name_mapping.json');
const targetsFile = path.join(storageDir, 'targets.json');
const penFile = path.join(storageDir, 'member_penalties_mapping.json');
const csvFile = path.join(storageDir, 'Month-6-2026.csv');

console.log('=== BẮT ĐẦU CẬP NHẬT CHALLENGE THÁNG 6/2026 ===');

// 0. Tạo backup an toàn
const backupDir = path.join(storageDir, 'backup_month6_' + Date.now());
fs.mkdirSync(backupDir, { recursive: true });
['historical_activities.json', 'challenge_config.json', 'name_mapping.json', 'targets.json', 'member_penalties_mapping.json', 'Month-6-2026.csv'].forEach(f => {
  const src = path.join(storageDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(backupDir, f));
  }
});
console.log('1. Đã tạo thư mục backup an toàn tại:', backupDir);

// 1. Cập nhật historical_activities.json: Thêm bài chạy 5.03km ngày 05/06 cho Katy Nguyen
const hist = JSON.parse(fs.readFileSync(histFile, 'utf8'));
const katyActExists = hist.some(a => 
  String(a.athlete?.id) === '149162660' && 
  a.start_date_local && 
  a.start_date_local.startsWith('2026-06-05')
);

if (!katyActExists) {
  const newKatyAct = {
    id: 19035991542,
    name: 'Official Challenge Run - 05/06/2026',
    distance: 5030,
    moving_time: 3549,
    elapsed_time: 3549,
    type: 'Run',
    sport_type: 'Run',
    start_date: '2026-06-05T19:38:00Z',
    start_date_local: '2026-06-05T19:38:00',
    athlete: {
      id: 149162660,
      firstname: 'Katy',
      lastname: 'Nguyen'
    }
  };
  hist.push(newKatyAct);
  fs.writeFileSync(histFile, JSON.stringify(hist, null, 2), 'utf8');
  console.log('2. Đã bổ sung bài chạy 5.03 km ngày 05/06 cho Katy Nguyen vào historical_activities.json.');
} else {
  console.log('2. Bài chạy 05/06 của Katy Nguyen đã tồn tại trong historical_activities.json.');
}

// 2. Cập nhật Month-6-2026.csv: Giữ 122.28 km cho Tien Pham (Day 14 = 2.59) và 31.07 km cho Huy Vu (Day 23 = 2.28, Day 27 = 7.07)
let csvContent = fs.readFileSync(csvFile, 'utf8');
const csvLines = csvContent.split(/\r?\n/);
const updatedCsvLines = csvLines.map(line => {
  if (line.startsWith('Tien Pham,')) {
    const parts = line.split(',');
    // parts[0] = Name, parts[1] = Day 1, ..., parts[14] = Day 14
    parts[14] = '2.59';
    return parts.join(',');
  }
  if (line.startsWith('Huy Vu,')) {
    const parts = line.split(',');
    // parts[23] = Day 23, parts[27] = Day 27
    parts[23] = '2.28';
    parts[27] = '7.07';
    return parts.join(',');
  }
  return line;
});
fs.writeFileSync(csvFile, updatedCsvLines.join('\n'), 'utf8');
console.log('3. Đã cập nhật Month-6-2026.csv: Tien Pham ngày 14 = 2.59km (tổng 122.28 km), Huy Vu ngày 23 = 2.28km & ngày 27 = 7.07km (tổng 31.07 km).');

// 3. Cập nhật challenge_config.json: Chuẩn hóa đúng 16 VĐV chính thức cho monthlyParticipants['2026_6']
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
if (!cfg.monthlyParticipants) cfg.monthlyParticipants = {};

// 16 VĐV chính thức
const official16Defs = [
  { key: 'Huy_H.', id: '103943712', firstname: 'Huy', lastname: 'Hoang', name: 'Huy Hoang', membership: 'member', admin: false, owner: false },
  { key: 'Tien_P.', id: '133066813', firstname: 'Tien', lastname: 'PhamTV', name: 'Tien PhamTV', membership: 'member', admin: false, owner: false },
  { key: 'Thanh_X.', id: '106101923', firstname: 'Thanh', lastname: 'Xuan', name: 'Thanh Xuan', membership: 'member', admin: false, owner: false },
  { key: 'Katy_N.', id: '149162660', firstname: 'Katy', lastname: 'Nguyen', name: 'Katy Nguyen', membership: 'member', admin: false, owner: false },
  { key: 'Quy_T.', id: '79037203', firstname: 'Quy', lastname: 'Truong', name: 'Quy Truong', membership: 'member', admin: true, owner: false },
  { key: 'Abba_V.', id: '73380484', firstname: 'Abba', lastname: 'Vũ', name: 'Abba Vũ', membership: 'member', admin: false, owner: false },
  { key: 'Sang_N.', id: '125487039', firstname: 'Sang', lastname: 'Nguyen', name: 'Sang Nguyen', membership: 'member', admin: false, owner: false },
  { key: 'Thinh_V.', id: '77523597', firstname: 'Thinh', lastname: 'Vu', name: 'Thinh Vu', membership: 'member', admin: true, owner: false },
  { key: 'Khương_P.', id: '129623990', firstname: 'Khương', lastname: 'Phạm', name: 'Khương Phạm', membership: 'member', admin: false, owner: false },
  { key: 'Huy_V.', id: '51364143', firstname: 'Huy', lastname: 'Vu', name: 'Huy Vu', membership: 'member', admin: false, owner: false },
  { key: 'Tam_N.', id: '106178600', firstname: 'Tam', lastname: 'Nguyen', name: 'Tam Nguyen', membership: 'member', admin: false, owner: false },
  { key: 'An_H.', id: '110041582', firstname: 'An', lastname: 'Ha', name: 'An Ha', membership: 'member', admin: false, owner: false },
  { key: 'Lieu_V.', id: '72851794', firstname: 'Lieu', lastname: 'Vo', name: 'Lieu Vo', membership: 'member', admin: true, owner: true },
  { key: 'Benjamin_D.', id: '83759389', firstname: 'Benjamin', lastname: 'Dang', name: 'Benjamin Dang', membership: 'member', admin: false, owner: false },
  { key: 'Cuong_N.', id: '50684496', firstname: 'Cuong', lastname: 'Nguyen', name: 'Cuong Nguyen', membership: 'member', admin: false, owner: false },
  { key: 'Thanh_D.', id: '87080139', firstname: 'Thanh', lastname: 'Dao', name: 'Thanh Dao', membership: 'member', admin: false, owner: false }
];

const newMonth6Parts = {};
official16Defs.forEach(item => {
  // Find avatar and metadata from cfg.participants if available
  const existingInCfg = cfg.participants[item.key] || 
    Object.values(cfg.participants || {}).find(p => String(p.id) === item.id) || 
    (cfg.monthlyParticipants['2026_8'] && cfg.monthlyParticipants['2026_8'][item.key]) || {};

  newMonth6Parts[item.key] = {
    matchKey: item.key,
    id: item.id,
    athleteId: item.id,
    firstname: item.firstname,
    lastname: item.lastname,
    name: item.name,
    profile_medium: existingInCfg.profile_medium || `https://dgalywyr863hv.cloudfront.net/pictures/athletes/${item.id}/medium.jpg`,
    profile: existingInCfg.profile || `https://dgalywyr863hv.cloudfront.net/pictures/athletes/${item.id}/large.jpg`,
    avatar: existingInCfg.avatar || '',
    membership: item.membership,
    admin: item.admin,
    owner: item.owner,
    resource_state: 2,
    _fromConfig: true
  };
});

cfg.monthlyParticipants['2026_6'] = newMonth6Parts;

// Also ensure all 16 are in cfg.participants so year-long charts include them
official16Defs.forEach(item => {
  if (!cfg.participants[item.key]) {
    cfg.participants[item.key] = { ...newMonth6Parts[item.key] };
  } else {
    cfg.participants[item.key].id = item.id;
    cfg.participants[item.key].athleteId = item.id;
  }
});

fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2), 'utf8');
console.log('4. Đã cập nhật challenge_config.json: monthlyParticipants[\'2026_6\'] chuẩn hóa đúng 16 VĐV có ID.');

// 4. Cập nhật name_mapping.json: Bổ sung ánh xạ tên CSV sang Athlete ID và canonical key
const nm = JSON.parse(fs.readFileSync(nameMappingFile, 'utf8'));

const mappingsToAdd = {
  'Tien Pham': { key: 'Tien_P.', athleteId: '133066813', fullName: 'Tien PhamTV' },
  'Duong Vu': { key: 'Abba_V.', athleteId: '73380484', fullName: 'Abba Vũ' },
  'Thoa Nguyen': { key: 'Katy_N.', athleteId: '149162660', fullName: 'Katy Nguyen' },
  'Xuan Nguyen': { key: 'Thanh_X.', athleteId: '106101923', fullName: 'Thanh Xuan' },
  'Khuong Pham': { key: 'Khương_P.', athleteId: '129623990', fullName: 'Khương Phạm' },
  'Hieu Dang': { key: 'Benjamin_D.', athleteId: '83759389', fullName: 'Benjamin Dang' },
  'Abba Vũ': { key: 'Abba_V.', athleteId: '73380484', fullName: 'Abba Vũ' },
  'Khương Phạm': { key: 'Khương_P.', athleteId: '129623990', fullName: 'Khương Phạm' },
  'Benjamin Dang': { key: 'Benjamin_D.', athleteId: '83759389', fullName: 'Benjamin Dang' }
};

Object.entries(mappingsToAdd).forEach(([name, val]) => {
  nm[name] = { ...val };
});

fs.writeFileSync(nameMappingFile, JSON.stringify(nm, null, 2), 'utf8');
console.log('5. Đã cập nhật name_mapping.json với đầy đủ các biến thể tên của 16 VĐV.');

// 5. Cập nhật targets.json: Dọn dẹp key rác và chuẩn hóa mục tiêu tháng 6
const targets = JSON.parse(fs.readFileSync(targetsFile, 'utf8'));
delete targets['pham_T._2026_6'];
delete targets['Phuong_N._2026_6'];

targets['Huy_H._2026_6'] = { target: 150, penalty: true };
targets['Tien_P._2026_6'] = { target: 150, penalty: true };
targets['Thanh_X._2026_6'] = { target: 68, penalty: true };
targets['Katy_N._2026_6'] = { target: 60, penalty: true };
targets['Sang_N._2026_6'] = { target: 50, penalty: true };
targets['Thinh_V._2026_6'] = { target: 26, penalty: true };

fs.writeFileSync(targetsFile, JSON.stringify(targets, null, 2), 'utf8');
console.log('6. Đã chuẩn hóa mục tiêu tháng 6 trong targets.json.');

// 6. Cập nhật member_penalties_mapping.json: Gán athleteId cho Thoa Nguyễn
const pen = JSON.parse(fs.readFileSync(penFile, 'utf8'));
pen.members.forEach(m => {
  if (m.fullName === 'Thoa Nguyễn' || m.rawName === 'Thoa Nguyễn') {
    m.athleteId = '149162660';
  }
});
fs.writeFileSync(penFile, JSON.stringify(pen, null, 2), 'utf8');
console.log('7. Đã cập nhật athleteId cho Thoa Nguyễn trong member_penalties_mapping.json.');

console.log('=== HOÀN TẤT TẤT CẢ CÁC BƯỚC CẬP NHẬT ===');
