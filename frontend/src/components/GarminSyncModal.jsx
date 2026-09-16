import React, { useState, useEffect } from 'react';
import { X, Activity, Moon, Heart, BatteryCharging, ShieldAlert, CheckCircle2, UploadCloud, Save } from 'lucide-react';
import Swal from 'sweetalert2';

export default function GarminSyncModal({ isOpen, onClose, athlete, lang = 'en', t, apiFetch, onSyncSuccess }) {
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'import'
  const [sleepHours, setSleepHours] = useState('7.5');
  const [sleepScore, setSleepScore] = useState('80');
  const [restingHeartRate, setRestingHeartRate] = useState('52');
  const [baselineRhr, setBaselineRhr] = useState('52');
  const [hrvStatus, setHrvStatus] = useState('balanced');
  const [bodyBattery, setBodyBattery] = useState('85');
  const [stressLevel, setStressLevel] = useState('22');
  const [loading, setLoading] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const athleteId = athlete?.id ? String(athlete.id) : null;

  // Tải dữ liệu sức khỏe đã lưu gần nhất
  useEffect(() => {
    if (!isOpen || !athleteId || !apiFetch) return;
    apiFetch(`/garmin/health?athleteId=${athleteId}`)
      .then(res => {
        if (res && res.health && res.health.latest) {
          const l = res.health.latest;
          if (l.sleepHours) setSleepHours(String(l.sleepHours));
          if (l.sleepScore) setSleepScore(String(l.sleepScore));
          if (l.restingHeartRate) setRestingHeartRate(String(l.restingHeartRate));
          if (l.baselineRhr) setBaselineRhr(String(l.baselineRhr));
          if (l.hrvStatus) setHrvStatus(l.hrvStatus);
          if (l.bodyBattery) setBodyBattery(String(l.bodyBattery));
          if (l.stressLevel) setStressLevel(String(l.stressLevel));
        }
      })
      .catch(() => {});
  }, [isOpen, athleteId, apiFetch]);

  if (!isOpen) return null;

  // Tính toán sơ bộ điểm sẵn sàng preview
  const numSleepScore = Number(sleepScore) || 75;
  const numSleepHours = Number(sleepHours) || 7.0;
  const numRhr = Number(restingHeartRate) || 52;
  const numBaseRhr = Number(baselineRhr) || 52;
  const rhrDiff = numRhr - numBaseRhr;
  const isFatigued = numSleepScore < 65 || numSleepHours < 6 || rhrDiff >= 5 || hrvStatus === 'low';

  const handleSave = async () => {
    if (!athleteId) {
      Swal.fire({
        icon: 'warning',
        title: lang === 'vi' ? 'Thiếu Athlete ID' : 'Missing Athlete ID',
        text: lang === 'vi' ? 'Không tìm thấy ID thành viên hợp lệ (Rule #6).' : 'Valid athlete ID is required (Rule #6).'
      });
      return;
    }

    setLoading(true);
    try {
      let payload = {};
      if (activeTab === 'import') {
        try {
          payload = JSON.parse(jsonText);
        } catch {
          throw new Error(lang === 'vi' ? 'Tệp JSON không hợp lệ!' : 'Invalid JSON format!');
        }
      } else {
        payload = {
          sleepHours: Number(sleepHours) || 7.0,
          sleepScore: Number(sleepScore) || 75,
          restingHeartRate: Number(restingHeartRate) || 52,
          baselineRhr: Number(baselineRhr) || 52,
          hrvStatus,
          bodyBattery: Number(bodyBattery) || 80,
          stressLevel: Number(stressLevel) || 25,
          source: 'manual_entry'
        };
      }

      const res = await apiFetch('/garmin/sync-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId,
          ...payload
        })
      });

      if (res && res.success) {
        Swal.fire({
          icon: 'success',
          title: t('garminSavedSuccess'),
          text: lang === 'vi' 
            ? 'Hệ chuyên gia Runna đã đồng bộ dữ liệu sinh trắc học và sẵn sàng cân bằng tải giáo án!'
            : 'Runna engine synced your biometrics and is ready for adaptive training adjustments!',
          timer: 2000,
          showConfirmButton: false
        });
        if (onSyncSuccess) onSyncSuccess(res.health);
        onClose();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: lang === 'vi' ? 'Lỗi đồng bộ' : 'Sync Error',
        text: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonText(event.target.result);
      setActiveTab('import');
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div 
        className="garmin-sync-modal-box" 
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '12px',
          maxWidth: '520px',
          width: '94%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0, 45, 84, 0.25)',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #002D54 0%, #00A3A6 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Activity size={20} color="#78BE20" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                {t('garminSyncTitle')}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                {t('garminSyncSubtitle')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '18px 20px', flex: 1 }}>
          {/* Tab Switcher */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setActiveTab('quick')}
              className={`adm-tab-btn ${activeTab === 'quick' ? 'adm-tab-btn-active' : ''}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
            >
              {t('quick10sCheckin')}
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`adm-tab-btn ${activeTab === 'import' ? 'adm-tab-btn-active' : ''}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
            >
              {t('importGarminJson')}
            </button>
          </div>

          {activeTab === 'quick' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Readiness Preview Indicator */}
              <div 
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: isFatigued ? 'rgba(239, 68, 68, 0.08)' : 'rgba(120, 190, 32, 0.1)',
                  border: `1px solid ${isFatigued ? '#ef4444' : '#78BE20'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                {isFatigued ? <ShieldAlert size={22} color="#ef4444" /> : <CheckCircle2 size={22} color="#78BE20" />}
                <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
                  <strong>{isFatigued ? (lang === 'vi' ? 'Cảnh báo mệt mỏi thể lực' : 'Fatigue Alert') : (lang === 'vi' ? 'Trạng thái sẵn sàng tốt' : 'Prime Readiness')}</strong>
                  <p style={{ margin: '2px 0 0', color: 'var(--text-secondary, #64748b)' }}>
                    {isFatigued 
                      ? (lang === 'vi' ? 'Hệ chuyên gia Runna sẽ tự động hạ tải bài tập hôm nay sang chạy nhẹ Zone 2.' : 'Runna engine will adapt today’s workout to active recovery.')
                      : (lang === 'vi' ? 'Cơ thể đủ năng lượng để hoàn thành trọn vẹn các bài biến tốc/tempo.' : 'Body is well-rested for planned quality workouts.')}
                  </p>
                </div>
              </div>

              {/* Grid 2 Cột */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Giờ ngủ */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Moon size={14} color="#00A3A6" />
                    {t('sleepHoursLabel')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="3"
                    max="14"
                    value={sleepHours}
                    onChange={e => setSleepHours(e.target.value)}
                    className="personal-goal__input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Điểm giấc ngủ */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Moon size={14} color="#78BE20" />
                    {t('sleepScoreLabel')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={sleepScore}
                    onChange={e => setSleepScore(e.target.value)}
                    className="personal-goal__input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Nhịp tim nghỉ RHR */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Heart size={14} color="#ef4444" />
                    {t('rhrLabel')}
                  </label>
                  <input
                    type="number"
                    min="35"
                    max="110"
                    value={restingHeartRate}
                    onChange={e => setRestingHeartRate(e.target.value)}
                    className="personal-goal__input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* RHR cơ sở */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Heart size={14} color="#64748b" />
                    {t('baselineRhrLabel')}
                  </label>
                  <input
                    type="number"
                    min="35"
                    max="110"
                    value={baselineRhr}
                    onChange={e => setBaselineRhr(e.target.value)}
                    className="personal-goal__input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* HRV Status */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Activity size={14} color="#0080A0" />
                    {t('hrvLabel')}
                  </label>
                  <select
                    value={hrvStatus}
                    onChange={e => setHrvStatus(e.target.value)}
                    className="personal-goal__input"
                    style={{ width: '100%' }}
                  >
                    <option value="balanced">{t('hrvBalanced')}</option>
                    <option value="unbalanced">{t('hrvUnbalanced')}</option>
                    <option value="low">{t('hrvLow')}</option>
                  </select>
                </div>

                {/* Body Battery */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <BatteryCharging size={14} color="#78BE20" />
                    {t('bodyBatteryLabel')}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={bodyBattery}
                    onChange={e => setBodyBattery(e.target.value)}
                    className="personal-goal__input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label 
                  style={{
                    padding: '8px 14px',
                    background: 'var(--bg-secondary, #f1f5f9)',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px dashed #00A3A6'
                  }}
                >
                  <UploadCloud size={16} color="#00A3A6" />
                  {lang === 'vi' ? 'Tải tệp JSON từ máy' : 'Upload JSON file'}
                  <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {lang === 'vi' ? 'Hoặc dán nội dung trực tiếp' : 'Or paste raw JSON'}
                </span>
              </div>
              <textarea
                rows={7}
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
                placeholder='{\n  "sleepHours": 7.5,\n  "sleepScore": 82,\n  "restingHeartRate": 51,\n  "hrvStatus": "balanced",\n  "bodyBattery": 88\n}'
                className="personal-goal__input"
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.78rem' }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div 
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--bg-card-subtle, #f8fafc)',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px'
          }}
        >
          <button
            onClick={onClose}
            className="personal-goal__btn personal-goal__btn--cancel"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            {lang === 'vi' ? 'Đóng' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="personal-goal__btn personal-goal__btn--save"
            style={{ 
              padding: '8px 18px', 
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #00A3A6 0%, #002D54 100%)'
            }}
          >
            <Save size={15} />
            {loading ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : t('saveGarminDataBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
