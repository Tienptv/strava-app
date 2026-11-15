/**
 * Test Suite: Kiểm thử tích hợp nút nhạc nền "Carol of the Bells (Christmas Piano Cover)"
 * Vị trí: Đặt bên cạnh chữ Version ở góc dưới bên phải màn hình theo đúng yêu cầu người dùng
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

console.log('=== BẮT ĐẦU KIỂM THỬ: TÍCH HỢP NÚT NHẠC NỀN CAROL OF THE BELLS ===\n');

// 1. Kiểm tra file âm thanh trong frontend/public/audio và dist/audio
runTest('File âm thanh carol_of_the_bells_piano.mp3 tồn tại và có dung lượng hợp lệ', () => {
  const publicAudioPath = path.join(__dirname, '../frontend/public/audio/carol_of_the_bells_piano.mp3');
  const distAudioPath = path.join(__dirname, '../dist/audio/carol_of_the_bells_piano.mp3');

  assert(fs.existsSync(publicAudioPath), 'Thiếu file audio trong frontend/public/audio');
  assert(fs.existsSync(distAudioPath), 'Thiếu file audio trong dist/audio');

  const stats = fs.statSync(publicAudioPath);
  assert(stats.size > 500000, `Kích thước file audio quá nhỏ (${stats.size} bytes)`);
});

// 2. Kiểm tra MusicContext.jsx quản lý audio global và autoplay policy
runTest('MusicContext.jsx quản lý Audio global, hỗ trợ Autoplay Guard và nhớ localStorage', () => {
  const contextPath = path.join(__dirname, '../frontend/src/context/MusicContext.jsx');
  assert(fs.existsSync(contextPath), 'Thiếu file MusicContext.jsx');

  const content = fs.readFileSync(contextPath, 'utf8');
  assert(content.includes('export function MusicProvider'), 'MusicContext phải export MusicProvider');
  assert(content.includes('carol_of_the_bells_piano.mp3'), 'MusicContext phải trỏ đến file carol_of_the_bells_piano.mp3');
  assert(content.includes('addEventListener'), 'MusicContext phải có listener bắt lỗi và tương tác người dùng');
  assert(content.includes('localStorage.setItem'), 'MusicContext phải lưu trạng thái volume/muted vào localStorage');
});

// 3. Kiểm tra MusicButton.jsx có đầy đủ giao diện, equalizer và popover âm lượng
runTest('MusicButton.jsx có cấu trúc chuẩn Haskoning, sóng âm Equalizer và thanh trượt Volume', () => {
  const buttonPath = path.join(__dirname, '../frontend/src/components/MusicButton.jsx');
  assert(fs.existsSync(buttonPath), 'Thiếu file MusicButton.jsx');

  const content = fs.readFileSync(buttonPath, 'utf8');
  assert(content.includes('music-pill-btn'), 'Phải có class music-pill-btn');
  assert(content.includes('music-equalizer'), 'Phải có class sóng âm music-equalizer');
  assert(content.includes('music-volume-popover'), 'Phải có popover chỉnh âm lượng');
  assert(content.includes('Carol of the Bells'), 'Phải hiển thị tên bài Carol of the Bells');
});

// 4. Kiểm tra Dashboard.jsx nhúng MusicButton nằm ngay cạnh chữ Version
runTest('Dashboard.jsx đặt MusicButton ngay bên cạnh chữ Version đúng vị trí khoanh đỏ', () => {
  const dashboardPath = path.join(__dirname, '../frontend/src/pages/Dashboard.jsx');
  const content = fs.readFileSync(dashboardPath, 'utf8');

  assert(content.includes("import MusicButton from '../components/MusicButton'"), 'Dashboard phải import MusicButton');
  
  const versionIdx = content.indexOf('app-version-tag');
  assert(versionIdx !== -1, 'Không tìm thấy app-version-tag trong Dashboard');

  // Lấy đoạn code bao quanh app-version-tag
  const slice = content.slice(versionIdx - 200, versionIdx + 150);
  assert(slice.includes('<MusicButton'), 'MusicButton phải nằm ngay trong khối cha cùng app-version-tag');
});

// 5. Kiểm tra Administer.jsx cũng được trang bị MusicButton cạnh Version
runTest('Administer.jsx cũng đồng bộ MusicButton bên cạnh Version tag', () => {
  const adminPath = path.join(__dirname, '../frontend/src/pages/Administer.jsx');
  const content = fs.readFileSync(adminPath, 'utf8');

  assert(content.includes("import MusicButton from '../components/MusicButton'"), 'Administer phải import MusicButton');
  const versionIdx = content.indexOf('app-version-tag');
  const slice = content.slice(versionIdx - 200, versionIdx + 150);
  assert(slice.includes('<MusicButton'), 'MusicButton phải nằm cạnh app-version-tag trong Administer');
});

// 6. Kiểm tra App.jsx bọc MusicProvider cấp cao nhất
runTest('App.jsx bọc MusicProvider bao bọc toàn bộ Router', () => {
  const appPath = path.join(__dirname, '../frontend/src/App.jsx');
  const content = fs.readFileSync(appPath, 'utf8');

  assert(content.includes("import { MusicProvider } from './context/MusicContext'"), 'App.jsx phải import MusicProvider');
  assert(content.includes('<MusicProvider>'), 'App.jsx phải render <MusicProvider>');
  assert(content.includes('</MusicProvider>'), 'App.jsx phải render </MusicProvider>');
});

console.log(`\n=== TỔNG KẾT KIỂM THỬ: ${testsPassed} PASSED, ${testsFailed} FAILED ===`);
if (testsFailed > 0) {
  process.exit(1);
}
