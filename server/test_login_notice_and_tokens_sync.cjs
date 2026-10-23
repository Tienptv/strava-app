/**
 * Test Suite: Hộp thoại thông báo đăng nhập Strava App & Đồng bộ bảo toàn OAuth Tokens
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 BẮT ĐẦU TEST SUITE: THÔNG BÁO LOGIN STRAVA & BẢO TOÀN OAUTH TOKENS');
console.log('====================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${desc}: ${err.message}`);
  }
}

// 1. Kiểm tra translations song ngữ EN/VI
runTest('Bilingual Translations VI & EN đầy đủ các key thông báo Strava', () => {
  const transContent = fs.readFileSync(path.join(__dirname, '../frontend/src/i18n/translations.js'), 'utf8');
  
  const requiredKeys = [
    'preLoginTitle',
    'preLoginDesc',
    'preLoginGuestHint',
    'preLoginContinueBtn',
    'preLoginCancelBtn'
  ];

  requiredKeys.forEach(k => {
    assert(transContent.includes(`${k}:`), `Thiếu key translation: ${k}`);
  });
});

// 2. Kiểm tra App.jsx có hộp thoại thông báo chính giữa màn hình (position: 'center')
runTest('App.jsx tích hợp SweetAlert2 centered modal trước khi gọi Strava OAuth', () => {
  const appContent = fs.readFileSync(path.join(__dirname, '../frontend/src/App.jsx'), 'utf8');
  assert(appContent.includes("t('preLoginTitle')"), 'App.jsx phải sử dụng t(preLoginTitle)');
  assert(appContent.includes("t('preLoginDesc')"), 'App.jsx phải sử dụng t(preLoginDesc)');
  assert(appContent.includes("position: 'center'"), 'App.jsx phải cấu hình vị trí chính giữa màn hình (position: center)');
  assert(appContent.includes("if (!confirmResult.isConfirmed)"), 'App.jsx phải dừng nếu user không bấm xác nhận');
});

// 3. Kiểm tra server/index.js tích hợp tokens-raw và bảo toàn tokens
runTest('server/index.js có endpoint GET /api/storage/tokens-raw', () => {
  const serverContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  assert(serverContent.includes("app.get('/api/storage/tokens-raw'"), 'Thiếu endpoint /api/storage/tokens-raw');
});

// 4. Kiểm tra server/index.js sync-bundle hỗ trợ tokens
runTest('server/index.js sync-bundle hỗ trợ nhận và merge tokens_v2.json', () => {
  const serverContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  assert(serverContent.includes("const { tokens } = req.body;"), 'sync-bundle phải trích xuất tokens từ req.body');
  assert(serverContent.includes("writeStorageJson(TOKENS_FILE, mergedTokens);"), 'sync-bundle phải ghi lại mergedTokens vào TOKENS_FILE');
});

// 5. Kiểm tra push-to-cloud và pull-from-cloud bao gồm tokens
runTest('push-to-cloud và pull-from-cloud đồng bộ tokens 2 chiều', () => {
  const serverContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  assert(serverContent.includes("bundle.tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));"), 'push-to-cloud phải đính kèm bundle.tokens');
  assert(serverContent.includes("await fetchJson('/api/storage/tokens-raw');"), 'pull-from-cloud phải kéo tokens từ cloud');
});

// 6. Kiểm tra frontend dist bundle index.html tồn tại
runTest('Frontend build dist/index.html tồn tại sau khi biên dịch', () => {
  const distHtml = path.join(__dirname, '../frontend/dist/index.html');
  assert(fs.existsSync(distHtml), 'dist/index.html phải tồn tại');
});

console.log('\n====================================================');
console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS PASS (${Math.round((passedTests/totalTests)*100)}% SUCCESS)`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
