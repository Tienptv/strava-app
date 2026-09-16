import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Trophy, Target, Zap, Calendar, Clock, ChevronRight, 
  ChevronDown, Flame, ShieldAlert, CheckCircle2, RefreshCw, 
  Sparkles, Award, ArrowUpRight, Dumbbell, Compass, HeartPulse
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function RaceTrainingRoadmapModal({ 
  isOpen, 
  onClose, 
  athlete, 
  lang = 'en', 
  t, 
  apiFetch, 
  onOpenGarminSync 
}) {
  const athleteId = athlete?.id ? String(athlete.id) : null;

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [plan, setPlan] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState('all'); // 'all' | 'base' | 'build' | 'peak' | 'taper'
  const [expandedWeek, setExpandedWeek] = useState(1);

  // Form State
  const [selectedEventId, setSelectedEventId] = useState('custom');
  const [raceName, setRaceName] = useState('Garmin Run 2026');
  const [targetDistanceKm, setTargetDistanceKm] = useState('21.0975');
  const [targetHours, setTargetHours] = useState('1');
  const [targetMinutes, setTargetMinutes] = useState('55');
  const [targetSeconds, setTargetSeconds] = useState('00');
  const [raceDate, setRaceDate] = useState('2026-10-18');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [longRunDay, setLongRunDay] = useState('sunday');
  const [currentWeeklyKm, setCurrentWeeklyKm] = useState('25');

  // 1. Tải danh sách giải chạy sắp tới và giáo án hiện tại của athlete
  useEffect(() => {
    if (!isOpen || !athleteId || !apiFetch) return;
    setLoading(true);

    Promise.all([
      apiFetch('/race/upcoming-events').catch(() => ({ events: [] })),
      apiFetch(`/race/training-plan?athleteId=${athleteId}`).catch(() => ({ plan: null }))
    ]).then(([eventsRes, planRes]) => {
      if (eventsRes && Array.isArray(eventsRes.events)) {
        setUpcomingEvents(eventsRes.events);
      }
      if (planRes && planRes.plan) {
        const p = planRes.plan;
        setPlan(p);
        setRaceName(p.raceName || 'Upcoming Race');
        setTargetDistanceKm(String(p.targetDistanceKm || 21.0975));
        setRaceDate(p.raceDate || '2026-10-18');
        setDaysPerWeek(p.daysPerWeek || 4);
        setLongRunDay(p.longRunDay || 'sunday');

        // Tách thời gian
        const totalSec = p.targetTimeSeconds || 7200;
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        setTargetHours(String(h));
        setTargetMinutes(String(m).padStart(2, '0'));
        setTargetSeconds(String(s).padStart(2, '0'));
      }
    }).finally(() => {
      setLoading(false);
    });
  }, [isOpen, athleteId, apiFetch]);

  // Khi người dùng chọn một giải trong danh sách có sẵn
  const handleSelectEvent = (e) => {
    const val = e.target.value;
    setSelectedEventId(val);
    if (val === 'custom') {
      setRaceName('Custom Target Race');
      return;
    }
    const ev = upcomingEvents.find(event => event.id === val);
    if (ev) {
      setRaceName(ev.name || 'Upcoming Race');
      if (ev.date) setRaceDate(ev.date);

      // Dự đoán cự ly từ note hoặc tên giải
      const noteStr = `${ev.name} ${ev.note || ''}`.toLowerCase();
      if (noteStr.includes('42') || noteStr.includes('fm')) {
        setTargetDistanceKm('42.195');
        setTargetHours('3');
        setTargetMinutes('59');
      } else if (noteStr.includes('21') || noteStr.includes('hm')) {
        setTargetDistanceKm('21.0975');
        setTargetHours('1');
        setTargetMinutes('55');
      } else if (noteStr.includes('10k') || noteStr.includes('10km')) {
        setTargetDistanceKm('10');
        setTargetHours('0');
        setTargetMinutes('52');
      } else if (noteStr.includes('5k') || noteStr.includes('5km')) {
        setTargetDistanceKm('5');
        setTargetHours('0');
        setTargetMinutes('25');
      }
    }
  };

  // Tính thời gian mục tiêu tính bằng giây
  const totalTargetSec = useMemo(() => {
    const h = Number(targetHours) || 0;
    const m = Number(targetMinutes) || 0;
    const s = Number(targetSeconds) || 0;
    return h * 3600 + m * 60 + s;
  }, [targetHours, targetMinutes, targetSeconds]);

  // Tính Pace ước tính
  const calculatedPaceStr = useMemo(() => {
    const dist = Number(targetDistanceKm) || 21.0975;
    if (!totalTargetSec || dist <= 0) return '--:--';
    const paceSec = totalTargetSec / dist;
    const m = Math.floor(paceSec / 60);
    const s = Math.round(paceSec % 60);
    return `${m}:${String(s).padStart(2, '0')}/km`;
  }, [targetDistanceKm, totalTargetSec]);

  // Xử lý tạo lộ trình (Divide & Conquer)
  const handleGeneratePlan = async () => {
    if (!athleteId) {
      Swal.fire({
        icon: 'warning',
        title: lang === 'vi' ? 'Thiếu Athlete ID' : 'Missing Athlete ID',
        text: lang === 'vi' ? 'Không tìm thấy ID thành viên hợp lệ (Rule #6).' : 'Valid athlete ID is required (Rule #6).'
      });
      return;
    }

    if (totalTargetSec <= 0) {
      Swal.fire({
        icon: 'warning',
        title: lang === 'vi' ? 'Thời gian chưa hợp lệ' : 'Invalid Time Target',
        text: lang === 'vi' ? 'Vui lòng nhập thời gian mục tiêu (PR / SUB) lớn hơn 0.' : 'Please set a valid target time.'
      });
      return;
    }

    setGenerating(true);
    try {
      const res = await apiFetch('/race/training-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId,
          raceName,
          targetDistanceKm: Number(targetDistanceKm),
          targetTimeSeconds: totalTargetSec,
          raceDate,
          daysPerWeek: Number(daysPerWeek),
          longRunDay,
          currentWeeklyKm: Number(currentWeeklyKm)
        })
      });

      if (res && res.weeks) {
        setPlan(res);
        Swal.fire({
          icon: 'success',
          title: t('planSavedSuccess'),
          text: lang === 'vi'
            ? `Đã phân rã lộ trình ${res.totalWeeks} tuần theo 4 giai đoạn chuẩn Olympic Runna!`
            : `Successfully generated ${res.totalWeeks}-week Olympic periodized training plan!`,
          timer: 2200,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: lang === 'vi' ? 'Lỗi tạo lộ trình' : 'Plan Generation Error',
        text: err.message
      });
    } finally {
      setGenerating(false);
    }
  };

  // Lọc các tuần theo Phase được chọn
  const filteredWeeks = useMemo(() => {
    if (!plan || !Array.isArray(plan.weeks)) return [];
    if (selectedPhase === 'all') return plan.weeks;
    return plan.weeks.filter(w => w.phase === selectedPhase);
  }, [plan, selectedPhase]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div 
        className="race-roadmap-modal-box" 
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg, #ffffff)',
          borderRadius: '14px',
          maxWidth: '820px',
          width: '95%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px rgba(0, 45, 84, 0.3)',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #002D54 0%, #0080A0 60%, #00A3A6 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopLeftRadius: '14px',
            borderTopRightRadius: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '7px', borderRadius: '8px' }}>
              <Trophy size={22} color="#78BE20" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                  {t('raceRoadmapTitle')}
                </h3>
                <span 
                  style={{
                    background: 'rgba(120, 190, 32, 0.25)',
                    color: '#78BE20',
                    border: '1px solid #78BE20',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}
                >
                  RUNNA OLYMPIC RULES
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                {t('raceRoadmapSubtitle')}
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
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Section 1: Cấu hình mục tiêu Race */}
          <div 
            style={{
              background: 'var(--bg-secondary, #f8fafc)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={18} color="#00A3A6" />
                <strong style={{ fontSize: '0.92rem', color: 'var(--text-main, #002D54)' }}>
                  {lang === 'vi' ? 'Thiết Lập Mục Tiêu Giải Chạy (Race Goal)' : 'Target Race Setup'}
                </strong>
              </div>
              <button
                type="button"
                onClick={onOpenGarminSync}
                style={{
                  background: 'rgba(0, 163, 166, 0.12)',
                  color: '#00A3A6',
                  border: '1px solid #00A3A6',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <HeartPulse size={14} />
                {t('garminSyncBtn')}
              </button>
            </div>

            {/* Form Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {/* Chọn giải */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'block', marginBottom: '4px' }}>
                  {t('selectRaceLabel')}
                </label>
                <select 
                  value={selectedEventId} 
                  onChange={handleSelectEvent}
                  className="personal-goal__input"
                  style={{ width: '100%' }}
                >
                  <option value="custom">{t('customRaceOption')}</option>
                  {upcomingEvents.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.date})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tên giải */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'block', marginBottom: '4px' }}>
                  {lang === 'vi' ? 'Tên giải đấu' : 'Race Name'}
                </label>
                <input 
                  type="text" 
                  value={raceName}
                  onChange={e => setRaceName(e.target.value)}
                  className="personal-goal__input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Cự ly */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'block', marginBottom: '4px' }}>
                  {t('targetDistanceLabel')}
                </label>
                <select 
                  value={targetDistanceKm} 
                  onChange={e => setTargetDistanceKm(e.target.value)}
                  className="personal-goal__input"
                  style={{ width: '100%' }}
                >
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="21.0975">21.1 km (Half Marathon)</option>
                  <option value="42.195">42.2 km (Full Marathon)</option>
                </select>
              </div>

              {/* Ngày thi đấu */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'block', marginBottom: '4px' }}>
                  {t('raceDateLabel')}
                </label>
                <input 
                  type="date" 
                  value={raceDate}
                  onChange={e => setRaceDate(e.target.value)}
                  className="personal-goal__input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Thời gian mục tiêu PR / SUB */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'block', marginBottom: '4px' }}>
                  {t('targetTimeLabel')} (hh:mm:ss)
                </label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input 
                    type="number" min="0" max="10" 
                    value={targetHours} 
                    onChange={e => setTargetHours(e.target.value)}
                    placeholder="h"
                    className="personal-goal__input" 
                    style={{ width: '50px', textAlign: 'center' }}
                  />
                  <span>:</span>
                  <input 
                    type="number" min="0" max="59" 
                    value={targetMinutes} 
                    onChange={e => setTargetMinutes(e.target.value)}
                    placeholder="m"
                    className="personal-goal__input" 
                    style={{ width: '55px', textAlign: 'center' }}
                  />
                  <span>:</span>
                  <input 
                    type="number" min="0" max="59" 
                    value={targetSeconds} 
                    onChange={e => setTargetSeconds(e.target.value)}
                    placeholder="s"
                    className="personal-goal__input" 
                    style={{ width: '55px', textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Pace mục tiêu tính tự động */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'block', marginBottom: '4px' }}>
                  {t('targetPaceLabel')}
                </label>
                <div 
                  style={{ 
                    padding: '8px 12px', 
                    background: '#ffffff', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#00A3A6'
                  }}
                >
                  {calculatedPaceStr}
                </div>
              </div>

              {/* Số buổi / tuần */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'block', marginBottom: '4px' }}>
                  {t('daysPerWeekLabel')}
                </label>
                <select 
                  value={daysPerWeek} 
                  onChange={e => setDaysPerWeek(Number(e.target.value))}
                  className="personal-goal__input"
                  style={{ width: '100%' }}
                >
                  <option value={3}>3 {lang === 'vi' ? 'buổi/tuần' : 'days/week'}</option>
                  <option value={4}>4 {lang === 'vi' ? 'buổi/tuần' : 'days/week'}</option>
                  <option value={5}>5 {lang === 'vi' ? 'buổi/tuần' : 'days/week'}</option>
                </select>
              </div>

              {/* Ngày chạy dài */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #002D54)', display: 'block', marginBottom: '4px' }}>
                  {t('longRunDayLabel')}
                </label>
                <select 
                  value={longRunDay} 
                  onChange={e => setLongRunDay(e.target.value)}
                  className="personal-goal__input"
                  style={{ width: '100%' }}
                >
                  <option value="sunday">{t('sunday')}</option>
                  <option value="saturday">{t('saturday')}</option>
                </select>
              </div>
            </div>

            {/* Nút Tạo giáo án */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={generating}
                style={{
                  background: 'linear-gradient(135deg, #00A3A6 0%, #002D54 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 22px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 163, 166, 0.35)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <RefreshCw size={16} className={generating ? 'spin-icon' : ''} />
                {generating 
                  ? (lang === 'vi' ? 'Đang tính toán Divide & Conquer...' : 'Calculating Divide & Conquer...') 
                  : (plan ? t('recalculatePlanBtn') : t('generatePlanBtn'))}
              </button>
            </div>
          </div>

          {/* Section 2: Banner Lộ Trình Hiện Tại (Nếu có plan) */}
          {plan && (
            <>
              {/* Hero Stats Card */}
              <div 
                style={{
                  background: 'linear-gradient(135deg, #002D54 0%, #003b6d 100%)',
                  borderRadius: '14px',
                  padding: '18px 20px',
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(0, 45, 84, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#78BE20', fontWeight: 800 }}>
                      {t('currentRoadmapTitle')}
                    </span>
                    <h4 style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                      {plan.raceName}
                    </h4>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600 }}>
                      <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      {plan.raceDate}
                    </span>
                    <span style={{ background: 'rgba(120, 190, 32, 0.25)', color: '#78BE20', padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>
                      {plan.totalWeeks} {lang === 'vi' ? 'Tuần' : 'Weeks'}
                    </span>
                  </div>
                </div>

                {/* 4 Metric Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>PR / SUB</span>
                    <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>{plan.paceModel?.targetTimeFormatted}</strong>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>RACE PACE</span>
                    <strong style={{ fontSize: '1.1rem', color: '#00A3A6' }}>{plan.paceModel?.racePaceFormatted}</strong>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>VDOT</span>
                    <strong style={{ fontSize: '1.1rem', color: '#78BE20' }}>{plan.paceModel?.vdot}</strong>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>READINESS</span>
                    <strong style={{ fontSize: '1.1rem', color: plan.garminReadiness?.color || '#78BE20' }}>
                      {plan.garminReadiness?.readinessScore || 80}/100
                    </strong>
                  </div>
                </div>

                {/* Dải 4 Pace sinh lý */}
                {plan.paceModel?.physiologicalPaces && (
                  <div 
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '8px',
                      fontSize: '0.78rem'
                    }}
                  >
                    <div>
                      <span style={{ color: '#00A3A6', fontWeight: 700 }}>● Zone 2 Easy:</span> {plan.paceModel.physiologicalPaces.easyZone2.formatted}
                    </div>
                    <div>
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>● Zone 4 Tempo:</span> {plan.paceModel.physiologicalPaces.tempoThreshold.formatted}
                    </div>
                    <div>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>● Zone 5 VO2:</span> {plan.paceModel.physiologicalPaces.intervalVO2.formatted}
                    </div>
                    <div>
                      <span style={{ color: '#78BE20', fontWeight: 700 }}>● Race Pace:</span> {plan.paceModel.physiologicalPaces.racePace.formatted}
                    </div>
                  </div>
                )}
              </div>

              {/* Negative Split Strategy Box */}
              {plan.paceModel?.splitStrategy && (
                <div 
                  style={{
                    background: 'rgba(0, 163, 166, 0.08)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    border: '1px solid #00A3A6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Compass size={20} color="#00A3A6" />
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#002D54' }}>
                        {lang === 'vi' ? plan.paceModel.splitStrategy.titleVi : plan.paceModel.splitStrategy.titleEn}
                      </strong>
                      <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                        {lang === 'vi' ? plan.paceModel.splitStrategy.firstHalf.noteVi : plan.paceModel.splitStrategy.firstHalf.noteEn}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>{t('firstHalfLabel')}: </span>
                      <strong style={{ color: '#002D54' }}>{plan.paceModel.splitStrategy.firstHalf.paceFormatted}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>{t('secondHalfLabel')}: </span>
                      <strong style={{ color: '#78BE20' }}>{plan.paceModel.splitStrategy.secondHalf.paceFormatted}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Phase Switcher Tabs */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedPhase('all')}
                  className={`adm-tab-btn ${selectedPhase === 'all' ? 'adm-tab-btn-active' : ''}`}
                  style={{ padding: '6px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                >
                  {lang === 'vi' ? 'Toàn bộ lộ trình' : 'All Phases'} ({plan.weeks.length})
                </button>
                {plan.phases?.map(phase => (
                  <button
                    key={phase.id}
                    type="button"
                    onClick={() => setSelectedPhase(phase.id)}
                    className={`adm-tab-btn ${selectedPhase === phase.id ? 'adm-tab-btn-active' : ''}`}
                    style={{ 
                      padding: '6px 14px', 
                      fontSize: '0.82rem', 
                      whiteSpace: 'nowrap',
                      borderBottomColor: selectedPhase === phase.id ? phase.color : 'transparent'
                    }}
                  >
                    {lang === 'vi' ? phase.nameVi : phase.nameEn} ({phase.weeks} {lang === 'vi' ? 'tuần' : 'w'})
                  </button>
                ))}
              </div>

              {/* Weekly Accordion List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredWeeks.map(week => {
                  const isExpanded = expandedWeek === week.weekNumber;
                  return (
                    <div 
                      key={week.weekNumber}
                      style={{
                        borderRadius: '12px',
                        border: `1px solid ${isExpanded ? '#00A3A6' : 'var(--border-color, #e2e8f0)'}`,
                        background: 'var(--card-bg, #ffffff)',
                        overflow: 'hidden',
                        boxShadow: isExpanded ? '0 6px 20px rgba(0, 163, 166, 0.12)' : 'none'
                      }}
                    >
                      {/* Week Header */}
                      <div 
                        onClick={() => setExpandedWeek(isExpanded ? null : week.weekNumber)}
                        style={{
                          padding: '12px 16px',
                          background: isExpanded ? 'rgba(0, 163, 166, 0.05)' : 'var(--bg-secondary, #f8fafc)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span 
                            style={{
                              background: week.phaseColor || '#00A3A6',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            W{week.weekNumber}
                          </span>
                          <div>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-main, #002D54)' }}>
                              {lang === 'vi' ? week.phaseTitleVi : week.phaseTitleEn}
                            </strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                Volume: <strong style={{ color: '#002D54' }}>{week.weeklyMileage} km</strong>
                              </span>
                              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                ACWR: <strong style={{ color: '#78BE20' }}>{week.acwrPredicted}x</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {week.isDeload && (
                            <span 
                              style={{
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#0284c7',
                                border: '1px solid #0284c7',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '10px'
                              }}
                            >
                              {t('deloadWeekBadge')}
                            </span>
                          )}
                          {week.isRaceWeek && (
                            <span 
                              style={{
                                background: 'rgba(120, 190, 32, 0.2)',
                                color: '#78BE20',
                                border: '1px solid #78BE20',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '10px'
                              }}
                            >
                              {t('raceWeekBadge')}
                            </span>
                          )}
                          {isExpanded ? <ChevronDown size={18} color="#00A3A6" /> : <ChevronRight size={18} color="#94a3b8" />}
                        </div>
                      </div>

                      {/* Week Daily Sessions Expanded */}
                      {isExpanded && (
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#ffffff' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            {t('dailyWorkoutsLabel')}
                          </span>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                            {week.sessions?.map((sess, sIdx) => (
                              <div
                                key={sIdx}
                                style={{
                                  padding: '12px',
                                  borderRadius: '10px',
                                  border: sess.isAdapted ? '1px solid #38bdf8' : '1px solid var(--border-color, #e2e8f0)',
                                  background: sess.isAdapted ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-card-subtle, #fcfcfc)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px'
                                }}
                              >
                                {/* Session Top */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #002D54)' }}>
                                    {lang === 'vi' ? sess.dayNameVi : sess.dayNameEn}
                                  </span>
                                  <span 
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      background: `${sess.badgeColor || '#00A3A6'}20`,
                                      color: sess.badgeColor || '#00A3A6'
                                    }}
                                  >
                                    {sess.intensity}
                                  </span>
                                </div>

                                {/* Title & Distance */}
                                <div>
                                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main, #002D54)' }}>
                                    {lang === 'vi' ? sess.titleVi : sess.titleEn}
                                  </strong>
                                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                    <span>Dist: <strong>{sess.distanceKm} km</strong></span>
                                    <span>Pace: <strong style={{ color: '#00A3A6' }}>{sess.targetPaceFormatted}</strong></span>
                                  </div>
                                </div>

                                {/* Adapted Notice if Garmin detected fatigue */}
                                {sess.isAdapted && (
                                  <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.72rem', color: '#0369a1' }}>
                                    ⚡ {lang === 'vi' ? sess.adaptationNoteVi : sess.adaptationNoteEn}
                                  </div>
                                )}

                                {/* Structure 4-parts */}
                                {sess.structure && (
                                  <div style={{ fontSize: '0.76rem', lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                                    <div>
                                      <strong style={{ color: '#64748b' }}>{t('warmUp')}:</strong> {lang === 'vi' ? sess.structure.warmUpVi : sess.structure.warmUpEn}
                                    </div>
                                    <div>
                                      <strong style={{ color: '#002D54' }}>{t('mainSet')}:</strong> {lang === 'vi' ? sess.structure.mainSetVi : sess.structure.mainSetEn}
                                    </div>
                                    <div>
                                      <strong style={{ color: '#64748b' }}>{t('coolDown')}:</strong> {lang === 'vi' ? sess.structure.coolDownVi : sess.structure.coolDownEn}
                                    </div>
                                    {sess.nutritionTipVi && (
                                      <div style={{ color: '#16a34a', marginTop: '2px' }}>
                                        🍎 <strong>{t('nutritionTip')}:</strong> {lang === 'vi' ? sess.nutritionTipVi : sess.nutritionTipEn}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
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
            borderBottomLeftRadius: '14px',
            borderBottomRightRadius: '14px'
          }}
        >
          <button
            onClick={onClose}
            className="personal-goal__btn personal-goal__btn--cancel"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            {lang === 'vi' ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
