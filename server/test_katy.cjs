const fs = require('fs');
const path = require('path');

// Simulate backend fetching Total-km
const csvContent = fs.readFileSync('Storage/Total-km-17-08-2026.csv', 'utf8');
const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
const baseItems = [];
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  if (parts.length >= 2) {
    const name = (parts[0] || '').trim();
    const athleteUrl = (parts[1] || '').trim();
    const rawDist = (parts[2] || '').replace(/[^\d.]/g, '').trim();
    const dist = rawDist ? parseFloat(rawDist) : null;
    let athleteId = null;
    const idMatch = athleteUrl.match(/\/athletes\/(\d+)/);
    if (idMatch) athleteId = parseInt(idMatch[1], 10);
    if (name || athleteId) {
      baseItems.push({ name, athleteUrl, athleteId, baseDistance: dist });
    }
  }
}
const totalKmBase = { cutoffDate: '2026-08-17T23:59:59.999Z', items: baseItems };

// Simulate processChallengeData for Katy_N.
const normalize = (n) => {
  if (!n) return '';
  return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').trim().toLowerCase().replace(/[\.\s_-]/g, '');
};

const memFname = normalize("Katy");
const memLname = normalize("N.");
const member = { firstname: "Katy", lastname: "N.", id: 149162660 };

const matchedBaseItem = baseItems.find(item => {
  if (item.athleteId && member.id && item.athleteId === member.id) {
    return true;
  }
  const itemParts = (item.name || '').trim().split(/\s+/);
  const itemFname = normalize(itemParts[0]);
  const itemLname = normalize(itemParts.slice(1).join(''));
  if (itemFname === memFname && (itemLname === memLname || itemLname.startsWith(memLname) || memLname.startsWith(itemLname))) {
    return true;
  }
  return false;
});

console.log('matchedBaseItem:', matchedBaseItem);
