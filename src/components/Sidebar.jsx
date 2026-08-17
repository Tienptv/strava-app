import { useState, useEffect } from 'react';
import { Target, Users, Search, Check, Save, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { useLang } from '../i18n/LangContext';

export default function Sidebar({ apiFetch }) {
  const { t } = useLang();
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State quản lý challenge participants: { [athleteId]: true/false }
  const [participants, setParticipants] = useState({});

  useEffect(() => {
    // Load saved config on mount
    apiFetch('/challenge/config')
      .then(data => {
        if (data.clubId) setSelectedClubId(data.clubId);
        if (data.participants) setParticipants(data.participants);
      })
      .catch(err => console.error('Lỗi tải config:', err));
  }, [apiFetch]);

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
      await apiFetch('/challenge/config', {
        method: 'POST',
        body: JSON.stringify({
          clubId: selectedClubId,
          participants: participants
        })
      });
      window.dispatchEvent(new Event('challengeUpdated'));
      
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error('Lỗi lưu config:', err);
      alert('Không thể lưu cấu hình, vui lòng thử lại.');
    }
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function(results) {
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
          
          if (row.Athlete && row.Athlete.includes('/athletes/')) {
            athleteId = parseInt(row.Athlete.replace('/athletes/', ''), 10);
            athleteName = row.Name || '';
          }

          let nameParts = athleteName.trim().split(' ');
          let lastname = nameParts.length > 1 ? nameParts.pop() : '';
          let firstname = nameParts.join(' ');

          let dateStr = row.Date || '';
          if (dateStr.includes('/')) {
             let dParts = dateStr.split('/');
             if (dParts.length === 3) {
                if (dParts[0].length === 4) {
                   dateStr = `${dParts[0]}/${dParts[1]}/${dParts[2]}`;
                } else {
                   dateStr = `${dParts[1]}/${dParts[0]}/${dParts[2]}`;
                }
             }
          } else {
             dateStr = dateStr.replace(/([+-]\d{2})$/, '$1:00');
          }
          let startDate = new Date(dateStr);

          let localIsoStr = null;
          if (!isNaN(startDate.getTime())) {
            if (dateStr.includes('T')) {
               localIsoStr = dateStr.substring(0, 19) + 'Z';
            } else {
               localIsoStr = startDate.getFullYear() + '-' + 
                 String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(startDate.getDate()).padStart(2, '0') + 'T' + 
                 String(startDate.getHours()).padStart(2, '0') + ':' + 
                 String(startDate.getMinutes()).padStart(2, '0') + ':' + 
                 String(startDate.getSeconds()).padStart(2, '0') + 'Z';
            }
          }

          return {
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

        let existingActivities = [];
        try {
          const importedData = await apiFetch('/challenge/imported').catch(() => []);
          if (Array.isArray(importedData)) {
            existingActivities = importedData;
          }
        } catch (e) {
          console.error('Lỗi khi đọc importedActivities', e);
        }

        const allMap = new Map();
        const getActivityKey = (act) => {
           const d = act.start_date_local || '';
           const t = act.moving_time || 0;
           const dist = act.distance || 0;
           const name = `${act.athlete?.firstname || ''}_${act.athlete?.lastname || ''}`;
           return `${name}_${d}_${t}_${dist}`;
        };

        existingActivities.forEach(act => allMap.set(getActivityKey(act), act));
        importedActivities.forEach(act => allMap.set(getActivityKey(act), act));

        const finalActivities = Array.from(allMap.values());
        
        try {
          await apiFetch('/challenge/imported', {
            method: 'POST',
            body: JSON.stringify(finalActivities)
          });
          window.dispatchEvent(new Event('challengeUpdated'));
          alert(t('importSuccess') + ` (${importedActivities.length} activities merged)`);
        } catch (e) {
          console.error('Lỗi lưu importedActivities', e);
          alert(t('importError'));
        }
      },
      error: function() {
        alert(t('importError'));
      }
    });
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
                        {isSelected && <Check size={12} color="white" />}
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
        <div className="sidebar__stats">
          <span>{t('participants')}:</span>
          <strong>{participantCount}</strong>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <button className="btn btn--primary sidebar__btn-save" onClick={handleSave}>
            <Save size={16} style={{ marginRight: 6 }} />
            {savedMessage ? t('challengeSaved') : t('saveChallenge')}
          </button>

          <label className="btn btn--secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '10px 16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
            <Upload size={16} style={{ marginRight: 6 }} />
            {t('importCsv')}
            <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
    </aside>
  );
}
