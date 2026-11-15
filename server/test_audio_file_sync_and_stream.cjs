/**
 * Test Suite: Kiểm thử tính đồng bộ và cơ chế phục vụ bài hát thực tế của người dùng
 * Đảm bảo file MP3 3.3MB được phát đúng 100%, không bị phục vụ file cũ từ dist
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

console.log('=== BẮT ĐẦU KIỂM THỬ: ĐỒNG BỘ & PHÁT ĐÚNG FILE NHẠC TRONG THƯ MỤC ===\n');

// 1. Kiểm tra file MP3 trong frontend/public/audio là file thật của người dùng
runTest('frontend/public/audio chứa file MP3 thật của người dùng (3.309.025 bytes, ID3 header)', () => {
  const publicMp3 = path.join(__dirname, '../frontend/public/audio/carol_of_the_bells_piano.mp3');
  assert(fs.existsSync(publicMp3), 'Thiếu file trong frontend/public/audio');

  const stats = fs.statSync(publicMp3);
  assert.strictEqual(stats.size, 3309025, `Kích thước file không khớp (${stats.size} !== 3309025)`);

  const buf = fs.readFileSync(publicMp3);
  const header = buf.slice(0, 3).toString('ascii');
  assert.strictEqual(header, 'ID3', `Header file không phải ID3 MP3 (${header})`);
});

// 2. Kiểm tra file MP3 trong dist/audio đã được đồng bộ chuẩn xác với file của người dùng
runTest('dist/audio/carol_of_the_bells_piano.mp3 đã đồng bộ đúng 3.309.025 bytes', () => {
  const distMp3 = path.join(__dirname, '../dist/audio/carol_of_the_bells_piano.mp3');
  assert(fs.existsSync(distMp3), 'Thiếu file trong dist/audio');

  const stats = fs.statSync(distMp3);
  assert.strictEqual(stats.size, 3309025, `Kích thước dist không khớp (${stats.size} !== 3309025)`);

  const buf = fs.readFileSync(distMp3);
  const header = buf.slice(0, 3).toString('ascii');
  assert.strictEqual(header, 'ID3', `Header dist không phải ID3 MP3 (${header})`);
});

// 3. Kiểm tra server/index.js cấu hình phục vụ trực tiếp /audio từ frontend/public/audio
runTest('server/index.js cấu hình express.static("/audio") từ frontend/public/audio với no-cache', () => {
  const serverPath = path.join(__dirname, 'index.js');
  const content = fs.readFileSync(serverPath, 'utf8');

  assert(content.includes("app.use('/audio'"), 'Thiếu middleware app.use("/audio")');
  assert(content.includes('globalAudioPublicDir'), 'Thiếu biến globalAudioPublicDir');
  assert(content.includes('Cache-Control') && content.includes('no-store'), 'Phải có header no-store, no-cache');
});

// 4. Kiểm tra server/index.js có endpoint GET /api/audio/info trả về metadata động
runTest('server/index.js có endpoint GET /api/audio/info trả về link nhạc kèm cache-busting', () => {
  const serverPath = path.join(__dirname, 'index.js');
  const content = fs.readFileSync(serverPath, 'utf8');

  assert(content.includes("app.get('/api/audio/info'"), 'Thiếu endpoint GET /api/audio/info');
  assert(content.includes('stats.mtimeMs') || content.includes('stats.mtime'), 'Endpoint phải trả về mtime để cache-busting');
});

// 5. Kiểm tra MusicContext.jsx truy vấn /api/audio/info để lấy link nhạc động
runTest('MusicContext.jsx truy vấn /api/audio/info để phát đúng file trong thư mục', () => {
  const contextPath = path.join(__dirname, '../frontend/src/context/MusicContext.jsx');
  const content = fs.readFileSync(contextPath, 'utf8');

  assert(content.includes('/api/audio/info'), 'MusicContext phải gọi API /api/audio/info');
  assert(content.includes('audio.src = audioUrl'), 'Phải gán audio.src từ URL động');
});

console.log(`\n=== TỔNG KẾT KIỂM THỬ: ${testsPassed} PASSED, ${testsFailed} FAILED ===`);
if (testsFailed > 0) {
  process.exit(1);
}
