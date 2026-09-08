const fs = require('fs');
const path = require('path');

const PENALTIES_FILE = path.join(__dirname, '../Storage/member_penalties_mapping.json');

const yellowCells = [
  { name: 'Cuong Nguyen', month: '2026-02' },
  { name: 'Huy Hoang', month: '2026-06' },
  { name: 'Sang Nguyen', month: '2026-06' },
  { name: 'Tam Nguyen', month: '2026-02' },
  { name: 'Tien Pham', month: '2026-06' }
];

function isYellowCell(memberName, month) {
  if (!memberName) return false;
  return yellowCells.some(y => 
    y.month === month && 
    memberName.toLowerCase().includes(y.name.toLowerCase())
  );
}

function runUpdate() {
  if (!fs.existsSync(PENALTIES_FILE)) {
    console.error('File không tồn tại:', PENALTIES_FILE);
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(PENALTIES_FILE, 'utf8'));
  const now = new Date().toISOString();
  let updatedCount = 0;

  data.members.forEach(member => {
    if (!member.monthlyPaymentStatus) {
      member.monthlyPaymentStatus = {};
    }

    let hasUnpaid = false;

    if (member.monthlyPenaltiesVND) {
      Object.keys(member.monthlyPenaltiesVND).forEach(month => {
        const amount = member.monthlyPenaltiesVND[month];
        if (amount > 0) {
          // Rule 1: August 2026 is UNPAID
          // Rule 2: Yellow cells are UNPAID
          // Rule 3: Everything else is PAID
          let shouldBePaid = true;

          if (month === '2026-08') {
            shouldBePaid = false;
          } else if (isYellowCell(member.rawName, month) || isYellowCell(member.fullName, month)) {
            shouldBePaid = false;
          }

          if (shouldBePaid) {
            // Check if not already marked as paid
            if (!member.monthlyPaymentStatus[month] || member.monthlyPaymentStatus[month].status !== 'paid') {
              member.monthlyPaymentStatus[month] = {
                status: 'paid',
                paidAt: now,
                note: 'Tự động cập nhật theo file theo dõi quỹ (Paid)',
                updatedBy: 'System Update',
                updatedAt: now
              };
              updatedCount++;
            }
          } else {
            // Unpaid
            hasUnpaid = true;
            if (!member.monthlyPaymentStatus[month] || member.monthlyPaymentStatus[month].status !== 'unpaid') {
              member.monthlyPaymentStatus[month] = {
                status: 'unpaid',
                paidAt: null,
                note: 'Chưa đóng theo file theo dõi quỹ',
                updatedBy: 'System Update',
                updatedAt: now
              };
              updatedCount++;
            }
          }
        }
      });
    }

    // Update overall financial summary
    if (!member.financialSummary) member.financialSummary = {};
    member.financialSummary.paymentStatus = hasUnpaid ? 'unpaid' : 'paid';
  });

  fs.writeFileSync(PENALTIES_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Đã cập nhật ${updatedCount} bản ghi trạng thái nộp phạt vào file JSON.`);
}

runUpdate();
