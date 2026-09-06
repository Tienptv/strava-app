const historical = require('./Storage/historical_activities.json');
const imported = require('./Storage/imported_activities.json');

const normalize = (str) => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/d/g, 'd')
      .replace(/Ð/g, 'D')
      .trim()
      .toLowerCase();
};

const getCompKey = (act) => {
    const d = (act.start_date_local || '').substring(0, 16);
    const t = act.moving_time || 0;
    const dist = Math.round(act.distance || 0);
    const athId = act.athlete?.id || '';
    const name = normalize(act.athlete?.firstname) + '_' + normalize(act.athlete?.lastname);
    return 'comp_' + (athId || name) + '_' + d + '_' + t + '_' + dist;
};

const uniqueMap = new Map();
historical.forEach((act) => {
    if (act.start_date_local) {
        uniqueMap.set(getCompKey(act), act);
    }
});
imported.forEach((act) => {
    if (act.start_date_local) {
        uniqueMap.set(getCompKey(act), act);
    }
});

const merged = Array.from(uniqueMap.values());
const tienActs = merged.filter(a => a.athlete && (a.athlete.id == 133066813 || a.athlete.firstname === 'Tien'));

console.log('Tien Aug:');
tienActs.filter(a => a.start_date_local && a.start_date_local.startsWith('2026-08')).forEach(a => console.log(a.id, a.distance, a.start_date_local));

let sum = 0;
tienActs.filter(a => a.start_date_local && a.start_date_local.startsWith('2026-08')).forEach(a => sum += a.distance);
console.log('Total:', sum / 1000);
