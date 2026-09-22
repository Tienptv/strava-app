const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('TEST SUITE: VERIFY ARREARS ALERT BANNER & MODAL IMPLEMENTATION');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// ---------------------------------------------------------
// TEST 1: Check arrears extraction logic from member_penalties_mapping.json
// ---------------------------------------------------------
console.log('--- TEST 1: Club Arrears Data Extraction (treasuryLedger logic) ---');
try {
  const penaltiesPath = path.join(__dirname, '..', 'Storage', 'member_penalties_mapping.json');
  const penaltiesData = JSON.parse(fs.readFileSync(penaltiesPath, 'utf8'));
  const members = penaltiesData.members || [];

  const arrearsItems = [];
  members.forEach(m => {
    const pVnd = m.monthlyPenaltiesVND || {};
    const pStatus = m.monthlyPaymentStatus || {};
    const athId = m.athleteId ? String(m.athleteId) : '';
    const displayName = m.fullName || m.rawName || 'Runner';
    const avatarUrl = m.avatar || m.profile_medium || m.profile || '';

    Object.entries(pVnd).forEach(([mo, fee]) => {
      if (fee > 0) {
        const statusObj = pStatus[mo];
        const isPaid = statusObj?.status === 'paid';
        if (!isPaid) {
          arrearsItems.push({
            athleteId: athId,
            displayName,
            rawName: m.rawName,
            fullName: m.fullName,
            avatarUrl,
            month: mo,
            fee,
            note: statusObj?.note || ''
          });
        }
      }
    });
  });

  arrearsItems.sort((a, b) => b.month.localeCompare(a.month) || b.fee - a.fee);

  const totalArrearsAmount = arrearsItems.reduce((sum, it) => sum + (it.fee || 0), 0);
  const uniqueAthletes = new Set(arrearsItems.map(it => it.athleteId || it.displayName));

  assert(arrearsItems.length === 5, `Expected exactly 5 unpaid items across all 49 months, found ${arrearsItems.length}`);
  assert(totalArrearsAmount === 270000, `Expected total arrears = 270,000 VND (270k), found ${totalArrearsAmount}`);
  assert(uniqueAthletes.size === 5, `Expected 5 unique runners owing money, found ${uniqueAthletes.size}`);

  const expectedDebtors = [
    { month: '2026-02', name: 'Cuong Nguyen', fee: 130000 },
    { month: '2026-02', name: 'Tam Nguyen', fee: 60000 },
    { month: '2026-06', name: 'Tien PhamTV', fee: 50000 },
    { month: '2026-06', name: 'Huy Hoang', fee: 20000 },
    { month: '2026-06', name: 'Sang Nguyen', fee: 10000 },
  ];

  expectedDebtors.forEach(exp => {
    const found = arrearsItems.find(it => it.month === exp.month && it.fee === exp.fee && it.displayName.toLowerCase().includes(exp.name.toLowerCase()));
    assert(!!found, `Found expected debtor: ${exp.name} (${exp.month}: ${exp.fee.toLocaleString('vi-VN')} VND)`);
  });
} catch (err) {
  assert(false, `Test 1 crashed: ${err.message}`);
}

// ---------------------------------------------------------
// TEST 2: Bilingual Parity in translations.js (Rule #4)
// ---------------------------------------------------------
console.log('\n--- TEST 2: Bilingual Translations Parity (Rule #4) ---');
try {
  const transPath = path.join(__dirname, '..', 'frontend', 'src', 'i18n', 'translations.js');
  const transContent = fs.readFileSync(transPath, 'utf8');

  const requiredKeys = [
    'arrearsBannerTitle',
    'arrearsBannerTotal',
    'arrearsOpenModalBtn',
    'arrearsModalTitle',
    'arrearsModalSub',
    'arrearsMonthCol',
    'arrearsAmountCol',
    'arrearsQuickPayBtn',
    'arrearsAllSettled',
    'arrearsRunnerCol',
    'arrearsNoteCol',
    'arrearsTotalDebtKpi',
    'arrearsMembersCountKpi',
    'arrearsMonthsCountKpi'
  ];

  const viSection = transContent.substring(transContent.indexOf('vi: {'), transContent.indexOf('en: {'));
  const enSection = transContent.substring(transContent.indexOf('en: {'));

  requiredKeys.forEach(key => {
    const inVi = viSection.includes(`${key}:`);
    const inEn = enSection.includes(`${key}:`);
    assert(inVi && inEn, `Key '${key}' exists in both vi and en: vi=${inVi}, en=${inEn}`);
  });
} catch (err) {
  assert(false, `Test 2 crashed: ${err.message}`);
}

// ---------------------------------------------------------
// TEST 3: Administer.jsx Monthly Table Clean 10 Columns & Modal
// ---------------------------------------------------------
console.log('\n--- TEST 3: Administer.jsx Monthly Table Clean 10 Columns & Modal ---');
try {
  const adminPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Administer.jsx');
  const adminContent = fs.readFileSync(adminPath, 'utf8');

  // Verify the header of admin-penalty-table has exactly 10 <th> elements
  const tableSectionMatch = adminContent.match(/<table className="admin-penalty-table"[\s\S]*?<thead>[\s\S]*?<tr[^>]*>([\s\S]*?)<\/tr>[\s\S]*?<\/thead>/);
  if (tableSectionMatch) {
    const thMatches = tableSectionMatch[1].match(/<th\b/g) || [];
    assert(thMatches.length === 10, `admin-penalty-table <thead> has exactly 10 clean columns (found: ${thMatches.length})`);
  } else {
    assert(false, 'Could not locate admin-penalty-table <thead> in Administer.jsx');
  }

  // Verify arrears modal table has exactly 6 columns
  const arrearsTableMatch = adminContent.match(/<table className="arrears-table"[\s\S]*?<thead>[\s\S]*?<tr[^>]*>([\s\S]*?)<\/tr>[\s\S]*?<\/thead>/);
  if (arrearsTableMatch) {
    const thMatchesModal = arrearsTableMatch[1].match(/<th\b/g) || [];
    assert(thMatchesModal.length === 6, `arrears-table <thead> in modal has exactly 6 columns (found: ${thMatchesModal.length})`);
  } else {
    assert(false, 'Could not locate arrears-table <thead> in Administer.jsx');
  }

  // Verify arrears modal and banner components exist
  assert(adminContent.includes('arrears-alert-banner'), 'Administer.jsx renders arrears-alert-banner');
  assert(adminContent.includes('showArrearsModal'), 'Administer.jsx contains showArrearsModal state');
  assert(adminContent.includes('arrears-modal-overlay'), 'Administer.jsx contains arrears-modal-overlay');
  assert(adminContent.includes('handleTogglePayment(item.athleteId'), 'Quick pay calls handleTogglePayment with item.athleteId (Rule #6)');
} catch (err) {
  assert(false, `Test 3 crashed: ${err.message}`);
}

// ---------------------------------------------------------
// TEST 4: CSS Styling Definitions (Haskoning Branding - Rule #3)
// ---------------------------------------------------------
console.log('\n--- TEST 4: CSS Styling Definitions (Haskoning Branding - Rule #3) ---');
try {
  const cssPath = path.join(__dirname, '..', 'frontend', 'src', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  const expectedClasses = [
    '.arrears-alert-banner',
    '.arrears-alert-icon-box',
    '.arrears-open-btn',
    '.arrears-modal-overlay',
    '.arrears-modal-content',
    '.arrears-modal-header',
    '.arrears-modal-kpi-bar',
    '.arrears-table',
    '.arrears-pay-action-btn'
  ];

  expectedClasses.forEach(cls => {
    assert(cssContent.includes(cls), `CSS class ${cls} defined in index.css`);
  });
} catch (err) {
  assert(false, `Test 4 crashed: ${err.message}`);
}

// ---------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------
console.log('\n================================================================');
console.log(`FINAL TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
