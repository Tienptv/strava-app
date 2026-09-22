/**
 * penaltyUtils.js
 * 
 * Bộ tiện ích chuẩn hóa quy tắc làm tròn và định dạng tiền phạt theo hàm ROUNDUP(..., -4) của Excel:
 * - Làm tròn lên bội số 10.000 VNĐ (10k) tiếp theo.
 * - Khử sai số số thực (floating-point imprecision) của JavaScript để tránh nhảy oan mốc tròn (ví dụ 10.000000000000002).
 * - Mức trần phạt tối đa mặc định theo điều lệ CLB: 200.000 VNĐ (200k).
 * - Giữ nguyên định dạng hiển thị: 0k, 10k, 20k, 100k, 160k, 200k hoặc 10.000 đ.
 */

/**
 * Làm tròn số tiền phạt theo hàm ROUNDUP(..., -4) của Excel
 * (làm tròn lên nấc 10.000 VNĐ tiếp theo, trần tối đa maxVnd = 200.000 VNĐ).
 * 
 * @param {number|string} rawVnd - Số tiền phạt nguyên bản tính theo VNĐ
 * @param {number} [maxVnd=200000] - Mức phạt trần tối đa (mặc định 200.000 VNĐ)
 * @returns {number} - Số tiền phạt sau khi làm tròn (VNĐ)
 */
export function roundUpPenaltyVnd(rawVnd, maxVnd = 200000) {
  if (rawVnd === null || rawVnd === undefined || rawVnd === '') return 0;
  const num = Number(rawVnd);
  if (isNaN(num) || num <= 0) return 0;

  // Khử sai số số thực (floating point epsilon) trước khi ceil
  // Ví dụ phép chia ra 10000.000000000002 sẽ được làm tròn về 10000
  const rounded = Math.round(num);
  if (rounded <= 0) return 0;

  const result = Math.ceil(rounded / 10000) * 10000;
  return Math.min(maxVnd, result);
}

/**
 * Làm tròn số tiền phạt theo đơn vị 'k' (nghìn đồng)
 * (ví dụ: rawK = 12.3k -> tương đương 12.300 VNĐ -> làm tròn thành 20k).
 * 
 * @param {number|string} rawK - Số tiền nguyên bản theo đơn vị k
 * @param {number} [maxK=200] - Mức trần theo k (mặc định 200k)
 * @returns {number} - Số tiền sau làm tròn theo k (0, 10, 20, 100, 160, 200)
 */
export function roundUpPenaltyK(rawK, maxK = 200) {
  if (rawK === null || rawK === undefined || rawK === '') return 0;
  const numK = Number(rawK);
  if (isNaN(numK) || numK <= 0) return 0;

  const rawVnd = numK * 1000;
  return roundUpPenaltyVnd(rawVnd, maxK * 1000) / 1000;
}

/**
 * Tính toán tiền phạt từ chỉ tiêu km và km đã chạy
 * 
 * @param {Object} params
 * @param {number} params.remainingKm - Số km còn thiếu (target - actual)
 * @param {number} params.targetKm - Chỉ tiêu km mục tiêu
 * @param {boolean} params.hasPenalty - Có cam kết đóng phạt không
 * @param {number} [params.maxPenaltyK=200] - Mức phạt tối đa tính bằng k
 * @returns {{ hasPenalty: boolean, isReached: boolean, rawK: number, penaltyK: number|null, penaltyVnd: number }}
 */
export function calculatePenalty({ remainingKm, targetKm, hasPenalty, maxPenaltyK = 200 }) {
  if (!hasPenalty || !targetKm || targetKm <= 0) {
    return {
      hasPenalty: false,
      isReached: false,
      rawK: 0,
      penaltyK: null,
      penaltyVnd: 0
    };
  }

  const rem = Math.max(0, remainingKm !== undefined && remainingKm !== null ? Number(remainingKm) : 0);
  if (rem <= 0) {
    return {
      hasPenalty: true,
      isReached: true,
      rawK: 0,
      penaltyK: 0,
      penaltyVnd: 0
    };
  }

  const rawK = (rem / Number(targetKm)) * maxPenaltyK;
  const penaltyK = roundUpPenaltyK(rawK, maxPenaltyK);
  const penaltyVnd = penaltyK * 1000;

  return {
    hasPenalty: true,
    isReached: false,
    rawK,
    penaltyK,
    penaltyVnd
  };
}

/**
 * Định dạng hiển thị dạng 'k' (giữ nguyên phong cách cũ: 0k, 10k, 100k...)
 * 
 * @param {number|null|undefined} penaltyK - Số tiền phạt theo k
 * @returns {string} - Ví dụ: '0k', '10k', '20k', '100k', '-'
 */
export function formatPenaltyK(penaltyK) {
  if (penaltyK === null || penaltyK === undefined) return '-';
  const num = Number(penaltyK);
  if (isNaN(num) || num === 0) return '0k';
  return `${num}k`;
}

/**
 * Định dạng hiển thị VNĐ đầy đủ: 10.000 đ, 100.000 đ, 200.000 đ
 * 
 * @param {number|null|undefined} penaltyVnd - Số tiền phạt theo VNĐ
 * @returns {string} - Ví dụ: '0 đ', '10.000 đ', '20.000 đ', '100.000 đ'
 */
export function formatPenaltyVnd(penaltyVnd) {
  if (penaltyVnd === null || penaltyVnd === undefined) return '0 đ';
  const num = Number(penaltyVnd);
  if (isNaN(num) || num === 0) return '0 đ';
  return `${num.toLocaleString('vi-VN')} đ`;
}
