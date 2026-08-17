import { useState, useEffect } from 'react';
import { Target, Users, Search, Check, Save, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { useLang } from '../i18n/LangContext';

export default function Sidebar({ apiFetch, currentMonth, currentYear }) {
  const { t } = useLang();
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State quản lý challenge participants: { [athleteId]: true/false }
  const [participants, setParticipants] = useState({});
  const [monthlyParticipants, setMonthlyParticipants] = useState({});
  const [rawConfig, setRawConfig] = useState(null);
  const [allowEditOthers, setAllowEditOthers] = useState(false);

  const activeMonth = currentMonth || (new Date().getMonth() + 1);
  const activeYear = currentYear || new Date().getFullYear();

  useEffect(() => {
    // Load saved config on mount or when active month/year changes
    apiFetch('/challenge/config')
      .then(data => {
        if (!data) return;
        setRawConfig(data);
        if (data.clubId) setSelectedClubId(data.clubId);
        if (data.allowEditOthers !== undefined) setAllowEditOthers(data.allowEditOthers);
        if (data.monthlyParticipants) {
          setMonthlyParticipants(data.monthlyParticipants);
          const currentKey = `${activeYear}_${activeMonth}`;
          const currentParts = data.monthlyParticipants[currentKey] || data.participants || {};
          setParticipants(currentParts);
        } else if (data.participants) {
          setParticipants(data.participants);
        }
      })
      .catch(err => console.error('Lỗi tải config:', err));
  }, [apiFetch, activeMonth, activeYear]);

  const [savedMessage, setSavedMessage] = useState(false);

  // Lấy danh sách clubs của user khi Sidebar render
  useEffect(() => {
    apiFetch('/clubs')
      .then(data => setClubs(data || []))
      .catch(err => console.error('Lỗi tải clubs:', err));
  }, [apiFetch]);

  // Khi chọn một club, tải danh sách thành viên
  useEffect(() => {
    if (selectedClubId) {
      setLoadingMembers(true);
      apiFetch(`/clubs/${selectedClubId}/members?per_page=200`)
        .then(data => setMembers(data || []))
        .catch(err => console.error('Lỗi tải members:', err))
        .finally(() => setLoadingMembers(false));
    } else {
      setMembers([]);
    }
  }, [selectedClubId, apiFetch]);

  // Toggle thành viên
  const toggleParticipant = (athleteId, memberData) => {
    setParticipants(prev => {
      const newState = { ...prev };
      if (newState[athleteId]) {
        delete newState[athleteId];
      } else {
        newState[athleteId] = memberData;
      }
      return newState;
    });
  };

  const handleSave = async () => {
    try {
      const monthKey = `${activeYear}_${activeMonth}`;
      const updatedMonthly = {
        ...monthlyParticipants,
        [monthKey]: participants
      };
      setMonthlyParticipants(updatedMonthly);

      await apiFetch('/challenge/config', {
        method: 'POST',
        body: JSON.stringify({
          clubId: selectedClubId,
          monthKey: monthKey,
          participants: participants,
          monthlyParticipants: updatedMonthly,
          allowEditOthers: allowEditOthers
        })
      });
      window.dispatchEvent(new CustomEvent('challengeUpdated', { detail: { year: activeYear, month: activeMonth } }));
      
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error('Lỗi lưu config:', err);
      alert('Không thể lưu cấu hình, vui lòng thử lại.');
    }
  };

  const handleCsvUpload = async (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (!files.length) {
       alert('Không tìm thấy file CSV nào hợp lệ.');
       return;
    }

    let allImportedActivities = [];

    const parseFile = (file) => {
      return new Promise((resolve) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: function(results) {
            const data = results.data;
            const importedActivities = data.map(row => {
              let dist = parseFloat(String(row.Distance || 0).replace(',', '.').replace(/[^\d.-]/g, ''));
              dist = isNaN(dist) ? 0 : dist * 1000;
              
              let movingTimeStr = row['Duration'] || row['Moving Time'] || row['Time'] || '00:00:00';
              let timeParts = movingTimeStr.split(':').map(Number);
              let movingTimeSec = 0;
              if (timeParts.length === 3) {
                movingTimeSec = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
              } else if (timeParts.length === 2) {
                movingTimeSec = timeParts[0] * 60 + timeParts[1];
              }

              let athleteId = null;
              let athleteName = row.Name || row.Athlete || '';
              
              if (row.Athlete && String(row.Athlete).includes('/athletes/')) {
                athleteId = parseInt(String(row.Athlete).replace('/athletes/', ''), 10);
                athleteName = row.Name || '';
              }

              let activityId = null;
              if (row.Activity) {
                const match = String(row.Activity).match(/\d+/);
                if (match) activityId = match[0];
              } else if (row['Activity ID'] || row.id || row.Id) {
                activityId = String(row['Activity ID'] || row.id || row.Id);
              }

              let nameParts = athleteName.trim().split(' ');
              let lastname = nameParts.length > 1 ? nameParts.pop() : '';
              let firstname = nameParts.join(' ');

              let dateStr = row.Date || '';
              let localIsoStr = null;

              if (dateStr.includes('T')) {
                // Định dạng ISO: "2026-08-17T05:56:00.000+07:00" -> lấy đúng phần giờ local YYYY-MM-DDTHH:mm:ssZ
                localIsoStr = dateStr.substring(0, 19) + 'Z';
              } else if (dateStr) {
                if (dateStr.includes('/')) {
                   let dParts = dateStr.split(' ')[0].split('/');
                   let tPart = dateStr.split(' ')[1] || '00:00:00';
                   if (dParts.length === 3) {
                      if (dParts[0].length === 4) {
                         dateStr = `${dParts[0]}-${String(dParts[1]).padStart(2, '0')}-${String(dParts[2]).padStart(2, '0')}T${tPart}Z`;
                      } else {
                         dateStr = `${dParts[2]}-${String(dParts[1]).padStart(2, '0')}-${String(dParts[0]).padStart(2, '0')}T${tPart}Z`;
                      }
                      localIsoStr = dateStr;
                   }
                } else if (dateStr.includes('-')) {
                   let parts = dateStr.split(' ');
                   let dPart = parts[0];
                   let tPart = parts[1] || '00:00:00';
                   localIsoStr = `${dPart}T${tPart}Z`;
                }
              }

              return {
                id: activityId,
                type: row.Type || row['Activity Type'] || 'Run',
                distance: dist,
                moving_time: movingTimeSec,
                start_date_local: localIsoStr,
                athlete: {
                  id: athleteId,
                  firstname: firstname,
                  lastname: lastname
                }
              };
            });
            resolve(importedActivities);
          },
          error: function(err) {
            console.error('Lỗi parse CSV', err);
            resolve([]);
          }
        });
      });
    };

    for (const file of files) {
      const activities = await parseFile(file);
      allImportedActivities = [...allImportedActivities, ...activities];
    }

    let existingActivities = [];
    try {
      const importedData = await apiFetch('/challenge/imported').catch(() => []);
      if (Array.isArray(importedData)) {
        existingActivities = importedData;
      }
    } catch (e) {
      console.error('Lỗi khi đọc importedActivities', e);
    }

    const normalize = (n) => (n || '').trim().toLowerCase().replace(/[\.\s]/g, '');
    const allMap = new Map();
    const getActivityKey = (act) => {
       if (act.id) return `id_${act.id}`;
       const d = (act.start_date_local || '').substring(0, 16); // Chuẩn hóa tới phút YYYY-MM-DDTHH:mm
       const t = act.moving_time || 0;
       const dist = Math.round(act.distance || 0);
       const athId = act.athlete?.id || '';
       const name = `${normalize(act.athlete?.firstname)}_${normalize(act.athlete?.lastname)}`;
       return `comp_${athId || name}_${d}_${t}_${dist}`;
    };

    // Chỉ update các hoạt động từ tháng 8/2026 trở đi vào importedActivities (các tháng 1-7 đã lưu riêng trong historical)
    const augImportedActivities = allImportedActivities.filter(a => !a.start_date_local || a.start_date_local >= '2026-08-01T00:00:00');

    existingActivities.forEach(act => allMap.set(getActivityKey(act), act));
    augImportedActivities.forEach(act => allMap.set(getActivityKey(act), act));

    const finalActivities = Array.from(allMap.values()).filter(a => !a.start_date_local || a.start_date_local >= '2026-08-01T00:00:00');
    
    try {
      await apiFetch('/challenge/imported', {
        method: 'POST',
        body: JSON.stringify(finalActivities)
      });
      window.dispatchEvent(new Event('challengeUpdated'));
      alert(t('importSuccess') + ` (${allImportedActivities.length} activities merged from ${files.length} files)`);
    } catch (e) {
      console.error('Lỗi lưu importedActivities', e);
      alert(t('importError'));
    }

    // Reset input
    e.target.value = null;
  };

  const selectAll = () => {
    setParticipants(prev => {
      const newState = { ...prev };
      filteredMembers.forEach(member => {
        const uniqueId = member.id ? member.id.toString() : `${member.firstname}_${member.lastname}`;
        newState[uniqueId] = member;
      });
      return newState;
    });
  };

  const deselectAll = () => {
    setParticipants(prev => {
      const newState = { ...prev };
      filteredMembers.forEach(member => {
        const uniqueId = member.id ? member.id.toString() : `${member.firstname}_${member.lastname}`;
        delete newState[uniqueId];
      });
      return newState;
    });
  };

  // Lọc danh sách thành viên theo từ khóa tìm kiếm
  const filteredMembers = members.filter(m => {
    const fullName = `${m.firstname} ${m.lastname}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Đếm số lượng tham gia
  const participantCount = Object.keys(participants).length;

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <Target size={20} className="sidebar__icon" />
        <h2 className="sidebar__title">{t('challengeGroup')}</h2>
      </div>

      <div className="sidebar__content">
        <div className="sidebar__section">
          <label className="sidebar__label">
            <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t('selectGroup')}
          </label>
          <select 
            className="sidebar__select"
            value={selectedClubId}
            onChange={(e) => {
              setSelectedClubId(e.target.value);
              setParticipants({}); // Reset danh sách chọn khi đổi nhóm
            }}
          >
            <option value="">{t('selectGroup')}</option>
            {clubs.map(club => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>

        {selectedClubId && (
          <div className="sidebar__section sidebar__members-section">
            <div className="sidebar__search-box">
              <Search size={14} className="sidebar__search-icon" />
              <input
                type="text"
                className="sidebar__search-input"
                placeholder={t('searchMembers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="sidebar__members-list">
              {loadingMembers ? (
                <div className="sidebar__msg">{t('loadingMembers')}</div>
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member) => {
                  // Strava Club Members API often doesn't return athlete 'id'
                  const uniqueId = member.id ? member.id.toString() : `${member.firstname}_${member.lastname}`;
                  const isSelected = !!participants[uniqueId];
                  
                  return (
                    <div 
                      key={uniqueId} 
                      className={`sidebar__member-item ${isSelected ? 'sidebar__member-item--selected' : ''}`}
                      onClick={() => toggleParticipant(uniqueId, member)}
                    >
                      <div className="sidebar__member-info">
                        {member.profile_medium ? (
                          <img src={member.profile_medium} alt="avatar" className="sidebar__member-avatar" />
                        ) : (
                          <div className="sidebar__member-avatar sidebar__member-avatar--placeholder">
                            {(member.firstname || '?')[0]}
                          </div>
                        )}
                        <span className="sidebar__member-name">
                          {member.firstname} {member.lastname}
                        </span>
                      </div>
                      <div className={`sidebar__checkbox ${isSelected ? 'sidebar__checkbox--active' : ''}`}>
                        {isSelected && <Check size={12} color="#00A3A6" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="sidebar__msg">{t('noMembersFound')}</div>
              )}
            </div>

            {filteredMembers.length > 0 && (
              <div className="sidebar__members-actions">
                <button className="sidebar__btn-action" onClick={selectAll}>
                  {t('selectAll')}
                </button>
                <button className="sidebar__btn-action" onClick={deselectAll}>
                  {t('deselectAll')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__stats" style={{ color: '#002D54', fontWeight: 600 }}>
          <span style={{ color: '#002D54' }}>{t('participants')}:</span>
          <strong style={{ color: '#002D54' }}>{participantCount}</strong>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <input
              type="checkbox"
              id="allowEditOthers"
              checked={allowEditOthers}
              onChange={(e) => setAllowEditOthers(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
            />
            <label htmlFor="allowEditOthers" style={{ fontSize: '12px', color: '#002D54', cursor: 'pointer', fontWeight: 500, lineHeight: 1.3 }}>
              Cho phép mọi runner tự sửa mục tiêu / tiền phạt của người khác
            </label>
          </div>
          <button className="btn btn--primary sidebar__btn-save" onClick={handleSave}>
            <Save size={16} style={{ marginRight: 6 }} />
            {savedMessage ? t('challengeSaved') : t('saveChallenge')}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <label className="btn btn--secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '10px 8px', background: 'rgba(0, 45, 84, 0.05)', color: '#002D54', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
              <Upload size={16} style={{ marginRight: 6 }} />
              {t('selectFile')}
              <input type="file" accept=".csv" multiple onChange={handleCsvUpload} style={{ display: 'none' }} />
            </label>
            <label className="btn btn--secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '10px 8px', background: 'rgba(0, 45, 84, 0.05)', color: '#002D54', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
              <Upload size={16} style={{ marginRight: 6 }} />
              {t('selectFolder')}
              <input type="file" webkitdirectory="true" onChange={handleCsvUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
}
