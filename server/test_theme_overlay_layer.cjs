// Test suite: Xác thực Lớp Kính Phủ Trong Suốt 100% theo đúng phạm vi khung đỏ (ThemeOverlayLayer)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- TEST BẮT ĐẦU: KIỂM TRA LỚP KÍNH PHỦ TRONG SUỐT 100% (THEME OVERLAY LAYER) ---');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         Lỗi: ${err.message}`);
  }
}

// 1. Kiểm tra file ThemeOverlayLayer.jsx tồn tại và xuất khẩu chuẩn
it('ThemeOverlayLayer.jsx: Tồn tại trong frontend/src/themes/ và xuất khẩu chuẩn', () => {
  const filePath = path.join(__dirname, '../frontend/src/themes/ThemeOverlayLayer.jsx');
  assert.ok(fs.existsSync(filePath), 'ThemeOverlayLayer.jsx phải tồn tại');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('export default function ThemeOverlayLayer'), 'Phải export default ThemeOverlayLayer');
  assert.ok(content.includes('className={`theme-overlay-layer'), 'Phải có class theme-overlay-layer');
});

// 2. Kiểm tra theme index.js xuất khẩu ThemeOverlayLayer
it('frontend/src/themes/index.js: Đã xuất khẩu ThemeOverlayLayer', () => {
  const indexPath = path.join(__dirname, '../frontend/src/themes/index.js');
  const content = fs.readFileSync(indexPath, 'utf8');
  assert.ok(content.includes('export { default as ThemeOverlayLayer }'), 'themes/index.js phải export ThemeOverlayLayer');
});

// 3. Kiểm tra ChallengeTable.jsx tích hợp ThemeOverlayLayer bao trọn toàn bộ .challenge-container
it('ChallengeTable.jsx: Tích hợp ThemeOverlayLayer là con đầu tiên của .challenge-container', () => {
  const tablePath = path.join(__dirname, '../frontend/src/components/ChallengeTable.jsx');
  const content = fs.readFileSync(tablePath, 'utf8');
  assert.ok(content.includes("import ThemeOverlayLayer from '../themes/ThemeOverlayLayer';"), 'Phải import ThemeOverlayLayer');
  assert.ok(content.includes('<ThemeOverlayLayer theme={seasonalTheme} />'), 'Phải render ThemeOverlayLayer với prop seasonalTheme');
  
  // Xác thực vị trí: nằm ngay sau thẻ mở challenge-container
  const containerIdx = content.indexOf('challenge-container');
  const overlayIdx = content.indexOf('<ThemeOverlayLayer');
  assert.ok(containerIdx !== -1 && overlayIdx !== -1, 'Phải tìm thấy container và overlay');
  assert.ok(overlayIdx > containerIdx, 'ThemeOverlayLayer phải nằm bên trong .challenge-container');
  assert.ok(overlayIdx - containerIdx < 300, 'ThemeOverlayLayer phải là phần tử con đầu tiên của .challenge-container');
});

// 4. Kiểm tra CSS index.css thiết lập lớp kính trong suốt 100%
it('CSS index.css: .challenge-container có position: relative và .theme-overlay-layer phủ kín khung đỏ', () => {
  const cssPath = path.join(__dirname, '../frontend/src/index.css');
  const content = fs.readFileSync(cssPath, 'utf8');

  // .challenge-container có position: relative
  assert.ok(content.includes('.challenge-container {\n  width: 100%;\n  max-width: 100%;\n  position: relative;'), '.challenge-container phải có position: relative');

  // .theme-overlay-layer có đủ các thuộc tính chuẩn
  assert.ok(content.includes('.theme-overlay-layer {'), 'Phải có định nghĩa .theme-overlay-layer');
  assert.ok(content.includes('pointer-events: none;'), 'Bắt buộc phải có pointer-events: none để bấm xuyên qua');
  assert.ok(content.includes('background: transparent;'), 'Bắt buộc background: transparent (trong suốt 100%)');
  assert.ok(content.includes('position: absolute;'), 'Bắt buộc position: absolute');
  assert.ok(content.includes('top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;'), 'Phải phủ kín 4 cạnh top/left/right/bottom');
});

// 5. Tuân thủ nghiêm ngặt yêu cầu: Chưa trang trí bất kỳ hình ảnh hay hiệu ứng nào
it('Yêu cầu người dùng: Chưa trang trí bất kỳ hình ảnh hay hiệu ứng nào trên ThemeOverlayLayer', () => {
  const filePath = path.join(__dirname, '../frontend/src/themes/ThemeOverlayLayer.jsx');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.strictEqual(content.includes('<img'), false, 'ThemeOverlayLayer không được chứa thẻ <img>');
  assert.strictEqual(content.includes('animation'), false, 'ThemeOverlayLayer không được chứa animation trang trí');
});

console.log(`\n========================================`);
console.log(`KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} PASS (${totalTests - passedTests} FAIL)`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
