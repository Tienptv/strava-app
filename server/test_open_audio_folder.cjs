/**
 * Test Suite: Kiểm thử tích hợp nút mở thư mục chứa file nhạc Noel
 * Vị trí: Đặt trong thẻ Christmas Frost & Festive Glow Theme (December) tại Tab 10 Quản trị
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${testName}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}`);
    testsFailed++;
  }
}

console.log('=== BẮT ĐẦU KIỂM THỬ: TÍCH HỢP NÚT MỞ THƯ MỤC NHẠC NOEL ===\n');

// 1. Kiểm tra server/index.js có endpoint POST /api/audio/open-folder
runTest('server/index.js phải có endpoint POST /api/audio/open-folder', () => {
  const serverPath = path.join(__dirname, 'index.js');
  const content = fs.readFileSync(serverPath, 'utf8');

  assert(content.includes("app.post('/api/audio/open-folder'"), 'Thiếu endpoint POST /api/audio/open-folder');
  assert(content.includes('explorer.exe'), 'Phải hỗ trợ lệnh explorer.exe trên Windows');
  assert(content.includes("addAuditLog('Mở thư mục nhạc'"), 'Phải ghi audit log khi mở thư mục');
});

// 2. Kiểm tra thư mục frontend/public/audio tồn tại trên ổ đĩa
runTest('Thư mục frontend/public/audio tồn tại và chứa file nhạc', () => {
  const audioDir = path.join(__dirname, '../frontend/public/audio');
  assert(fs.existsSync(audioDir), 'Thư mục frontend/public/audio không tồn tại');
  const mp3Path = path.join(audioDir, 'carol_of_the_bells_piano.mp3');
  assert(fs.existsSync(mp3Path), 'File carol_of_the_bells_piano.mp3 không tồn tại');
});

// 3. Kiểm tra translations.js đầy đủ song ngữ VI và EN
runTest('translations.js phải có đầy đủ key openMusicFolderBtn, openMusicFolderSuccess', () => {
  const transPath = path.join(__dirname, '../frontend/src/i18n/translations.js');
  const content = fs.readFileSync(transPath, 'utf8');

  assert(content.includes("openMusicFolderBtn: 'Mở thư mục nhạc'"), 'Thiếu bản dịch VI cho openMusicFolderBtn');
  assert(content.includes("openMusicFolderBtn: 'Open Music Folder'"), 'Thiếu bản dịch EN cho openMusicFolderBtn');
  assert(content.includes('openMusicFolderSuccess'), 'Thiếu key openMusicFolderSuccess');
});

// 4. Kiểm tra Administer.jsx có nút mở thư mục trong thẻ Christmas Theme
runTest('Administer.jsx tích hợp nút mở thư mục nhạc trong thẻ Christmas Theme', () => {
  const adminPath = path.join(__dirname, '../frontend/src/pages/Administer.jsx');
  const content = fs.readFileSync(adminPath, 'utf8');

  assert(content.includes('handleOpenMusicFolder'), 'Administer.jsx phải có hàm handleOpenMusicFolder');
  assert(content.includes("apiFetch('/audio/open-folder'"), 'Phải gọi endpoint /audio/open-folder');

  // Kiểm tra nút nằm trong thẻ Christmas Theme (giữa christmasThemeTitle và tetThemeTitle)
  const christmasIdx = content.indexOf('christmasThemeTitle');
  const tetIdx = content.indexOf('tetThemeTitle', christmasIdx);
  assert(christmasIdx !== -1 && tetIdx !== -1, 'Không tìm thấy thẻ Christmas theme');

  const cardSlice = content.slice(christmasIdx, tetIdx);
  assert(cardSlice.includes('handleOpenMusicFolder'), 'Nút mở thư mục nhạc phải nằm trong thẻ Christmas theme');
  assert(cardSlice.includes('openMusicFolderBtn'), 'Nút phải sử dụng nhãn openMusicFolderBtn');
});

// 5. Kiểm tra dist/index.html và dist assets đã được build thành công
runTest('dist/index.html tồn tại và đồng bộ sau khi build Vite', () => {
  const distHtml = path.join(__dirname, '../dist/index.html');
  assert(fs.existsSync(distHtml), 'Thiếu dist/index.html');
});

console.log(`\n=== TỔNG KẾT KIỂM THỬ: ${testsPassed} PASSED, ${testsFailed} FAILED ===`);
if (testsFailed > 0) {
  process.exit(1);
}
