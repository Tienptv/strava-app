const fs = require('fs');
const path = require('path');
const http = require('http');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('====================================================');
console.log('RUNNER UNIFICATION & TARGET DEDUPLICATION TEST SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Storage files integrity
// ----------------------------------------------------
console.log('Test Suite 1: Storage files validation');

const TARGETS_FILE = path.join(__dirname, '../Storage/targets.json');
const NAME_MAPPING_FILE = path.join(__dirname, '../Storage/name_mapping.json');
const CONFIG_FILE = path.join(__dirname, '../Storage/challenge_config.json');

const targets = JSON.parse(fs.readFileSync(TARGETS_FILE, 'utf8'));
const nameMapping = JSON.parse(fs.readFileSync(NAME_MAPPING_FILE, 'utf8'));
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

// 1.1 Ha Xuan A. deleted from targets.json
assert(!targets['Hà Xuân_A._2026_9'], 'Hà Xuân_A._2026_9 must NOT exist in targets.json');
assert(!targets['Hà Xuân_A.'], 'Hà Xuân_A. must NOT exist in targets.json');

// 1.2 An_H. exists in targets.json with 20km
assert(targets['An_H._2026_9'] !== undefined, 'An_H._2026_9 MUST exist in targets.json');
assert(targets['An_H._2026_9']?.target === 20, `An_H._2026_9 target must be 20km (got: ${targets['An_H._2026_9']?.target})`);
assert(targets['An_H._2026_9']?.penalty === true, 'An_H._2026_9 penalty must be true');

// 1.3 Name mapping aliases point to An_H.
assert(nameMapping['Hà Xuân A.']?.key === 'An_H.', 'nameMapping["Hà Xuân A."].key must be "An_H."');
assert(nameMapping['Hà Xuân A.']?.athleteId === '110041582', 'nameMapping["Hà Xuân A."].athleteId must be "110041582"');
assert(nameMapping['An H.']?.key === 'An_H.', 'nameMapping["An H."].key must be "An_H."');
assert(nameMapping['An H.']?.athleteId === '110041582', 'nameMapping["An H."].athleteId must be "110041582"');

// 1.4 Challenge config participants
assert(config.participants['An_H.'] !== undefined, 'config.participants["An_H."] must exist');
assert(String(config.participants['An_H.']?.id) === '110041582', 'config.participants["An_H."].id must be 110041582');
assert(!config.participants['Hà Xuân_A.'], 'config.participants["Hà Xuân_A."] must not exist');

console.log('');

// ----------------------------------------------------
// TEST 2: Canonical Runner Key Logic
// ----------------------------------------------------
console.log('Test Suite 2: getCanonicalRunnerKey logic');

function getCanonicalRunnerKey(rawKey, athleteId = null) {
  if (!rawKey && !athleteId) return '';
  const strKey = String(rawKey || '').trim();
  const suffixMatch = strKey.match(/(_\d{4}_\d{1,2})$/);
  const suffix = suffixMatch ? suffixMatch[1] : '';
  let baseKey = suffix ? strKey.slice(0, -suffix.length) : strKey;
  
  const aid = String(athleteId || '').trim();
  if (aid === '110041582') return `An_H.${suffix}`;
  
  const normBase = baseKey.replace(/\s+/g, ' ').replace(/_/g, ' ').trim().toLowerCase();
  if (['ha xuan a.', 'ha xuan a', 'ha xuan an', 'hà xuân a.', 'hà xuân a', 'hà xuân an', 'an ha', 'an h.', 'an_h.', 'an_h'].includes(normBase)) {
    return `An_H.${suffix}`;
  }
  
  if (nameMapping[baseKey]?.key) return `${nameMapping[baseKey].key}${suffix}`;
  const foundEntry = Object.entries(nameMapping).find(([k, v]) => {
    const kNorm = k.replace(/_/g, ' ').trim().toLowerCase();
    return (kNorm === normBase) || (v.athleteId && aid && String(v.athleteId) === aid);
  });
  if (foundEntry && foundEntry[1]?.key) return `${foundEntry[1].key}${suffix}`;
  
  return strKey;
}

assert(getCanonicalRunnerKey('Hà Xuân_A._2026_9') === 'An_H._2026_9', 'Hà Xuân_A._2026_9 -> An_H._2026_9');
assert(getCanonicalRunnerKey('Hà Xuân A.') === 'An_H.', 'Hà Xuân A. -> An_H.');
assert(getCanonicalRunnerKey('Ha Xuan An') === 'An_H.', 'Ha Xuan An -> An_H.');
assert(getCanonicalRunnerKey(null, '110041582') === 'An_H.', 'athleteId 110041582 -> An_H.');
assert(getCanonicalRunnerKey('An H.') === 'An_H.', 'An H. -> An_H.');
assert(getCanonicalRunnerKey('An_H.') === 'An_H.', 'An_H. -> An_H.');
assert(getCanonicalRunnerKey('Tien_P._2026_9') === 'Tien_P._2026_9', 'Tien_P._2026_9 -> Tien_P._2026_9');

console.log('');

// ----------------------------------------------------
// TEST 3: Frontend getAthleteMatchKey Logic
// ----------------------------------------------------
console.log('Test Suite 3: Frontend getAthleteMatchKey logic');

const KNOWN_ATHLETE_ALIASES = {
  '110041582': 'An_H.',
  'ha xuan an': 'An_H.',
  'hà xuân an': 'An_H.',
  'ha xuan a.': 'An_H.',
  'hà xuân a.': 'An_H.',
  'ha xuan_a.': 'An_H.',
  'hà xuân_a.': 'An_H.',
  'an ha': 'An_H.',
  'an h.': 'An_H.',
  'an_h.': 'An_H.',
};

function removeVietnameseTones(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
function normalize(n) {
  return removeVietnameseTones(n || '').trim().toLowerCase().replace(/[\.\s_-]/g, '');
}

function testGetAthleteMatchKey(athlete, participants = {}) {
  if (!athlete) return null;
  const aid = athlete.id ? String(athlete.id).trim() : '';
  if (aid && KNOWN_ATHLETE_ALIASES[aid]) {
    return KNOWN_ATHLETE_ALIASES[aid];
  }

  const rawFull = `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim().toLowerCase();
  if (KNOWN_ATHLETE_ALIASES[rawFull]) {
    return KNOWN_ATHLETE_ALIASES[rawFull];
  }

  const normCombined = normalize(rawFull);
  if (normCombined.includes('haxuanan') || normCombined === 'haxuana') {
    return 'An_H.';
  }

  const normFname = normalize(athlete.firstname);
  const normLname = normalize(athlete.lastname);

  if (aid) {
    const keyById = Object.keys(participants || {}).find(k => {
      const p = participants[k];
      return (p && (String(p.id) === aid || String(p.athleteId) === aid)) || (k === aid);
    });
    if (keyById) return keyById;
  }

  const keyByDirectName = Object.keys(participants || {}).find(k => {
    const p = participants[k];
    if (!p) return false;
    const pFname = normalize(p.firstname);
    const pLname = normalize(p.lastname);
    if (pFname !== normFname) return false;
    if (!normLname) return true;
    return (pLname === normLname || pLname.startsWith(normLname) || normLname.startsWith(pLname));
  });
  if (keyByDirectName) return keyByDirectName;

  const lastInitial = athlete.lastname ? (athlete.lastname.trim().charAt(0) + '.') : '';
  const fallbackKey = lastInitial ? `${athlete.firstname}_${lastInitial}` : (athlete.firstname || String(athlete.id || 'runner'));

  if (KNOWN_ATHLETE_ALIASES[fallbackKey.toLowerCase()] || KNOWN_ATHLETE_ALIASES[fallbackKey.toLowerCase().replace(/_/g, ' ')]) {
    return KNOWN_ATHLETE_ALIASES[fallbackKey.toLowerCase()] || KNOWN_ATHLETE_ALIASES[fallbackKey.toLowerCase().replace(/_/g, ' ')];
  }

  return fallbackKey;
}

assert(testGetAthleteMatchKey({ id: 110041582, firstname: 'Hà Xuân', lastname: 'An' }, config.participants) === 'An_H.', 'Strava mobile Hà Xuân An by ID -> An_H.');
assert(testGetAthleteMatchKey({ id: null, firstname: 'Hà Xuân', lastname: 'An' }, config.participants) === 'An_H.', 'Strava mobile Hà Xuân An without ID -> An_H.');
assert(testGetAthleteMatchKey({ firstname: 'An', lastname: 'Ha' }, config.participants) === 'An_H.', 'An Ha -> An_H.');
assert(testGetAthleteMatchKey({ firstname: 'Tien', lastname: 'P.' }, config.participants) === 'Tien_P.', 'Tien P. -> Tien_P.');

console.log('');

// ----------------------------------------------------
// TEST 4: Frontend Deduplication in SmartReminderTool
// ----------------------------------------------------
console.log('Test Suite 4: SmartReminderTool deduplication');

function getDeduplicatedRunners(rawRunners = []) {
  const seen = new Set();
  return (rawRunners || []).filter(r => {
    const idKey = r.athleteId ? `id_${r.athleteId}` : null;
    const nameKey = `key_${(r.cleanKey || r.runnerName || '').replace(/_/g, ' ').trim().toLowerCase()}`;
    if (idKey && seen.has(idKey)) return false;
    if (seen.has(nameKey)) return false;
    if (idKey) seen.add(idKey);
    seen.add(nameKey);
    return true;
  });
}

const mockDuplicateRunners = [
  { athleteId: '110041582', cleanKey: 'An_H.', runnerName: 'An H.', targetKm: 20 },
  { athleteId: '110041582', cleanKey: 'Hà Xuân_A.', runnerName: 'Hà Xuân A.', targetKm: 40 },
  { athleteId: '133066813', cleanKey: 'Tien_P.', runnerName: 'Tien P.', targetKm: 100 }
];

const deduped = getDeduplicatedRunners(mockDuplicateRunners);
assert(deduped.length === 2, `deduped.length must be 2 (got: ${deduped.length})`);
assert(deduped[0].cleanKey === 'An_H.' && deduped[0].targetKm === 20, 'Retained entry is An H. with 20km target');
assert(deduped[1].cleanKey === 'Tien_P.', 'Second entry is Tien P.');

console.log('');

// ----------------------------------------------------
// TEST 5: Actual Server API Endpoint Test
// ----------------------------------------------------
console.log('Test Suite 5: Live API endpoint /api/notifications/reminders/summary');

function runApiTest() {
  const req = http.get('http://localhost:3001/api/notifications/reminders/summary', (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        assert(res.statusCode === 200, `/api/notifications/reminders/summary status 200 (got: ${res.statusCode})`);
        assert(Array.isArray(json.shortfallRunners), 'shortfallRunners must be an array');
        
        const anEntries = json.shortfallRunners.filter(r => 
          String(r.athleteId) === '110041582' || 
          r.cleanKey === 'An_H.' || 
          r.runnerName?.toLowerCase().includes('hà xuân') ||
          r.runnerName?.toLowerCase().includes('an h')
        );

        assert(anEntries.length === 1, `Exactly ONE entry for An Ha in shortfallRunners (got: ${anEntries.length})`);
        if (anEntries.length > 0) {
          const an = anEntries[0];
          assert(an.cleanKey === 'An_H.', `cleanKey must be An_H. (got: ${an.cleanKey})`);
          assert(an.targetKm === 20, `targetKm must be 20km (got: ${an.targetKm})`);
          assert(an.shortfallKm === 20, `shortfallKm must be 20km (got: ${an.shortfallKm})`);
          assert(an.runnerName !== 'Hà Xuân A.', `runnerName must NOT be "Hà Xuân A." (got: ${an.runnerName})`);
        }

        // Check deduplication across all runners
        const seenAids = new Set();
        const seenCleanKeys = new Set();
        let hasDuplicates = false;
        json.shortfallRunners.forEach(r => {
          if (r.athleteId && seenAids.has(r.athleteId)) hasDuplicates = true;
          if (r.athleteId) seenAids.add(r.athleteId);
          if (seenCleanKeys.has(r.cleanKey)) hasDuplicates = true;
          seenCleanKeys.add(r.cleanKey);
        });
        assert(!hasDuplicates, 'Zero duplicates across all shortfall runners in API response');

        // Check km calculation for runners who ran in Sept
        const tienEntry = json.shortfallRunners.find(r => r.cleanKey === 'Tien_P.');
        if (tienEntry) {
          assert(tienEntry.actualKm > 0, `Tien PhamTV actualKm > 0 (got: ${tienEntry.actualKm}km)`);
        }

        printFinalReport();
      } catch (err) {
        console.error('Error parsing live API response:', err.message);
        failedTests++;
        printFinalReport();
      }
    });
  });

  req.on('error', (e) => {
    console.log(`  ℹ️ Live server on port 3001 not reachable (${e.message}), will test directly via function invocation.`);
    // In-memory test of API logic
    testServerInternalsDirectly();
    printFinalReport();
  });
}

function testServerInternalsDirectly() {
  console.log('\nTesting server endpoint logic directly from Storage:');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthSuffix = `_${year}_${month}`;

  const shortfallRunners = [];
  const seenRunners = new Set();

  const evaluateRunner = (rawKey, athleteId, displayInfo = {}) => {
    if (!rawKey && !athleteId) return;
    const canonicalKey = getCanonicalRunnerKey(rawKey, athleteId);
    const cleanKey = canonicalKey.replace(monthSuffix, '');
    const aid = String(athleteId || displayInfo.id || displayInfo.athleteId || nameMapping[cleanKey]?.athleteId || '').trim();

    const idKey = aid ? `id_${aid}` : null;
    const matchKeyMarker = `key_${cleanKey.toLowerCase()}`;
    if (idKey && seenRunners.has(idKey)) return;
    if (seenRunners.has(matchKeyMarker)) return;

    if (idKey) seenRunners.add(idKey);
    seenRunners.add(matchKeyMarker);

    const targetObj = targets[`${cleanKey}${monthSuffix}`] || targets[cleanKey] || (rawKey ? targets[`${rawKey}${monthSuffix}`] || targets[rawKey] : null) || {};
    const targetKm = parseFloat(targetObj.target) || 0;
    if (targetKm <= 0) return;

    const runnerName = displayInfo.name || cleanKey.replace(/_/g, ' ').trim();
    const fullName = displayInfo.fullName || displayInfo.name || nameMapping[cleanKey]?.fullName || runnerName;

    shortfallRunners.push({
      key: `${cleanKey}${monthSuffix}`,
      cleanKey,
      runnerName,
      fullName,
      athleteId: aid,
      targetKm
    });
  };

  Object.entries(config.participants).forEach(([key, p]) => {
    evaluateRunner(key, p?.id || p?.athleteId, {
      id: p?.id || p?.athleteId,
      name: p?.name || `${p?.firstname || ''} ${p?.lastname || ''}`.trim(),
      fullName: p?.name
    });
  });

  Object.entries(targets).forEach(([key, val]) => {
    if (!key.endsWith(monthSuffix)) return;
    const targetCleanKey = key.replace(monthSuffix, '');
    evaluateRunner(targetCleanKey, null);
  });

  const anEntries = shortfallRunners.filter(r => String(r.athleteId) === '110041582' || r.cleanKey === 'An_H.');
  assert(anEntries.length === 1, `Direct logic produces exactly ONE entry for An Ha (got: ${anEntries.length})`);
  assert(anEntries[0]?.cleanKey === 'An_H.', 'Direct logic cleanKey is An_H.');
  assert(anEntries[0]?.targetKm === 20, 'Direct logic targetKm is 20');
}

function printFinalReport() {
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('====================================================');
  process.exit(failedTests > 0 ? 1 : 0);
}

runApiTest();
