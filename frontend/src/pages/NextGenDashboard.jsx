import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, ArrowLeft, Users, QrCode, FileSpreadsheet, Share2, 
  Award, Heart, Calendar, Target, ShieldCheck, Flame, RefreshCw
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { evaluateAthleteBadges } from '../utils/badgeEngine';
import TrophyCabinet from '../components/TrophyCabinet';
import SocialShareModal from '../components/SocialShareModal';
import VietQRPenaltyModal from '../components/VietQRPenaltyModal';
import AerobicEfficiencyCard from '../components/AerobicEfficiencyCard';
import MonthlyReportExportModal from '../components/MonthlyReportExportModal';
import { loadChallengeData } from '../utils/challengeDataLoader';
import { processChallengeData } from '../utils/challengeStats';

export default function NextGenDashboard({
  athlete,
  isAdmin,
  isSuperAdmin,
  apiFetch,
  challengeMonth: propMonth,
  challengeYear: propYear,
  setChallengeMonth: propSetMonth,
  setChallengeYear: propSetYear,
  userAccessConfig
}) {
  const navigate = useNavigate();
  const { lang, t } = useLang();

  const currentMonth = propMonth || (new Date().getMonth() + 1);
  const currentYear = propYear || new Date().getFullYear();

  const [activities, setActivities] = useState([]);
  const [challengeData, setChallengeData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVietQrModal, setShowVietQrModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Persona Simulation for UI/UX Testing
  const [simulatedPersona, setSimulatedPersona] = useState('active_user');

  // Load activities & challenge data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      apiFetch('/activities?limit=50').catch(() => []),
      apiFetch('/challenge/config').catch(() => ({}))
    ]).then(async ([actList, config]) => {
      if (!isMounted) return;
      setActivities(Array.isArray(actList) ? actList : []);

      const parts = config?.participants || {};
      const rawChallenge = await loadChallengeData(apiFetch, athlete, parts).catch(() => []);
      const processed = processChallengeData(rawChallenge, currentYear, currentMonth, parts, config?.nameMapping || {});
      setChallengeData(processed);
      setLoading(false);
    }).catch(err => {
      console.error('Lỗi khi tải dữ liệu NextGen:', err);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [apiFetch, athlete, currentMonth, currentYear]);

  // Chọn athlete và dataset theo Persona được chọn
  const activeRunner = useMemo(() => {
    if (simulatedPersona === 'top1') {
      return {
        id: '999001',
        firstname: 'Huy',
        lastname: 'Hoàng (Top 1 Champion)',
        name: 'Huy Hoàng (Top 1 Champion)',
        actualKm: 215.4,
        targetKm: 200,
        penaltyVnd: 0,
        penaltyK: 0
      };
    }
    if (simulatedPersona === 'penalty') {
      return {
        id: '999002',
        firstname: 'Thành',
        lastname: 'Vũ (Thiếu 25km)',
        name: 'Thành Vũ (Thiếu 25km)',
        actualKm: 75.0,
        targetKm: 100,
        penaltyVnd: 100000,
        penaltyK: 100
      };
    }
    if (simulatedPersona === 'newbie') {
      return {
        id: '999003',
        firstname: 'Minh',
        lastname: 'An (Tân Binh)',
        name: 'Minh An (Tân Binh)',
        actualKm: 18.5,
        targetKm: 50,
        penaltyVnd: 160000,
        penaltyK: 160
      };
    }
    return athlete || { id: 'default', firstname: 'Haskoning', lastname: 'Runner' };
  }, [simulatedPersona, athlete]);

  // Đánh giá huy hiệu của VĐV đang được chọn
  const badgeData = useMemo(() => {
    // Tạo bài chạy mẫu giả lập nếu chọn persona đặc biệt
    let runnerActs = [...activities];
    if (simulatedPersona === 'top1') {
      runnerActs = [
        { athlete: { id: '999001' }, distance: 42200, moving_time: 14400, start_date_local: '2026-09-12T05:30:00Z' },
        { athlete: { id: '999001' }, distance: 21500, moving_time: 6300, start_date_local: '2026-09-19T20:30:00Z' },
        { athlete: { id: '999001' }, distance: 10500, moving_time: 2900, start_date_local: '2026-09-05T06:00:00Z' },
        { athlete: { id: '999001' }, distance: 5200, moving_time: 1420, start_date_local: '2026-09-06T07:00:00Z' },
        { athlete: { id: '999001' }, distance: 5000, moving_time: 1350, start_date_local: '2026-09-07T05:45:00Z' },
      ];
    } else if (simulatedPersona === 'penalty') {
      runnerActs = [
        { athlete: { id: '999002' }, distance: 10200, moving_time: 3900, start_date_local: '2026-09-10T06:30:00Z' },
        { athlete: { id: '999002' }, distance: 5500, moving_time: 2100, start_date_local: '2026-09-15T18:00:00Z' },
      ];
    } else if (simulatedPersona === 'newbie') {
      runnerActs = [
        { athlete: { id: '999003' }, distance: 5100, moving_time: 2200, start_date_local: '2026-09-20T06:15:00Z' }
      ];
    }

    return evaluateAthleteBadges({
      athleteId: activeRunner.id,
      activities: runnerActs,
      challengeRow: activeRunner,
      targetKm: activeRunner.targetKm || 50
    });
  }, [activeRunner, activities, simulatedPersona]);

  const penaltyToPay = activeRunner.penaltyVnd !== undefined 
    ? activeRunner.penaltyVnd 
    : (activeRunner.penaltyK ? activeRunner.penaltyK * 1000 : 0);

  return (
    <div className="nextgen-container">
      {/* 1. UX Testing Control Dock (Top Sticky Lab Toolbar) */}
      <div className="nextgen-dock">
        <div className="nextgen-dock__left">
          <div className="nextgen-dock__tag">
            <Sparkles size={16} color="#78BE20" />
            <span>{t('nextGenBannerTitle')}</span>
          </div>
          <span className="nextgen-dock__desc">{t('nextGenBannerDesc')}</span>
        </div>

        <div className="nextgen-dock__controls">
          {/* Persona Selector */}
          <div className="nextgen-persona-select-box">
            <span className="nextgen-dock-label">{t('testPersonaLabel')}</span>
            <select
              value={simulatedPersona}
              onChange={(e) => setSimulatedPersona(e.target.value)}
              className="nextgen-select"
            >
              <option value="active_user">{t('personaAdmin')}</option>
              <option value="top1">{t('personaTop1')}</option>
              <option value="penalty">{t('personaPenalty')}</option>
              <option value="newbie">{t('personaNewbie')}</option>
            </select>
          </div>

          {/* Quick Trigger Buttons */}
          <div className="nextgen-dock-actions">
            <button
              type="button"
              className="btn btn--accent btn--sm"
              onClick={() => setShowShareModal(true)}
              title={t('socialShareTitle')}
            >
              <Share2 size={14} />
              <span>{t('socialShareBtn')}</span>
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setShowVietQrModal(true)}
              title={t('vietQrModalTitle')}
            >
              <QrCode size={14} />
              <span>VietQR ({penaltyToPay > 0 ? `${penaltyToPay.toLocaleString('vi-VN')} đ` : '0 đ'})</span>
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setShowReportModal(true)}
              title={t('monthlyReportTitle')}
            >
              <FileSpreadsheet size={14} />
              <span>Báo Cáo Tháng</span>
            </button>

            {/* Quay lại bản cũ */}
            <button
              type="button"
              className="btn btn--outline btn--sm btn-return-stable"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={14} />
              <span>{t('backToStableBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="nextgen-content">
        {/* Runner Greeting Card */}
        <div className="nextgen-welcome-banner">
          <div>
            <span className="nextgen-welcome-tag">HASKONING ATHLETIC CULTURE</span>
            <h1 className="nextgen-welcome-title">
              Chào mừng, <span>{activeRunner.firstname || 'Athlete'}</span>!
            </h1>
            <p className="nextgen-welcome-sub">
              Trải nghiệm hệ thống danh hiệu Gamification, chỉ số khoa học tim mạch và công cụ tài chính số thế hệ mới.
            </p>
          </div>

          <div className="nextgen-quick-stats">
            <div className="nextgen-stat-item">
              <span className="nextgen-stat-num text-accent">{badgeData.summary.totalKm} km</span>
              <span className="nextgen-stat-label">Quãng đường tháng</span>
            </div>
            <div className="nextgen-stat-item">
              <span className="nextgen-stat-num text-lime">{badgeData.unlockedCount} / {badgeData.totalBadges}</span>
              <span className="nextgen-stat-label">Huy hiệu đạt được</span>
            </div>
            <div className="nextgen-stat-item">
              <span className="nextgen-stat-num text-blue">{badgeData.summary.percentCompleted}%</span>
              <span className="nextgen-stat-label">Tiến độ mục tiêu</span>
            </div>
          </div>
        </div>

        {/* 3. Phân Hệ 1: Tủ Cúp 3D Glassmorphism */}
        <TrophyCabinet
          badgeData={badgeData}
          onOpenShareModal={() => setShowShareModal(true)}
        />

        {/* 4. Phân Hệ 2: Khoa Học Thể Thao & Lịch Tập 7 Ngày Thích Ứng */}
        <AerobicEfficiencyCard
          athlete={activeRunner}
          activities={activities}
          challengeRow={activeRunner}
        />
      </div>

      {/* Modal 1: Canvas Social Share Card */}
      <SocialShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        athlete={activeRunner}
        badgeData={badgeData}
        challengeMonth={currentMonth}
        challengeYear={currentYear}
      />

      {/* Modal 2: Dynamic VietQR Settlement */}
      <VietQRPenaltyModal
        isOpen={showVietQrModal}
        onClose={() => setShowVietQrModal(false)}
        athlete={activeRunner}
        penaltyAmount={penaltyToPay}
        challengeMonth={currentMonth}
        challengeYear={currentYear}
      />

      {/* Modal 3: Monthly Summary Report Export */}
      <MonthlyReportExportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        challengeData={challengeData}
        challengeMonth={currentMonth}
        challengeYear={currentYear}
      />
    </div>
  );
}
