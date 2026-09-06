const fs = require('fs');

const data = [{
    id: null,
    type: 'Run',
    distance: 1000,
    moving_time: 1000,
    start_date_local: '2026-08-01T00:00:00Z',
    athlete: { id: 123, firstname: 'test', lastname: 'test' }
}];

const jsonStr = JSON.stringify(data);
console.log(jsonStr);

// Let's actually simulate the whole thing
const allMap = new Map();
const normalize = (n) => (n || '').trim().toLowerCase().replace(/[\.\s]/g, '');
const getActivityKey = (act) => {
   if (act.id) return `id_${act.id}`;
   const d = (act.start_date_local || '').substring(0, 16); // Chuẩn hóa tới phút YYYY-MM-DDTHH:mm
   const t = act.moving_time || 0;
   const dist = Math.round(act.distance || 0);
   const athId = act.athlete?.id || '';
   const name = `${normalize(act.athlete?.firstname)}_${normalize(act.athlete?.lastname)}`;
   return `comp_${athId || name}_${d}_${t}_${dist}`;
};

allMap.set(getActivityKey(data[0]), data[0]);

const data2 = [{
    id: "12345", // With ID
    type: 'Run',
    distance: 1000,
    moving_time: 1000,
    start_date_local: '2026-08-01T00:00:00Z',
    athlete: { id: 123, firstname: 'test', lastname: 'test' }
}];

allMap.set(getActivityKey(data2[0]), data2[0]);

console.log(Array.from(allMap.keys()));

