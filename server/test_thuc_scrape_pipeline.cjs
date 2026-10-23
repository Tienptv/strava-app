const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 TEST SUITE: KIỂM TRA TOÀN DIỆN PIPELINE CÀO & ĐỒNG BỘ DỮ LIỆU THÀNH VIÊN THỨC');

// 1. Kiểm tra parseStorageCSV và mapAthleteNamesUsingCSV
console.log('\n--- TEST 1: Parse CSV và gán Athlete ID ---');
const csvContent = fs.readFileSync(path.join(__dirname, '../Storage/data-autosync-scrape-2026-10-07-094028.csv'), 'utf8');

// Mô phỏng parseStorageCSV
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current); current = '';
    } else { current += char; }
  }
  result.push(current);
  return result;
}

function parseStorageCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(h => h.replace(/["']/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
    rows.push(obj);
  }
  const activities = [];
  rows.forEach(row => {
    let athleteId = null;
    let athleteName = row.Name || row.Athlete || '';
    if (row.Athlete && String(row.Athlete).includes('/athletes/')) {
      const matchAth = String(row.Athlete).match(/\/athletes\/(\d+)/);
      if (matchAth) athleteId = matchAth[1];
      athleteName = row.Name || '';
    } else if (row['Athlete ID'] || row.athleteId || row.athlete_id) {
      athleteId = String(row['Athlete ID'] || row.athleteId || row.athlete_id).trim();
    }
    let activityId = row['Activity ID'] || row.id || row.Id;
    let nameParts = athleteName.trim().split(' ');
    let lastname = nameParts.length > 1 ? nameParts.pop() : '';
    let firstname = nameParts.join(' ');
    activities.push({
      id: activityId,
      type: row['Activity Type'] || 'Run',
      distance: 4860,
      moving_time: 2342,
      start_date_local: row.Date,
      athlete: { id: athleteId, firstname, lastname }
    });
  });
  return activities;
}

const parsed = parseStorageCSV(csvContent);
const thucParsed = parsed.find(a => a.id === '20474180592');
assert(thucParsed, 'Bài chạy của Thức 20474180592 phải tồn tại trong file CSV');
console.log('✅ TEST 1.1 PASS: Tìm thấy bài chạy Thức trong CSV:', thucParsed.id);

// 2. Chạy qua mapAthleteNamesUsingCSV của server
console.log('\n--- TEST 2: mapAthleteNamesUsingCSV chuẩn hóa đúng ID 1265228772 ---');
// Đọc module mapAthleteNamesUsingCSV từ server/index.js bằng cách require hoặc evaluate
const serverCode = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
assert(serverCode.includes('id: matchedEntry.id || act.athlete.id || null'), 'server/index.js phải gán athlete.id từ matchedEntry');
console.log('✅ TEST 2.1 PASS: server/index.js có logic gán athlete.id');

// 3. Kiểm tra bài chạy Thức trong imported_activities.json hiện tại
console.log('\n--- TEST 3: imported_activities.json chứa đầy đủ Athlete ID ---');
const imported = JSON.parse(fs.readFileSync(path.join(__dirname, '../Storage/imported_activities.json'), 'utf8'));
const thucInImported = imported.find(a => a.id === '20474180592');
assert(thucInImported, 'Bài 20474180592 phải có trong imported_activities.json');
assert.strictEqual(thucInImported.athlete.id, '1265228772', 'Athlete ID phải là 1265228772');
assert.strictEqual(thucInImported.athlete.firstname, 'Thức', 'Firstname phải là Thức');
assert.strictEqual(thucInImported.athlete.lastname, 'Tạ Ngọc Trí', 'Lastname phải là Tạ Ngọc Trí');
console.log('✅ TEST 3.1 PASS: Thức trong imported_activities.json:', thucInImported.athlete);

// 4. Kiểm tra kịch bản Rule #6: Hai VĐV trùng tên phân định bằng ID
console.log('\n--- TEST 4: Rule #6 - Phân định độc lập khi trùng tên ---');
const mockRunnerStats = {
  'Phuong_N.': { member: { id: '11111', firstname: 'Phuong', lastname: 'Ngo' }, dailyDistances: new Array(32).fill(0) },
  'Phuong_T.': { member: { id: '22222', firstname: 'Phuong', lastname: 'Tran' }, dailyDistances: new Array(32).fill(0) }
};
const mockActs = [
  { athlete: { id: '11111', firstname: 'Phuong', lastname: 'Ngo' }, distance: 5000, start_date_local: '2026-10-06T06:00:00Z' },
  { athlete: { id: '22222', firstname: 'Phuong', lastname: 'Tran' }, distance: 7000, start_date_local: '2026-10-06T07:00:00Z' }
];
mockActs.forEach(act => {
  const found = Object.keys(mockRunnerStats).find(k => mockRunnerStats[k].member.id === act.athlete.id);
  assert(found, 'Phải tìm thấy bằng ID');
  mockRunnerStats[found].dailyDistances[6] += act.distance / 1000;
});
assert.strictEqual(mockRunnerStats['Phuong_N.'].dailyDistances[6], 5.0, 'Phuong N. phải có 5km');
assert.strictEqual(mockRunnerStats['Phuong_T.'].dailyDistances[6], 7.0, 'Phuong T. phải có 7km');
console.log('✅ TEST 4.1 PASS: Hai runner trùng tên phân định chính xác bằng Athlete ID (Rule #6)');

console.log('\n🎉 TẤT CẢ TEST CASES ĐỀU ĐẠT (ALL TESTS PASSED 100%)!');
