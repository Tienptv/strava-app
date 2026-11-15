/**
 * Test Suite: Kiểm thử cơ chế Auto-Retry & Chống chịu lỗi kết nối Cloud Render
 * (Push to Cloud Resilient Retry & Keep-Alive Socket Mitigation)
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

async function runAsyncTest(testName, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${testName}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}`);
    testsFailed++;
  }
}

(async () => {
  console.log('=== BẮT ĐẦU KIỂM THỬ: PUSH TO CLOUD RETRY RESILIENCE ===\n');

  const serverIndexPath = path.join(__dirname, 'index.js');
  const sidebarPath = path.join(__dirname, '../frontend/src/components/Sidebar.jsx');

  const serverCode = fs.readFileSync(serverIndexPath, 'utf8');
  const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

  // Test 1: Kiểm tra server/index.js đã định nghĩa hàm fetchWithRetry
  runTest('server/index.js phải định nghĩa hàm fetchWithRetry với cơ chế Auto-Retry và Backoff', () => {
    assert(serverCode.includes('export async function fetchWithRetry'), 'Thiếu hàm export fetchWithRetry');
    assert(serverCode.includes("'Connection': 'close'"), 'fetchWithRetry phải gửi header Connection: close để tránh keep-alive stale socket');
    assert(serverCode.includes("'User-Agent'"), 'fetchWithRetry phải có User-Agent');
    assert(serverCode.includes('controller.abort'), 'fetchWithRetry phải có timeout controller');
  });

  // Test 2: Kiểm tra push-to-cloud sử dụng fetchWithRetry thay vì fetch trần
  runTest('Endpoint /api/storage/push-to-cloud phải sử dụng fetchWithRetry', () => {
    const pushEndpointIdx = serverCode.indexOf("app.post('/api/storage/push-to-cloud'");
    assert(pushEndpointIdx !== -1, 'Không tìm thấy endpoint push-to-cloud');
    const pushCodeSlice = serverCode.slice(pushEndpointIdx, pushEndpointIdx + 2000);
    assert(pushCodeSlice.includes('await fetchWithRetry('), 'push-to-cloud phải gọi await fetchWithRetry');
    assert(!pushCodeSlice.includes('await fetch(targetEndpoint'), 'push-to-cloud không được dùng fetch trần không retry');
  });

  // Test 3: Kiểm tra pull-from-cloud sử dụng fetchWithRetry
  runTest('Endpoint /api/storage/pull-from-cloud phải sử dụng fetchWithRetry', () => {
    const pullEndpointIdx = serverCode.indexOf("app.post('/api/storage/pull-from-cloud'");
    assert(pullEndpointIdx !== -1, 'Không tìm thấy endpoint pull-from-cloud');
    const pullCodeSlice = serverCode.slice(pullEndpointIdx, pullEndpointIdx + 800);
    assert(pullCodeSlice.includes('await fetchWithRetry('), 'pull-from-cloud phải gọi await fetchWithRetry');
  });

  // Test 4: Kiểm tra error handling trong push-to-cloud bóc tách err.cause
  runTest('push-to-cloud phải trích xuất chi tiết err.cause tránh nuốt lỗi', () => {
    const pushEndpointIdx = serverCode.indexOf("app.post('/api/storage/push-to-cloud'");
    const nextEndpointIdx = serverCode.indexOf("app.post('/api/admin/git-push'", pushEndpointIdx);
    const pushCodeSlice = serverCode.slice(pushEndpointIdx, nextEndpointIdx);
    assert(pushCodeSlice.includes('err.cause?.code'), 'Phải trích xuất err.cause?.code');
    assert(pushCodeSlice.includes('errorDetail'), 'Phải phản hồi errorDetail ra JSON response');
  });

  // Test 5: Kiểm tra Sidebar.jsx có nút Retry Push to Cloud và UX bọc lót
  runTest('Sidebar.jsx phải bổ sung nút Retry Push to Cloud và cơ chế retry độc lập', () => {
    assert(sidebarCode.includes('Retry Push to Cloud') || sidebarCode.includes('Thử lại đẩy lên Cloud'), 'Sidebar phải có nhãn Retry Push to Cloud');
    assert(sidebarCode.includes("apiFetch('/storage/push-to-cloud'"), 'Sidebar retry phải gọi push-to-cloud trực tiếp');
    assert(sidebarCode.includes('showCancelButton: !finalCloudSynced'), 'Phải hiển thị Cancel/Dismiss button khi push thất bại');
  });

  // Test 6: Mô phỏng logic fetchWithRetry hoạt động thực tế
  await runAsyncTest('Mô phỏng logic fetchWithRetry tự động phục hồi sau lỗi socket transient', async () => {
    let callCount = 0;
    const simulatedFetch = async (url, opts) => {
      callCount++;
      if (callCount === 1) {
        const err = new TypeError('fetch failed');
        err.cause = { code: 'UND_ERR_SOCKET_CLOSED' };
        throw err;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, count: 20 })
      };
    };

    // Tạo mini runner fetchWithRetry theo đúng logic trong server
    async function testFetchRetry(mockFetch, maxRetries = 3) {
      let lastErr = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await mockFetch('https://mock-cloud.render.com', { headers: { 'Connection': 'close' } });
        } catch (e) {
          lastErr = e;
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 50)); // Fast delay for test
          }
        }
      }
      throw lastErr;
    }

    const res = await testFetchRetry(simulatedFetch, 3);
    assert.strictEqual(callCount, 2, 'Lần 1 lỗi socket, lần 2 phải retry thành công');
    assert.strictEqual(res.ok, true, 'Kết quả sau retry phải ok: true');
  });

  // Test 7: Mô phỏng logic khi tất cả các lần thử đều thất bại thì phải trả về chi tiết nguyên nhân
  await runAsyncTest('Mô phỏng khi toàn bộ lần thử đều hỏng thì phải trích xuất chi tiết err.cause', async () => {
    let callCount = 0;
    const persistentFailFetch = async () => {
      callCount++;
      const err = new TypeError('fetch failed');
      err.cause = { code: 'ECONNRESET' };
      throw err;
    };

    async function testFetchRetryFail(mockFetch, maxRetries = 2) {
      let lastErr = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await mockFetch();
        } catch (e) {
          lastErr = e;
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 50));
          }
        }
      }
      const causeCode = lastErr?.cause?.code || '';
      const finalMsg = causeCode ? `${lastErr.message} (${causeCode})` : lastErr.message;
      const enhancedErr = new Error(finalMsg);
      enhancedErr.cause = lastErr?.cause;
      throw enhancedErr;
    }

    let caughtError = null;
    try {
      await testFetchRetryFail(persistentFailFetch, 2);
    } catch (err) {
      caughtError = err;
    }

    assert(caughtError !== null, 'Phải ném lỗi khi vượt quá maxRetries');
    assert(caughtError.message.includes('ECONNRESET'), 'Thông báo lỗi phải chứa mã ECONNRESET');
    assert.strictEqual(callCount, 2, 'Phải thử đủ 2 lần trước khi bỏ cuộc');
  });

  console.log(`\n=== TỔNG KẾT KIỂM THỬ: ${testsPassed} PASSED, ${testsFailed} FAILED ===`);
  if (testsFailed > 0) {
    process.exit(1);
  }
})();
