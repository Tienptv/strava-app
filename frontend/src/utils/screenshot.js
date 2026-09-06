import Swal from 'sweetalert2';

/**
 * Trợ giúp sao chép Blob ảnh vào Clipboard và tải về máy
 */
async function saveAndCopyToClipboard(blob, fileName, titleText, isEn) {
  let copiedToClipboard = false;
  if (navigator.clipboard && window.ClipboardItem && blob) {
    try {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      copiedToClipboard = true;
    } catch (clipErr) {
      console.warn('Clipboard write error:', clipErr);
    }
  }

  // Tải file ảnh PNG về máy
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = blobUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

  // Hiển thị thông báo thành công
  Swal.fire({
    icon: 'success',
    title: isEn ? 'Screenshot Captured Successfully!' : 'Chụp Màn Hình Thành Công!',
    html: `
      <div style="text-align: left; font-size: 0.9rem; line-height: 1.6; color: #1e293b;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; color: #15803d; font-weight: 700;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>${isEn ? 'Downloaded high-resolution PNG file:' : 'Đã tải xuống file ảnh PNG chất lượng cao:'}</span>
        </div>
        <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 0.85rem; margin-bottom: 12px; border: 1px solid #e2e8f0;">
          📁 <b>${fileName}</b>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; color: ${copiedToClipboard ? '#00A3A6' : '#ea580c'}; font-weight: 700;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>${copiedToClipboard ? (isEn ? 'COPIED TO CLIPBOARD:' : 'ĐÃ SAO CHÉP VÀO CLIPBOARD (BỘ NHỚ TẠM):') : (isEn ? 'Clipboard Notice:' : 'Thông báo Clipboard:')}</span>
        </div>
        <p style="margin: 4px 0 0; color: #475569; font-size: 0.85rem;">
          ${copiedToClipboard 
            ? (isEn ? 'You can press <b>Ctrl + V</b> to paste the image directly into Zalo, Slack, Messenger, Teams or documents!' : 'Bạn có thể bấm <b>Ctrl + V</b> để dán ảnh ngay vào Zalo, Messenger, Teams, Slack hoặc tài liệu Word/Excel!') 
            : (isEn ? 'Clipboard access was restricted. You can use the downloaded file in your Downloads folder.' : 'Trình duyệt chưa cho phép ghi vào Clipboard. Bạn có thể sử dụng file ảnh vừa được lưu trong thư mục Downloads.')}
        </p>
      </div>
    `,
    confirmButtonColor: '#002D54',
    confirmButtonText: isEn ? 'Great!' : 'Tuyệt vời!'
  });
}

/**
 * 1. Chụp nhanh màn hình hiện tại (Chuẩn Pixel Windows)
 * Dùng Screen Capture API chính thức của trình duyệt Chrome/Edge
 * Lấy trực tiếp pixel từ card đồ họa GPU, chuẩn xác 100% như Win + Shift + S
 */
export async function captureNativeScreen(options = {}) {
  const isEn = typeof window !== 'undefined' && localStorage.getItem('lang') === 'en';
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = options.fileName || `Strava_Screen_${timestamp}_${Date.now().toString().slice(-4)}.png`;

  const isChartsCollapsed = typeof window !== 'undefined' && localStorage.getItem('strava_challenge_charts_collapsed') === 'true';
  if (isChartsCollapsed) {
    document.body.classList.add('is-screenshot-capturing');
  }

  try {
    // Kích hoạt hộp thoại Screen Capture chuẩn của trình duyệt
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser',
        width: { ideal: 3840 },
        height: { ideal: 2160 }
      },
      audio: false,
      preferCurrentTab: true
    });

    // Thông báo đang xử lý
    Swal.fire({
      title: isEn ? 'Capturing screen...' : 'Đang xử lý ảnh chụp...',
      html: isEn ? 'Extracting pixel-perfect frame and copying to Clipboard...' : 'Đang trích xuất khung hình chuẩn pixel và lưu Clipboard...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    // Chờ 250ms để video render đủ khung hình sắc nét
    await new Promise((resolve) => setTimeout(resolve, 250));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Dừng stream ngay sau khi chụp xong khung hình
    stream.getTracks().forEach(track => track.stop());

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
    if (!blob) throw new Error(isEn ? 'Could not create image blob' : 'Không thể tạo dữ liệu ảnh');

    await saveAndCopyToClipboard(blob, fileName, 'Native Screen', isEn);
    return { success: true };
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
      // Người dùng bấm Hủy bỏ trên hộp thoại chọn tab
      return { cancelled: true };
    }
    console.error('Lỗi captureNativeScreen:', err);
    Swal.fire({
      icon: 'error',
      title: isEn ? 'Capture Error' : 'Lỗi khi chụp màn hình',
      text: err.message || (isEn ? 'Screen Capture API is not supported or was cancelled.' : 'Không thể chụp màn hình. Vui lòng kiểm tra quyền truy cập.'),
      confirmButtonColor: '#002D54'
    });
    return { success: false, error: err.message };
  } finally {
    document.body.classList.remove('is-screenshot-capturing');
  }
}

/**
 * 2. Xuất ảnh toàn bộ bảng (Chrome Thật 4K Full-Page)
 * Kích hoạt nhân Chrome thật qua backend để mở rộng toàn bộ bảng từ Ngày 1 đến Ngày cuối,
 * chụp trọn vẹn tất cả các dòng vận động viên với chất lượng Ultra HD.
 */
export async function captureFullTableChrome(options = {}) {
  const isEn = typeof window !== 'undefined' && localStorage.getItem('lang') === 'en';
  const currentLang = options.lang || (isEn ? 'en' : 'vi');
  const month = options.month || new Date().getMonth() + 1;
  const year = options.year || new Date().getFullYear();
  const fileName = options.fileName || (isEn ? `Strava_Challenge_M${month}_${year}_Full.png` : `Strava_Challenge_T${month}_${year}_Full.png`);
  const isChartsCollapsed = options.chartsCollapsed !== undefined 
    ? options.chartsCollapsed 
    : (typeof window !== 'undefined' && localStorage.getItem('strava_challenge_charts_collapsed') === 'true');

  Swal.fire({
    title: isEn ? 'Exporting Full Table...' : 'Đang xuất toàn bộ bảng...',
    html: isEn 
      ? 'Launching real Chrome engine to capture all days & runners in Ultra HD 4K... (takes ~2s)' 
      : 'Đang dùng nhân Chrome thật mở rộng toàn bộ bảng (31 ngày & 25 vận động viên) ở độ nét 4K... (mất ~2s)',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const res = await fetch('/api/screenshot/full-table', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        month, 
        year, 
        athleteId, 
        lang: currentLang,
        chartsCollapsed: isChartsCollapsed 
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with status ${res.status}`);
    }

    const blob = await res.blob();
    await saveAndCopyToClipboard(blob, fileName, 'Full Table Chrome', isEn);
    return { success: true };
  } catch (err) {
    console.error('Lỗi captureFullTableChrome:', err);
    Swal.fire({
      icon: 'warning',
      title: isEn ? 'Full Table Export Failed' : 'Chưa thể xuất toàn bộ bảng qua Chrome',
      html: `
        <p style="color: #475569; font-size: 0.9rem;">
          ${err.message}<br><br>
          ${isEn 
            ? 'You can use <b>Quick Capture (Windows Pixel)</b> to capture the current screen immediately!' 
            : 'Bạn có thể chọn <b>Chụp nhanh màn hình hiện tại (Chuẩn Win)</b> để chụp tức thì!'}
        </p>
      `,
      showCancelButton: true,
      confirmButtonColor: '#00A3A6',
      cancelButtonColor: '#64748b',
      confirmButtonText: isEn ? '⚡ Quick Capture Now' : '⚡ Chụp Nhanh Ngay',
      cancelButtonText: isEn ? 'Close' : 'Đóng'
    }).then((result) => {
      if (result.isConfirmed) {
        captureNativeScreen(options);
      }
    });
    return { success: false, error: err.message };
  }
}

/**
 * 3. Hộp thoại lựa chọn chế độ chụp màn hình (Menu Chọn Kép)
 * Cho phép người dùng chọn:
 *   - Lựa chọn 1: Chụp nhanh màn hình hiện tại (chuẩn pixel 100% như Win)
 *   - Lựa chọn 2: Xuất toàn bộ bảng từ đầu đến cuối (Full-Page 4K)
 *   - Kèm mẹo phím tắt Win + Shift + S
 */
export function showScreenshotModal(options = {}) {
  const isEn = typeof window !== 'undefined' && localStorage.getItem('lang') === 'en';

  Swal.fire({
    title: `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1.25rem; color: #002D54;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00A3A6" stroke-width="2.2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        <span>${isEn ? 'Choose Screenshot Mode' : 'Chọn Chế Độ Chụp Màn Hình'}</span>
      </div>
    `,
    html: `
      <div style="text-align: left; padding: 4px 0;">
        <p style="color: #64748b; font-size: 0.88rem; margin-bottom: 16px; text-align: center;">
          ${isEn 
            ? 'Select your preferred capture method. Both automatically save to file and copy to Clipboard (Ctrl+V).' 
            : 'Vui lòng chọn cách chụp bạn muốn. Cả hai cách đều tự động lưu file PNG và sao chép vào Clipboard (Ctrl + V).'}
        </p>

        <!-- Option 1: Quick Capture (Windows Pixel) -->
        <div id="btn-quick-capture" style="
          display: flex; 
          align-items: flex-start; 
          gap: 12px; 
          padding: 14px; 
          border: 2px solid #00A3A6; 
          background: #f0fdfa; 
          border-radius: 10px; 
          cursor: pointer; 
          margin-bottom: 12px;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='#ccfbf1'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#f0fdfa'; this.style.transform='none'">
          <div style="background: #00A3A6; color: white; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
            ⚡
          </div>
          <div>
            <div style="font-weight: 700; color: #0f766e; font-size: 0.95rem; margin-bottom: 3px;">
              ${isEn ? '1. Quick Capture Current Screen (Windows Pixel)' : '1. Chụp nhanh màn hình hiện tại (Chuẩn Win)'}
            </div>
            <div style="color: #334155; font-size: 0.82rem; line-height: 1.4;">
              ${isEn 
                ? 'Direct GPU screen capture via browser. 100% pixel-perfect like Win+Shift+S. Instant and accurate.' 
                : 'Chụp trực tiếp khung hình GPU của tab qua Screen Capture API. Chuẩn 100% pixel như mắt thấy, không bao giờ lệch chữ hay mất logo.'}
            </div>
          </div>
        </div>

        <!-- Option 2: Full Table Export -->
        <div id="btn-full-capture" style="
          display: flex; 
          align-items: flex-start; 
          gap: 12px; 
          padding: 14px; 
          border: 1px solid #cbd5e1; 
          background: #ffffff; 
          border-radius: 10px; 
          cursor: pointer; 
          margin-bottom: 16px;
          transition: all 0.2s ease;
        " onmouseover="this.style.borderColor='#002D54'; this.style.background='#f8fafc'; this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='#cbd5e1'; this.style.background='#ffffff'; this.style.transform='none'">
          <div style="background: #002D54; color: white; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
            📑
          </div>
          <div>
            <div style="font-weight: 700; color: #002D54; font-size: 0.95rem; margin-bottom: 3px;">
              ${isEn ? '2. Export Full Table (Real Chrome 4K)' : '2. Xuất ảnh toàn bộ bảng (Chrome Thật 4K)'}
            </div>
            <div style="color: #334155; font-size: 0.82rem; line-height: 1.4;">
              ${isEn 
                ? 'Automatically expands the entire table (all 31 days & 25 runners) and exports Ultra HD image via real Chrome engine.' 
                : 'Tự động mở rộng toàn bộ bảng (đầy đủ 31 ngày & tất cả 25 vận động viên), chụp từ trên xuống dưới qua nhân Chrome thật.'}
            </div>
          </div>
        </div>

        <!-- Tip footer -->
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 0.8rem;">
          <span>💡</span>
          <span>${isEn ? 'Tip: You can also press <b>Win + Shift + S</b> on Windows anytime to crop any area.' : 'Mẹo: Bạn cũng có thể bấm <b>Win + Shift + S</b> trên bàn phím Windows bất cứ lúc nào để kéo chọn vùng tùy ý.'}</span>
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonColor: '#94a3b8',
    cancelButtonText: isEn ? 'Cancel' : 'Hủy bỏ',
    didOpen: () => {
      const btnQuick = document.getElementById('btn-quick-capture');
      const btnFull = document.getElementById('btn-full-capture');

      if (btnQuick) {
        btnQuick.addEventListener('click', () => {
          Swal.close();
          captureNativeScreen(options);
        });
      }

      if (btnFull) {
        btnFull.addEventListener('click', () => {
          Swal.close();
          captureFullTableChrome(options);
        });
      }
    }
  });
}

// Fallback alias cho các component cũ nếu có gọi takeFullScreenshot
export const takeFullScreenshot = showScreenshotModal;
