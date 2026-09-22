const fs = require('fs');
const path = require('path');

console.log('=== BẮT ĐẦU MERGE DUONG VU VÀO ABBA VŨ (CHỐNG DOUBLE DỮ LIỆU) ===');

const storageDir = path.join(__dirname, '../Storage');
const histFile = path.join(storageDir, 'historical_activities.json');
const penFile = path.join(storageDir, 'member_penalties_mapping.json');
const cfgFile = path.join(storageDir, 'challenge_config.json');
const nmFile = path.join(storageDir, 'name_mapping.json');
const targetsFile = path.join(storageDir, 'targets.json');

// 0. Backup an toàn
const backupDir = path.join(storageDir, 'backup_merge_abba_' + Date.now());
fs.mkdirSync(backupDir, { recursive: true });
['historical_activities.json', 'member_penalties_mapping.json', 'challenge_config.json', 'name_mapping.json', 'targets.json'].forEach(f => {
  const p = path.join(storageDir, f);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(backupDir, f));
});
console.log('1. Đã tạo thư mục backup an toàn tại:', backupDir);

// 1. Cập nhật member_penalties_mapping.json
const pen = JSON.parse(fs.readFileSync(penFile, 'utf8'));

let mergedStt5 = false;
pen.members.forEach(m => {
  // Bản ghi STT 5 là "Duong Vu"
  if (m.stt === 5 || m.rawName === 'Duong Vu') {
    console.log('  -> Đang cập nhật bản ghi STT 5 (Duong Vu) sang Abba Vũ (ID: 73380484)');
    m.athleteId = '73380484';
    m.fullName = 'Abba Vũ';
    m.rawName = 'Abba Vũ';
    m.note = 'Tài khoản Abba Vũ (Duong Vu)';
    mergedStt5 = true;
  }
  // Bản ghi STT 24 là "Vu Duong" (101067787) -> GIỮ NGUYÊN
  if (m.stt === 24 || m.rawName === 'Vu Duong') {
    console.log('  -> Bản ghi STT 24 (Vu Duong, ID: 101067787): GIỮ NGUYÊN không merge.');
  }
});

fs.writeFileSync(penFile, JSON.stringify(pen, null, 2), 'utf8');
console.log('2. Đã cập nhật member_penalties_mapping.json thành công.');

// 2. Xử lý activities trong historical_activities.json (Chống double dữ liệu)
const hist = JSON.parse(fs.readFileSync(histFile, 'utf8'));

let removedFebDuplicates = 0;
let reassignedJanActivities = 0;

const newHist = [];

hist.forEach(a => {
  const aid = String(a.athlete?.id || '');
  const dateStr = (a.start_date_local || '').substring(0, 10);

  // Nếu là bài chạy của 101067787 trong tháng 2/2026 -> Bỏ qua (vì 73380484 đã có đủ 8 bài chạy này)
  if (aid === '101067787' && dateStr.startsWith('2026-02')) {
    removedFebDuplicates++;
    return; // Không đưa vào newHist để chống double
  }

  // Nếu là bài chạy của 101067787 trong tháng 1/2026 -> Chuyển sang 73380484 (Abba Vũ)
  if (aid === '101067787' && dateStr.startsWith('2026-01')) {
    reassignedJanActivities++;
    newHist.push({
      ...a,
      athlete: {
        ...a.athlete,
        id: 73380484,
        id_str: '73380484',
        firstname: 'Abba',
        lastname: 'Vũ'
      }
    });
    return;
  }

  // Tất cả các bài khác giữ nguyên
  newHist.push(a);
});

fs.writeFileSync(histFile, JSON.stringify(newHist, null, 2), 'utf8');
console.log(`3. Đã xử lý historical_activities.json: Khử ${removedFebDuplicates} bài chạy trùng tháng 2/2026, gán ${reassignedJanActivities} bài chạy tháng 1/2026 sang Abba Vũ.`);

// 3. Cập nhật challenge_config.json: Loại bỏ vu_D. trùng lặp trong các tháng
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));

// Đảm bảo Abba_V. trong participants chuẩn
cfg.participants['Abba_V.'] = {
  matchKey: 'Abba_V.',
  id: '73380484',
  athleteId: '73380484',
  firstname: 'Abba',
  lastname: 'Vũ',
  name: 'Abba Vũ',
  profile_medium: 'https://dgalywyr863hv.cloudfront.net/pictures/athletes/73380484/46056528/1/medium.jpg',
  profile: 'https://dgalywyr863hv.cloudfront.net/pictures/athletes/73380484/46056528/1/large.jpg',
  membership: 'member',
  admin: false,
  owner: false,
  resource_state: 2,
  _fromConfig: true
};

let cleanedMonths = [];
Object.keys(cfg.monthlyParticipants || {}).forEach(m => {
  const monthParts = cfg.monthlyParticipants[m];
  if (monthParts['Abba_V.'] && monthParts['vu_D.']) {
    delete monthParts['vu_D.'];
    cleanedMonths.push(m);
  }
  // Đảm bảo Abba_V. có ID đầy đủ
  if (monthParts['Abba_V.']) {
    monthParts['Abba_V.'].id = '73380484';
    monthParts['Abba_V.'].athleteId = '73380484';
    monthParts['Abba_V.'].name = 'Abba Vũ';
  }
});

fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2), 'utf8');
console.log(`4. Đã dọn dẹp vu_D. trùng lặp trong monthlyParticipants ở các tháng: ${cleanedMonths.join(', ')}.`);

// 4. Cập nhật name_mapping.json
const nm = JSON.parse(fs.readFileSync(nmFile, 'utf8'));
nm['Duong Vu'] = { key: 'Abba_V.', athleteId: '73380484', fullName: 'Abba Vũ' };
nm['Abba Vũ'] = { key: 'Abba_V.', athleteId: '73380484', fullName: 'Abba Vũ' };
nm['Abba V.'] = { key: 'Abba_V.', athleteId: '73380484', fullName: 'Abba Vũ' };
nm['Abba_V.'] = { key: 'Abba_V.', athleteId: '73380484', fullName: 'Abba Vũ' };
nm['vu D.'] = { key: 'vu_D.', fullName: 'vu duong', athleteId: '101067787' };
nm['vu_D.'] = { abbreviatedName: 'vu D.', fullName: 'vu duong', athleteId: '101067787' };

fs.writeFileSync(nmFile, JSON.stringify(nm, null, 2), 'utf8');
console.log('5. Đã cập nhật name_mapping.json.');

// 5. Cập nhật targets.json: Đảm bảo mục tiêu tháng 2/2026 của Abba Vũ
const targets = JSON.parse(fs.readFileSync(targetsFile, 'utf8'));
targets['Abba_V._2026_2'] = { target: 75, penalty: true };
delete targets['vu_D._2026_2'];

fs.writeFileSync(targetsFile, JSON.stringify(targets, null, 2), 'utf8');
console.log('6. Đã cập nhật targets.json: Abba_V._2026_2 = 75km (penalty: true).');

console.log('=== HOÀN TẤT THỰC THI SCRIPT MERGE ===');
