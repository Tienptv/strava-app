const imported = require('../Storage/imported_activities.json');
const historical = require('../Storage/historical_activities.json');

const printSang = (arr, source) => {
  const sang = arr.filter(a => a.athlete && a.athlete.firstname === 'Sang');
  sang.forEach(a => {
    const d = new Date(a.start_date_local);
    if (d.getFullYear() === 2026 && d.getMonth() === 7) { // 7 is August
      console.log(`[${source}] ${a.start_date_local} - Distance: ${a.distance / 1000} km - ID: ${a.id}`);
    }
  });
};

printSang(imported, 'imported');
printSang(historical, 'historical');
