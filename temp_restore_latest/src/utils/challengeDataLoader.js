import historicalActivitiesFallback from '../../Storage/historical_activities.json';

/**
 * Loads challenge activities from CSV-backed sources (historical & imported)
 * Bypasses personal Strava API calls.
 * 
 * @param {Function} apiFetch - The authenticated API fetch function
 * @param {Object} athlete - The current athlete object
 * @param {Object} participants - The configured challenge participants
 * @returns {Promise<Array>} - The combined activities
 */
export async function loadChallengeData(apiFetch, athlete, participants) {
  try {
    // 1. Load historical activities (Tháng 7/2026 trở về trước)
    let historicalActivities = historicalActivitiesFallback || [];
    try {
      const histData = await apiFetch('/challenge/historical').catch(() => []);
      if (Array.isArray(histData) && histData.length > 0) {
        historicalActivities = histData;
      }
    } catch (e) {
      console.error('Lỗi khi đọc historicalActivities', e);
    }

    // 2. Load imported activities from backend (Tháng 8/2026 trở đi)
    let importedActivities = [];
    try {
      const importedData = await apiFetch('/challenge/imported', { cache: 'no-store' }).catch(() => []);
      if (Array.isArray(importedData)) {
        importedActivities = importedData;
      }
    } catch (e) {
      console.error('Lỗi khi đọc importedActivities', e);
    }

    const normalize = (n) => (n || '').trim().toLowerCase().replace(/[\.\s]/g, '');
    const myFname = athlete?.firstname || '';
    const myLname = athlete?.lastname || '';

    // 3. Enrich participants with athlete IDs from historical & imported activities
    [...historicalActivities, ...importedActivities].forEach(act => {
      if (act.athlete?.id) {
        const actFname = normalize(act.athlete.firstname);
        const actLname = normalize(act.athlete.lastname);
        const foundKey = Object.keys(participants).find(k => {
          const p = participants[k];
          const pFname = normalize(p.firstname);
          const pLname = normalize(p.lastname);
          return pFname === actFname && (pLname === actLname || pLname.startsWith(actLname) || actLname.startsWith(pLname));
        });
        if (foundKey && !participants[foundKey].id) {
          participants[foundKey].id = act.athlete.id;
        }
      }
    });

    // 4. Inject authenticated athlete ID into participants to map personal activities
    if (athlete && athlete.id) {
      const myFnameNorm = normalize(myFname);
      const myLnameNorm = normalize(myLname);
      
      const meKey = Object.keys(participants).find(k => {
        const p = participants[k];
        const pFnameNorm = normalize(p.firstname);
        const pLnameNorm = normalize(p.lastname);
        return pFnameNorm === myFnameNorm && (pLnameNorm === myLnameNorm || pLnameNorm.startsWith(myLnameNorm) || myLnameNorm.startsWith(pLnameNorm));
      });
      if (meKey) {
        participants[meKey].id = athlete.id;
      }
    }

    // Combine both sources
    // Deduplication logic isn't strictly necessary since historical and imported are from different timeframes, 
    // but we can ensure uniqueness by ID if they overlap.
    const uniqueMap = new Map();
    
    const getCompKey = (act) => {
      const d = (act.start_date_local || '').substring(0, 16);
      const t = act.moving_time || 0;
      const dist = Math.round(act.distance || 0);
      const athId = act.athlete?.id || '';
      const name = `${normalize(act.athlete?.firstname)}_${normalize(act.athlete?.lastname)}`;
      return `comp_${athId || name}_${d}_${t}_${dist}`;
    };

    const isBetterRecord = (a, b) => {
      if (!b) return true;
      if (a.start_date_local && !b.start_date_local) return true;
      if (!a.start_date_local && b.start_date_local) return false;
      const aLastname = a.athlete?.lastname || '';
      const bLastname = b.athlete?.lastname || '';
      if (aLastname.length > 2 && bLastname.length <= 2) return true;
      return false;
    };

    const addRecord = (act) => {
      if (!act) return;
      const idKey = act.id ? `id_${act.id}` : null;
      const cKey = getCompKey(act);

      if (idKey) {
        const existing = uniqueMap.get(idKey);
        if (!existing || isBetterRecord(act, existing)) {
          uniqueMap.set(idKey, act);
        }
      }
      const existingComp = uniqueMap.get(cKey);
      if (!existingComp || isBetterRecord(act, existingComp)) {
        uniqueMap.set(cKey, act);
      }
    };

    historicalActivities.forEach(addRecord);
    importedActivities.forEach(addRecord);

    return Array.from(new Set(uniqueMap.values()));
  } catch (err) {
    console.error('Lỗi loadChallengeData:', err);
    return [];
  }
}
