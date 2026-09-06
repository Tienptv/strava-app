const imported = require('../Storage/imported_activities.json');

imported.forEach(a => {
  const d = new Date(a.start_date_local);
  if (d.getFullYear() === 2026 && d.getMonth() === 7 && d.getDate() === 2) {
    if (a.distance > 21000 && a.distance < 22000) {
      console.log(`${a.start_date_local} - ${a.athlete.firstname} ${a.athlete.lastname} - Distance: ${a.distance / 1000} km`);
    }
  }
});
