const imported = require('../Storage/imported_activities.json');

const sangs = imported.filter(a => a.athlete && (a.athlete.firstname === 'Sang' || a.athlete.firstname.includes('Sang')));
sangs.forEach(a => {
  const d = new Date(a.start_date_local);
  if (d.getFullYear() === 2026 && d.getMonth() === 7) { 
    console.log(`${a.start_date_local} - ${a.athlete.firstname} ${a.athlete.lastname} - Distance: ${a.distance / 1000} km - ID: ${a.id} - moving_time: ${a.moving_time}`);
  }
});
