const fs = require('fs');

const data = JSON.parse(fs.readFileSync('Storage/imported_activities.json', 'utf8'));
const idMap = new Map();

data.forEach(a => {
  const id = a.id;
  if (id) {
    if (!idMap.has(id)) {
      idMap.set(id, a);
    } else {
      const existing = idMap.get(id);
      // Prefer the newer date (more likely to have timezone fixed)
      if (new Date(a.start_date_local) > new Date(existing.start_date_local)) {
        idMap.set(id, a);
      }
    }
  } else {
    idMap.set(Math.random(), a);
  }
});

fs.writeFileSync('Storage/imported_activities.json', JSON.stringify(Array.from(idMap.values()), null, 2));
console.log('Deduplication completed');
