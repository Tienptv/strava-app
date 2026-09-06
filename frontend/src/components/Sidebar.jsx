import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Users, Search, Check, Save, Upload, Shield, Camera, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import Swal from 'sweetalert2';
import { useLang } from '../i18n/LangContext';
import { showScreenshotModal } from '../utils/screenshot';
import { APP_VERSION } from '../config/version';

export default function Sidebar({ apiFetch, currentMonth, currentYear, isAdmin, isSuperAdmin, permissions }) {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stravaCookie, setStravaCookie] = useState(sessionStorage.getItem('stravaCookie') || '');
  const [syncLimit, setSyncLimit] = useState(20);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

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

    const handleConfigChange = (e) => {
      if (e.detail && e.detail.allowEditOthers !== undefined) {
        setAllowEditOthers(e.detail.allowEditOthers);
      }
    };
    window.addEventListener('configChanged', handleConfigChange);
    return () => window.removeEventListener('configChanged', handleConfigChange);
  }, [apiFetch, activeMonth, activeYear]);

  const [savedMessage, setSavedMessage] = useState(false);

  // Lấy danh sách clubs của user khi Sidebar render
  useEffect(() => {
    apiFetch('/clubs')
      .then(data => setClubs(data || []))
      .catch(err => console.error('Lỗi tải clubs:', err));

    // Tự động kiểm tra cookie đã lưu từ trước
    apiFetch('/strava/cookie')
      .then(res => {
        if (res && res.hasCookie && res.cookie) {
          setStravaCookie(res.cookie);
          sessionStorage.setItem('stravaCookie', res.cookie);
        }
      })
      .catch(() => {});
  }, [apiFetch]);

  // Helper: lưu cookie lên server để scraper có thể inject vào Puppeteer
  const saveCookieToServer = async (cookieValue) => {
    if (!cookieValue || cookieValue.length < 10) return;
    try {
      await apiFetch('/strava/cookie', {
        method: 'POST',
        body: JSON.stringify({ cookie: cookieValue })
      });
    } catch (_) {}
  };

  useEffect(() => {
    const handleCookieUpdated = (e) => {
      if (e.detail) {
        setStravaCookie(e.detail);
        sessionStorage.setItem('stravaCookie', e.detail);
        // Tự động lưu vào server khi nhận cookie từ OAuth login
        saveCookieToServer(e.detail);
      }
    };
    window.addEventListener('cookieUpdated', handleCookieUpdated);
    return () => window.removeEventListener('cookieUpdated', handleCookieUpdated);
  }, [apiFetch]);

  // Tự động kiểm tra bản cập nhật mới trong nền
  useEffect(() => {
    apiFetch('/app/check-update')
      .then(data => {
        if (data && data.hasUpdate) {
          setUpdateInfo(data);
        }
      })
      .catch(() => {});
  }, [apiFetch]);

  const handleCheckUpdate = async (isManual = true) => {
    setCheckingUpdate(true);
    if (isManual) {
      Swal.fire({
        title: lang === 'en' ? 'Checking for Updates...' : 'Đang kiểm tra cập nhật...',
        text: lang === 'en' 
          ? 'Connecting to Render Cloud...' 
          : 'Đang kết nối tới máy chủ Render Cloud...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    }
    try {
      const data = await apiFetch('/app/check-update');
      if (data && data.hasUpdate) {
        setUpdateInfo(data);
        const result = await Swal.fire({
          title: lang === 'en' ? `🚀 New Update: v${data.latestVersion}` : `🚀 Bản Cập Nhật Mới: v${data.latestVersion}`,
          html: `
            <div style="text-align: left; font-size: 0.88rem; color: #334155; line-height: 1.6;">
              <p style="margin-bottom: 4px; font-weight: 700; color: #002D54; font-size: 1rem;">
                ${(lang === 'en' && data.title_en) ? data.title_en : (data.title || (lang === 'en' ? 'New features & improvements' : 'Cập nhật tính năng & giao diện mới'))}
              </p>
              ${data.releaseDate ? `<p style="font-size: 0.8rem; color: #64748b; margin-bottom: 12px;">${lang === 'en' ? 'Release date:' : 'Ngày phát hành:'} <b>${data.releaseDate}</b> (${lang === 'en' ? 'Current version:' : 'Bản hiện tại:'} v${data.currentVersion})</p>` : ''}
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
                <p style="font-weight: 700; margin: 0 0 8px; color: #00A3A6;">${lang === 'en' ? '✨ Update details:' : '✨ Nội dung cập nhật:'}</p>
                <ul style="margin: 0; padding-left: 18px; color: #334155;">
                  ${((lang === 'en' && data.changelog_en) ? data.changelog_en : (data.changelog || [])).map(item => `<li style="margin-bottom: 6px;">${item}</li>`).join('')}
                </ul>
              </div>
              <div style="padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                <p style="font-size: 0.82rem; color: #16a34a; margin: 0; font-weight: 600;">
                  🔒 <b>${lang === 'en' ? '100% Data Preservation:' : 'Bảo toàn dữ liệu 100%:'}</b> ${lang === 'en' ? 'The update only upgrades source code and will never affect Strava Cookies or files saved in your Storage folder.' : 'Quá trình cập nhật chỉ nâng cấp mã nguồn, tuyệt đối không ảnh hưởng đến Cookie Strava hoặc các tệp đã lưu trong thư mục Storage của bạn.'}
                </p>
              </div>
            </div>
          `,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: lang === 'en' ? '⚡ Update Now (~ 3 - 5 MB)' : '⚡ Cập nhật ngay (~ 3 - 5 MB)',
          cancelButtonText: lang === 'en' ? 'Later' : 'Để sau',
          confirmButtonColor: '#00A3A6',
          cancelButtonColor: '#94a3b8'
        });

        if (result.isConfirmed) {
          Swal.fire({
            title: lang === 'en' ? '⏳ Downloading & Applying Update...' : '⏳ Đang tải và áp dụng bản cập nhật...',
            html: lang === 'en' ? 'Please wait a few seconds. The app will refresh automatically once completed.' : 'Vui lòng đợi giây lát. Ứng dụng sẽ tự động làm mới giao diện khi cập nhật xong.',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          const applyRes = await apiFetch('/app/apply-update', { method: 'POST' });
          if (applyRes.success) {
            await Swal.fire({
              title: lang === 'en' ? '🎉 Updated Successfully!' : '🎉 Cập nhật thành công!',
              text: lang === 'en' ? `Application has been upgraded to v${data.latestVersion}. Reloading...` : `Ứng dụng đã được nâng cấp lên phiên bản v${data.latestVersion}. Đang làm mới...`,
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
            window.location.reload();
          } else {
            Swal.fire(lang === 'en' ? 'Update Failed' : 'Cập nhật thất bại', applyRes.error || 'Unknown error', 'error');
          }
        }
      } else {
        if (isManual) {
          if (data && data.notDeployedYet) {
            Swal.fire({
              title: lang === 'en' ? 'Cloud Not Deployed' : 'Cloud chưa có bản mới',
              text: lang === 'en'
                ? 'Render Cloud has not been updated on GitHub yet. Please run "git push" to deploy the new version.'
                : 'Mã nguồn mới chưa được đẩy lên GitHub nên máy chủ Render Cloud chưa cập nhật. Hãy thực hiện git push để Render Cloud tự động triển khai.',
              icon: 'info',
              confirmButtonColor: '#00A3A6'
            });
          } else if (data && data.cloudConnected === false) {
            Swal.fire({
              title: lang === 'en' ? 'Cloud Server Busy' : 'Máy chủ Cloud chưa phản hồi',
              text: lang === 'en' 
                ? 'Could not connect to Render Cloud. It may be waking up, please try again in 30 seconds.' 
                : 'Không thể kết nối đến máy chủ Cloud (Render Cloud có thể đang khởi động lại). Vui lòng thử lại sau 30 giây.',
              icon: 'warning',
              confirmButtonColor: '#f59e0b'
            });
          } else {
            Swal.fire({
              title: lang === 'en' ? 'Up to Date' : 'Đã là bản mới nhất',
              text: lang === 'en' 
                ? `You are using the latest version (v${APP_VERSION}).` 
                : `Bạn đang sử dụng phiên bản mới nhất (v${APP_VERSION}).`,
              icon: 'success',
              confirmButtonColor: '#00A3A6'
            });
          }
        }
      }
    } catch (err) {
      console.error('Lỗi check update:', err);
      if (isManual) {
        Swal.fire(lang === 'en' ? 'Check Failed' : 'Kiểm tra thất bại', err.message, 'error');
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

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
      Swal.fire(t('saveConfigError'), '', 'error');
    }
  };

  const handleCsvUpload = async (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (!files.length) {
       Swal.fire(t('noCsvFound'), '', 'warning');
       return;
    }

    let allImportedActivities = [];

    const parseFile = (file) => {
      return new Promise((resolve) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim().replace(/^["']|["']$/g, '').trim(),
          complete: function(results) {
            const data = results.data;
            const importedActivities = data.map(row => {
              // Bỏ qua các hoạt động ẩn (nếu có cột chỉ định)
              const isPrivate = String(row.private || row.Private || 'false').toLowerCase() === 'true';
              const hideFromHome = String(row.hide_from_home || row.Hide_from_home || 'false').toLowerCase() === 'true';
              const visibility = row.visibility || row.Visibility;
              if (isPrivate || hideFromHome || (visibility && String(visibility).toLowerCase() !== 'everyone')) {
                 return null;
              }

              const rawDistStr = String(row.Distance || 0).toLowerCase();
              const isMiles = rawDistStr.includes('mi') || rawDistStr.includes('mile') || rawDistStr.includes('dặm');
              let distNum = parseFloat(rawDistStr.replace(',', '.').replace(/[^\d.-]/g, ''));
              if (!isNaN(distNum) && isMiles) {
                distNum = distNum * 1.609344;
              }
              let dist = isNaN(distNum) ? 0 : Math.round(distNum * 1000);
              
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

              if (dist <= 0 || !localIsoStr) {
                return null;
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
            resolve(importedActivities.filter(Boolean));
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

    // KHÔNG fetch existingActivities nữa, backend sẽ lo việc xóa dữ liệu trùng ngày và merge
    let existingActivities = [];

    const normalize = (n) => (n || '').trim().toLowerCase().replace(/[\.\s]/g, '');
    const uniqueMap = new Map();
    const getCompKey = (act) => {
       const d = (act.start_date_local || '').substring(0, 16); // Chuẩn hóa tới phút YYYY-MM-DDTHH:mm
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

    // Chỉ update các hoạt động từ tháng 8/2026 trở đi vào importedActivities (các tháng 1-7 đã lưu riêng trong historical)
    const augImportedActivities = allImportedActivities.filter(a => !a.start_date_local || a.start_date_local >= '2026-08-01T00:00:00');
    
    // Chỉ deduplicate nội bộ các file vừa upload
    augImportedActivities.forEach(addRecord);

    const finalSet = new Set(uniqueMap.values());
    const finalActivities = Array.from(finalSet).filter(a => !a.start_date_local || a.start_date_local >= '2026-08-01T00:00:00');
    
    try {
      await apiFetch('/challenge/imported?replaceByDate=true', {
        method: 'POST',
        body: JSON.stringify(finalActivities)
      });
      window.dispatchEvent(new Event('challengeUpdated'));
      Swal.fire(t('importSuccess'), lang === 'en' ? `${allImportedActivities.length} activities merged from ${files.length} files` : `Đã hợp nhất ${allImportedActivities.length} hoạt động từ ${files.length} tệp`, 'success');
    } catch (e) {
      console.error('Lỗi lưu importedActivities', e);
      Swal.fire(t('importError'), '', 'error');
    }

    // Reset input
    e.target.value = null;
  };

  const selectAll = () => {
    setParticipants(prev => {
      const newState = { ...prev };
      filteredMembers.forEach(member => {
        const uniqueId = member.matchKey || (member.id ? member.id.toString() : `${member.firstname}_${member.lastname}`);
        newState[uniqueId] = member;
      });
      return newState;
    });
  };

  const deselectAll = () => {
    setParticipants(prev => {
      const newState = { ...prev };
      filteredMembers.forEach(member => {
        const uniqueId = member.matchKey || (member.id ? member.id.toString() : `${member.firstname}_${member.lastname}`);
        delete newState[uniqueId];
      });
      return newState;
    });
  };

  // Lọc danh sách thành viên theo từ khóa tìm kiếm và khử trùng lặp triệt để
  const uniqueMembers = useMemo(() => {
    const dedup = [];
    const seenIds = new Set();
    const seenNames = new Set();
    const seenKeys = new Set();

    for (const m of (members || [])) {
      if (!m) continue;
      const id = (m.id || m.athleteId || '').toString().trim();
      const fn = (m.firstname || '').trim();
      const ln = (m.lastname || '').trim();
      const fullName = (m.name || (fn ? `${fn} ${ln}`.trim() : '')).trim().toLowerCase();
      const rawKey = (m.matchKey || '').replace(/\s+_/g, '_').replace(/_\s+/g, '_').trim();
      const normKey = rawKey.replace(/\.$/, '').toLowerCase();

      let prev = null;
      if (id && seenIds.has(id)) {
        prev = dedup.find(x => (x.id || x.athleteId || '').toString().trim() === id);
      } else if (fullName && seenNames.has(fullName)) {
        prev = dedup.find(x => {
          const xfn = (x.firstname || '').trim();
          const xln = (x.lastname || '').trim();
          const xName = (x.name || (xfn ? `${xfn} ${xln}`.trim() : '')).trim().toLowerCase();
          return xName === fullName;
        });
      } else if (normKey && seenKeys.has(normKey)) {
        prev = dedup.find(x => {
          const k = (x.matchKey || '').replace(/\s+_/g, '_').replace(/_\s+/g, '_').replace(/\.$/, '').trim().toLowerCase();
          return k === normKey;
        });
      }

      if (prev) {
        if (!prev.profile_medium && m.profile_medium) prev.profile_medium = m.profile_medium;
        if (!prev.profile && m.profile) prev.profile = m.profile;
        if ((!prev.id || prev.id === null) && (m.id || m.athleteId)) {
          prev.id = m.id || m.athleteId;
          prev.athleteId = prev.id;
        }
        if ((!prev.name || prev.name === prev.matchKey) && m.name) prev.name = m.name;
        if (!prev.firstname && m.firstname) prev.firstname = m.firstname;
        if (!prev.lastname && m.lastname) prev.lastname = m.lastname;
        continue;
      }

      if (id) seenIds.add(id);
      if (fullName) seenNames.add(fullName);
      if (normKey) seenKeys.add(normKey);
      dedup.push({ ...m });
    }

    return dedup;
  }, [members]);

  const filteredMembers = useMemo(() => {
    return uniqueMembers.filter(m => {
      const fn = (m.firstname || '').trim();
      const ln = (m.lastname || '').trim();
      const fullName = (m.name || `${fn} ${ln}`.trim()).toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    });
  }, [uniqueMembers, searchQuery]);

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
                  const uniqueId = member.matchKey || (member.id ? member.id.toString() : `${member.firstname}_${member.lastname}`);
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
                          {member.name || `${member.firstname || ''} ${member.lastname || ''}`.trim()}
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
            
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="sidebar__stats" style={{ color: '#002D54', fontWeight: 600, padding: 0 }}>
                <span style={{ color: '#002D54' }}>{t('participants')}:</span>
                <strong style={{ color: '#002D54' }}>{participantCount}</strong>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <input
                  type="checkbox"
                  id="allowEditOthers"
                  checked={allowEditOthers}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAllowEditOthers(checked);
                    window.dispatchEvent(new CustomEvent('configChanged', { detail: { allowEditOthers: checked } }));
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                />
                <label htmlFor="allowEditOthers" style={{ fontSize: '12px', color: '#002D54', cursor: 'pointer', fontWeight: 500, lineHeight: 1.3 }}>
                  {t('allowEditOthers')}
                </label>
              </div>
              
              <button className="btn btn--primary sidebar__btn-save" onClick={handleSave}>
                <Save size={16} style={{ marginRight: 6 }} />
                {savedMessage ? t('challengeSaved') : t('saveChallenge')}
              </button>
              
              <button 
                className="btn btn--secondary" 
                onClick={() => navigate('/administer')}
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', 
                  padding: '10px 8px', background: 'rgba(0, 163, 166, 0.08)', color: 'var(--primary-navy)', 
                  border: '1px solid var(--accent)', borderRadius: '6px', fontSize: '13px', 
                  fontWeight: 'bold', marginTop: '4px', gap: '6px'
                }}
              >
                <Shield size={16} color="var(--accent)" />
                {t('adminPanelNav')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="sidebar__footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          {/* Nút Upload CSV/Folder - Giới hạn bởi quyền importActivities */}
          {(isSuperAdmin || !permissions || permissions.importActivities !== false) && (
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
          )}

          {/* Cookie & Đồng bộ Strava tự động - Giới hạn bởi quyền syncStrava */}
          {(isSuperAdmin || !permissions || permissions.syncStrava !== false) && (
            <>
              <div style={{ marginTop: '8px' }}>
                <button 
                  className="btn btn--secondary"
                  onClick={async () => {
                    try {
                      const res = await apiFetch('/strava/cookie');
                      if (res.hasCookie) {
                        setStravaCookie(res.cookie);
                        sessionStorage.setItem('stravaCookie', res.cookie);
                        Swal.fire(t('cookieReady'), '', 'success');
                      } else {
                        setStravaCookie('');
                        sessionStorage.removeItem('stravaCookie');
                        
                        const confirmRes = await Swal.fire({
                          title: t('openChromePrompt') || (lang === 'en' ? 'Open Chrome to Login?' : 'Mở Chrome để đăng nhập Strava?'),
                          text: lang === 'en' ? 'Chrome will open for you to login to Strava and automatically retrieve cookies.' : 'Hệ thống sẽ mở Google Chrome để bạn đăng nhập Strava và tự động lấy cookie.',
                          icon: 'question',
                          showCancelButton: true,
                          confirmButtonText: lang === 'en' ? 'OK' : 'Đồng ý',
                          cancelButtonText: lang === 'en' ? 'Cancel' : 'Hủy bỏ'
                        });
                        
                        if (confirmRes.isConfirmed) {
                          Swal.fire({
                            title: lang === 'en' ? '⏳ Opening Google Chrome...' : '⏳ Đang mở Google Chrome...',
                            text: lang === 'en' ? 'Please login on the Chrome window. It will close automatically once done.' : 'Vui lòng đăng nhập tài khoản trên cửa sổ Chrome vừa mở. Đăng nhập xong cửa sổ sẽ tự đóng!',
                            allowOutsideClick: false,
                            showConfirmButton: false,
                            showCancelButton: true,
                            cancelButtonText: lang === 'en' ? 'Dismiss' : 'Đóng thông báo',
                            didOpen: () => {
                              Swal.showLoading();
                            }
                          });

                          const loginRes = await apiFetch('/strava/login', { method: 'POST' });
                          if (loginRes.success) {
                            setStravaCookie(loginRes.cookie);
                            sessionStorage.setItem('stravaCookie', loginRes.cookie);
                            Swal.fire(t('cookieLoginSuccess'), '', 'success');
                          } else {
                            Swal.fire(t('errorPrefix'), loginRes.error || 'Unknown', 'error');
                          }
                        }
                      }
                    } catch (e) {
                      Swal.fire(t('errorPrefix'), e.message, 'error');
                    }
                  }}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', 
                    padding: '10px 8px', background: stravaCookie ? '#e8f5e9' : '#fff3e0', 
                    color: '#002D54', 
                    border: `1px solid ${stravaCookie ? '#66bb6a' : '#ffb74d'}`, borderRadius: '6px', fontSize: '13px', 
                    fontWeight: 'bold', width: '100%', marginBottom: '6px'
                  }}
                >
                  <svg style={{ marginRight: 6 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  {stravaCookie ? `🟢 ${t('stravaCookieOk')}` : `🔑 ${t('stravaLogin')}`}
                </button>
                <input 
                  type="text" 
                  placeholder={t('importCsvPlaceholder')} 
                  value={stravaCookie}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStravaCookie(val);
                    sessionStorage.setItem('stravaCookie', val);
                  }}
                  onBlur={(e) => {
                    // Lưu lên server khi user rời khỏi ô text (để scraper dùng được)
                    const val = e.target.value.trim();
                    if (val.length > 10) saveCookieToServer(val);
                  }}
                  style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="number" 
                  value={syncLimit}
                  onChange={(e) => setSyncLimit(e.target.value)}
                  title={t('fetchLimitTooltip')}
                  style={{ width: '60px', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', textAlign: 'center', fontWeight: 'bold', color: '#002D54', background: '#fff' }}
                  min="1"
                />
                <button 
                  className="btn btn--secondary"
                  onClick={async () => {
                    if (!selectedClubId) {
                      Swal.fire(t('selectGroupFirst'), '', 'warning');
                      return;
                    }
                    const cookieToUse = stravaCookie || '';

                    // 1. Hiển thị loading modal rõ ràng từng bước
                    Swal.fire({
                      title: lang === 'en' ? '⏳ Auto Syncing Strava & Cloud...' : '⏳ Đang tự động cào & đồng bộ...',
                      html: `
                        <div style="text-align: left; font-size: 0.88rem; color: #334155; line-height: 1.6;">
                          <p style="margin-bottom: 6px;"><b>1.</b> ${lang === 'en' ? `Scraping activities from Strava (${syncLimit} activities)...` : `Đang cào dữ liệu từ Strava (${syncLimit} hoạt động)...`}</p>
                          <p style="margin-bottom: 6px;"><b>2.</b> ${lang === 'en' ? 'Automatically pushing data to Render Cloud...' : 'Tự động đẩy dữ liệu lên Render Cloud...'}</p>
                          <p style="color: #64748b; font-size: 0.8rem; margin: 8px 0 0;">${lang === 'en' ? 'Please wait a moment, window will update when done.' : 'Vui lòng đợi giây lát, cửa sổ sẽ cập nhật khi hoàn tất.'}</p>
                        </div>
                      `,
                      allowOutsideClick: false,
                      didOpen: () => {
                        Swal.showLoading();
                      }
                    });

                    try {
                      const athlete = JSON.parse(localStorage.getItem('athlete') || '{}');
                      const subAdminName = athlete.firstname ? `${athlete.firstname} ${athlete.lastname || ''}`.trim() : 'Admin (Desktop App)';

                      const data = await apiFetch(`/clubs/${selectedClubId}/auto-sync-scrape`, { 
                        method: 'POST',
                        body: JSON.stringify({ 
                          cookie: cookieToUse || undefined, 
                          limit: Number(syncLimit),
                          subAdminName 
                        })
                      });

                      if (data.success) {
                        if (data.scraped_count === 0) {
                          await Swal.fire({
                            title: lang === 'en' ? 'No New Activities' : 'Không có hoạt động mới',
                            text: lang === 'en' ? 'No new running activities found on Strava.' : 'Không tìm thấy hoạt động chạy bộ mới nào trên Strava.',
                            icon: 'info',
                            confirmButtonColor: '#0284c7',
                            confirmButtonText: lang === 'en' ? 'OK' : 'Đã hiểu'
                          });
                          return;
                        }

                        // Kiểm tra kết quả Cloud Sync để thông báo với độ tin cậy cao
                        if (data.cloudSynced) {
                          await Swal.fire({
                            title: lang === 'en' ? '🎉 Sync Completed!' : '🎉 Đồng bộ hoàn tất!',
                            html: `
                              <div style="text-align: left; font-size: 0.88rem; color: #334155; line-height: 1.6;">
                                <div style="padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 10px;">
                                  <p style="color: #16a34a; font-weight: 700; margin: 0 0 4px;">${lang === 'en' ? '✅ 1. Strava Data (Local Machine):' : '✅ 1. Dữ liệu Strava (Máy tính Local):'}</p>
                                  <p style="margin: 0;">• ${lang === 'en' ? `Successfully scraped <b>${data.scraped_count}</b> new run activities.` : `Cào thành công <b>${data.scraped_count}</b> hoạt động chạy bộ mới.`}</p>
                                  <p style="margin: 0;">• ${lang === 'en' ? `Total local activities: <b>${data.count}</b> items.` : `Tổng hoạt động trong máy: <b>${data.count}</b> mục.`}</p>
                                  ${data.filename ? `<p style="margin: 0; font-size: 0.78rem; color: #64748b;">• ${lang === 'en' ? 'File saved:' : 'Tệp lưu:'} <code>${data.filename}</code></p>` : ''}
                                </div>
                                <div style="padding: 10px 14px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
                                  <p style="color: #0284c7; font-weight: 700; margin: 0 0 4px;">${lang === 'en' ? '☁️ 2. Render Cloud (Web Server):' : '☁️ 2. Render Cloud (Web Server):'}</p>
                                  <p style="margin: 0; color: #0369a1; font-weight: 600;">• ${lang === 'en' ? 'Automatically synced to Render Cloud successfully!' : 'Đã tự động đồng bộ lên Render Cloud thành công!'}</p>
                                  <p style="margin: 4px 0 0; font-size: 0.8rem; color: #475569;">${lang === 'en' ? 'All club members and Sub-Admins on the web can now view the latest data.' : 'Toàn bộ thành viên CLB và Sub-Admin trên web hiện đã xem được dữ liệu mới nhất.'}</p>
                                </div>
                              </div>
                            `,
                            icon: 'success',
                            confirmButtonColor: '#16a34a',
                            confirmButtonText: lang === 'en' ? 'OK' : 'Đã hiểu'
                          });
                          window.location.reload();
                        } else {
                          await Swal.fire({
                            title: lang === 'en' ? '⚠️ Saved Locally (Cloud Pending)' : '⚠️ Đã lưu vào máy (Chưa lên Cloud)',
                            html: `
                              <div style="text-align: left; font-size: 0.88rem; color: #334155; line-height: 1.6;">
                                <div style="padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 10px;">
                                  <p style="color: #16a34a; font-weight: 700; margin: 0 0 4px;">${lang === 'en' ? '✅ 1. Strava Data (Local Machine):' : '✅ 1. Dữ liệu Strava (Máy tính Local):'}</p>
                                  <p style="margin: 0;">• ${lang === 'en' ? `Scraped and saved <b>${data.scraped_count}</b> activities to local computer.` : `Đã cào và lưu an toàn <b>${data.scraped_count}</b> hoạt động vào máy tính.`}</p>
                                  <p style="margin: 0;">• ${lang === 'en' ? `Total local activities: <b>${data.count}</b> items.` : `Tổng hoạt động trong máy: <b>${data.count}</b> mục.`}</p>
                                </div>
                                <div style="padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
                                  <p style="color: #d97706; font-weight: 700; margin: 0 0 4px;">${lang === 'en' ? '⚠️ 2. Render Cloud (Connection Failed):' : '⚠️ 2. Render Cloud (Chưa kết nối được):'}</p>
                                  <p style="margin: 0; color: #b45309;">• ${lang === 'en' ? 'Error details:' : 'Chi tiết lỗi:'} <i>${data.cloudError || (lang === 'en' ? 'Could not connect to Cloud server (timeout or starting up)' : 'Không thể kết nối đến máy chủ Cloud (timeout hoặc đang khởi động)')}</i></p>
                                  <p style="margin: 6px 0 0; font-size: 0.8rem; color: #78350f;">💡 <b>${lang === 'en' ? 'Tip:' : 'Gợi ý:'}</b> ${lang === 'en' ? 'Data on your machine is 100% safe. You can go to <b>Administer ➡️ Tab 4</b> and click <b>Push to Render Cloud</b> to push again later.' : 'Dữ liệu trên máy của bạn đã được bảo toàn 100%. Bạn có thể vào <b>Quản trị ➡️ Tab 4</b> bấm <b>Push to Render Cloud</b> để đẩy lại sau.'}</p>
                                </div>
                              </div>
                            `,
                            icon: 'warning',
                            confirmButtonColor: '#f59e0b',
                            confirmButtonText: lang === 'en' ? 'OK' : 'Đã hiểu'
                          });
                          window.location.reload();
                        }
                      } else {
                        if (data.error && (data.error.includes('Cookie') || data.error.includes('Phiên đăng nhập đã hết hạn'))) {
                          setStravaCookie('');
                          sessionStorage.removeItem('stravaCookie');
                          
                          const confirmSync = await Swal.fire({
                            title: t('sessionExpired'),
                            text: t('openChromePrompt'),
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: lang === 'en' ? 'Open Chrome' : 'Mở Chrome',
                            cancelButtonText: lang === 'en' ? 'Close' : 'Đóng'
                          });
                          
                          if (confirmSync.isConfirmed) {
                            Swal.fire({
                              title: lang === 'en' ? '⏳ Opening Google Chrome...' : '⏳ Đang mở Google Chrome...',
                              text: lang === 'en' ? 'Please login on the Chrome window. It will close automatically once done.' : 'Vui lòng đăng nhập tài khoản trên cửa sổ Chrome vừa mở. Đăng nhập xong cửa sổ sẽ tự đóng!',
                              allowOutsideClick: false,
                              showConfirmButton: false,
                              showCancelButton: true,
                              cancelButtonText: lang === 'en' ? 'Dismiss' : 'Đóng thông báo',
                              didOpen: () => {
                                Swal.showLoading();
                              }
                            });

                            const loginRes = await apiFetch('/strava/login', { method: 'POST' });
                            if (loginRes.success) {
                              setStravaCookie(loginRes.cookie);
                              sessionStorage.setItem('stravaCookie', loginRes.cookie);
                              Swal.fire(t('loginSuccessSyncNow'), '', 'success');
                            } else {
                              Swal.fire(t('errorPrefix'), loginRes.error || (lang === 'en' ? 'Unknown error' : 'Không xác định'), 'error');
                            }
                          }
                        } else {
                          Swal.fire(t('syncError'), data.error || (lang === 'en' ? 'Unknown error' : 'Không xác định'), 'error');
                        }
                      }
                    } catch (e) {
                      console.error(e);
                      Swal.fire(t('serverErrorPrefix'), e.message, 'error');
                    }

                  }}
                  style={{ 
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', 
                    padding: '10px 8px', background: '#e3f2fd', color: '#002D54', 
                    border: '1px solid #90caf9', borderRadius: '6px', fontSize: '13px', 
                    fontWeight: 'bold'
                  }}
                  title={lang === 'en' ? 'Scrape Strava activities & auto sync to Render Cloud' : 'Cào dữ liệu Strava và tự động đồng bộ ngay lên Render Cloud'}
                >
                  <svg style={{ marginRight: 6 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                  <span>{t('autoSyncStrava')}</span>
                </button>
              </div>
            </>
          )}
          <div style={{ marginTop: '8px' }}>
            <button 
              className="btn btn--secondary btn-screenshot"
              onClick={() => {
                showScreenshotModal({
                  month: activeMonth,
                  year: activeYear,
                  lang: lang,
                  fileName: `Strava_Challenge_T${activeMonth}_${activeYear}.png`
                });
              }}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer', 
                padding: '10px 8px', 
                background: '#ffffff', 
                color: '#002D54', 
                border: '1px solid #cbd5e1', 
                borderRadius: '6px', 
                fontSize: '13px', 
                fontWeight: 'bold',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease'
              }}
              title={t('screenshotTooltip')}
            >
              <Camera size={16} style={{ marginRight: 6, color: '#00A3A6' }} />
              <span>{t('screenshot') || 'Chụp màn hình'}</span>
            </button>
          </div>

          {/* Version & 1-Click Update Control */}
          <div style={{ 
            marginTop: '10px', 
            paddingTop: '8px', 
            borderTop: '1px solid #e2e8f0', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: '11px' 
          }}>
            <span style={{ color: '#888888', fontStyle: 'italic', userSelect: 'none' }}>
              v{APP_VERSION}
            </span>
            <button
              onClick={() => handleCheckUpdate(true)}
              disabled={checkingUpdate}
              style={{
                background: updateInfo?.hasUpdate ? 'rgba(22, 163, 74, 0.1)' : 'transparent',
                border: updateInfo?.hasUpdate ? '1px solid #bbf7d0' : 'none',
                color: updateInfo?.hasUpdate ? '#16a34a' : 'var(--accent)',
                cursor: checkingUpdate ? 'wait' : 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 6px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              title={lang === 'en' ? 'Check for latest updates from Cloud' : 'Kiểm tra bản cập nhật mới từ Cloud'}
            >
              <RefreshCw size={11} className={checkingUpdate ? 'spin-icon' : ''} style={{ animation: checkingUpdate ? 'spin 1s linear infinite' : 'none' }} />
              {updateInfo?.hasUpdate ? (
                <span style={{ color: '#16a34a', fontWeight: 700 }}>● Có bản v{updateInfo.latestVersion}</span>
              ) : (
                <span>{checkingUpdate ? (lang === 'en' ? 'Checking...' : 'Đang kiểm tra...') : (lang === 'en' ? 'Check Update' : 'Kiểm tra cập nhật')}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
