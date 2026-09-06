import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  Settings, 
  Users, 
  Shield, 
  FileText, 
  Database, 
  ArrowLeft, 
  RefreshCw, 
  Trash2, 
  Search, 
  Save, 
  CheckCircle,
  HardDrive,
  Activity,
  UserCheck,
  UserX,
  Plus,
  Trophy,
  Calendar,
  Edit2,
  MapPin,
  Flag,
  Sparkles,
  X,
  DollarSign,
  Download,
  Scale,
  ArrowDownCircle,
  ArrowUpCircle,
  UploadCloud,
  DownloadCloud,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Check,
  Sliders,
  Lock
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { processChallengeData } from '../utils/challengeStats';
import { loadChallengeData } from '../utils/challengeDataLoader';
import { APP_VERSION } from '../config/version';

export default function Administer({ apiFetch, athlete, isSuperAdmin, isAdmin, permissions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, t } = useLang();

  // Active Tab: 'settings', 'roles', 'logs', 'data', 'penalties'
  const getInitialTab = () => {
    const tabParam = searchParams.get('tab') || location.state?.tab;
    const validTabs = ['settings', 'roles', 'logs', 'data', 'penalties'];
    return (tabParam && validTabs.includes(tabParam)) ? tabParam : 'settings';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Đồng bộ activeTab khi URL query param hoặc location state thay đổi
  useEffect(() => {
    const tabParam = searchParams.get('tab') || location.state?.tab;
    const validTabs = ['settings', 'roles', 'logs', 'data', 'penalties'];
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, location.state]);

  // ==========================================
  // STATE: 1. CHALLENGE SETTINGS
  // ==========================================
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // ==========================================
  // STATE: 1.1 ANNUAL TIMELINE & RACES
  // ==========================================
  const [goalData, setGoalData] = useState({
    year: new Date().getFullYear(),
    challengeType: 'fixed',
    targetDistance: 2026,
    dailyTarget: 5.5,
    customDates: {
      startDate: `${new Date().getFullYear()}-01-01`,
      endDate: `${new Date().getFullYear()}-12-31`
    },
    races: [],
    monthlyTargets: {}
  });
  const [loadingGoal, setLoadingGoal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [raceModalOpen, setRaceModalOpen] = useState(false);
  const showRaceModal = raceModalOpen;
  const setShowRaceModal = setRaceModalOpen;
  const [editingRaceIndex, setEditingRaceIndex] = useState(-1);
  const [raceForm, setRaceForm] = useState({
    name: '',
    date: '',
    logoUrl: '',
    registrationUrl: '',
    icon: '🏅',
    type: 'race',
    location: '',
    note: ''
  });

  // ==========================================
  // STATE: 2. ROLES & PERMISSIONS
  // ==========================================
  const [subAdmins, setSubAdmins] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Cấu hình phân quyền Sub-Admin
  const [adminPermissions, setAdminPermissions] = useState({
    defaultPermissions: {
      generalSettings: true,
      manageRoles: false,
      activityLogs: true,
      dataManagement: false,
      penaltiesTargets: true,
      syncStrava: true,
      importActivities: true
    },
    customPermissions: {}
  });
  const [selectedSubAdminScope, setSelectedSubAdminScope] = useState('all');
  const [permissionsForm, setPermissionsForm] = useState({
    generalSettings: true,
    manageRoles: false,
    activityLogs: true,
    dataManagement: false,
    penaltiesTargets: true,
    syncStrava: true,
    importActivities: true
  });
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Chuẩn hóa và gộp danh sách Sub-Admins (gộp ID số và MatchKey/Tên thành 1 người)
  const normalizedAdmins = useMemo(() => {
    const map = new Map();
    (subAdmins || []).forEach(item => {
      let id = '';
      let matchKey = '';
      let name = '';

      if (typeof item === 'object' && item !== null) {
        id = (item.athleteId || item.id || '').toString();
        matchKey = (item.matchKey || '').toString();
        name = (item.name || '').toString();
      } else {
        const s = (item || '').toString().trim();
        if (!s) return;
        if (s.match(/^\d+$/)) {
          id = s;
        } else {
          matchKey = s;
        }
        name = s;
      }

      // Tra cứu chéo trong members nếu có
      const foundMember = (members || []).find(m => 
        (id && m.id && m.id.toString() === id) || 
        (matchKey && `${m.firstname}_${m.lastname}`.toLowerCase() === matchKey.toLowerCase())
      );
      if (foundMember) {
        if (!id && foundMember.id) id = foundMember.id.toString();
        if (!name || name === matchKey || name === id) {
          name = `${foundMember.firstname} ${foundMember.lastname}`;
        }
      }

      const key = id || matchKey || name;
      if (!map.has(key)) {
        map.set(key, { id, athleteId: id, matchKey, name: name || matchKey || id });
      } else {
        const ex = map.get(key);
        if (!ex.id && id) { ex.id = id; ex.athleteId = id; }
        if (!ex.matchKey && matchKey) ex.matchKey = matchKey;
        if ((!ex.name || ex.name === ex.matchKey || ex.name === ex.id) && name) ex.name = name;
      }
    });
    return Array.from(map.values());
  }, [subAdmins, members]);

  // ==========================================
  // STATE: 3. AUDIT LOGS
  // ==========================================
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // ==========================================
  // STATE: 4. DATA MANAGEMENT
  // ==========================================
  const [storageFiles, setStorageFiles] = useState([]);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // ==========================================
  // STATE: 5. PENALTIES & CLUB TREASURY
  // ==========================================
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportFilter, setReportFilter] = useState('all'); // 'all' | 'committed' | 'owing' | 'safe'
  const [reportSearch, setReportSearch] = useState('');
  const [penaltiesChallengeData, setPenaltiesChallengeData] = useState([]);
  const [penaltiesTargets, setPenaltiesTargets] = useState({});
  const [totalKmBase, setTotalKmBase] = useState(null);
  const [loadingPenalties, setLoadingPenalties] = useState(false);

  // Sub-tabs: 'monthly' | 'alltime' | 'cashflow'
  const [penaltySubTab, setPenaltySubTab] = useState('monthly');
  const [treasurySummary, setTreasurySummary] = useState(null);
  const [treasuryLedger, setTreasuryLedger] = useState([]);
  const [cashFlowData, setCashFlowData] = useState({ currentClubFundBalance: 11097000, totalPenaltyFundCollected: 16900000, cashFlowLedger: [] });
  const [cashFlowModalOpen, setCashFlowModalOpen] = useState(false);
  const [cashFlowForm, setCashFlowForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amountVND: '',
    type: 'expense',
    note: ''
  });
  const [savingCashFlow, setSavingCashFlow] = useState(false);
  const [allTimeSort, setAllTimeSort] = useState('rank'); // 'rank' | 'km' | 'name'
  const [allTimeSearch, setAllTimeSearch] = useState('');

  // Load Settings
  const loadConfig = () => {
    setLoadingConfig(true);
    apiFetch('/challenge/config')
      .then(data => {
        setConfig(data || {
          allowEditOthers: false,
          defaultTarget: 50,
          penaltyRate: 10000,
          title: 'Journey from HCMC to the North Pole'
        });
      })
      .catch(err => console.error('Lỗi tải config:', err))
      .finally(() => setLoadingConfig(false));
  };

  // Load Sub-Admins
  const loadAdmins = () => {
    apiFetch('/admins')
      .then(data => setSubAdmins(data || []))
      .catch(err => console.error('Lỗi tải admins:', err));
  };

  // Load Audit Logs
  const loadLogs = () => {
    setLoadingLogs(true);
    apiFetch('/admin/audit-logs')
      .then(data => setLogs(data || []))
      .catch(err => console.error('Lỗi tải audit logs:', err))
      .finally(() => setLoadingLogs(false));
  };

  // Load Storage Stats
  const loadStorageStats = () => {
    setLoadingStorage(true);
    apiFetch('/admin/storage-stats')
      .then(res => {
        if (res && res.files) setStorageFiles(res.files);
      })
      .catch(err => console.error('Lỗi tải storage stats:', err))
      .finally(() => setLoadingStorage(false));
  };

  // Load Goal & Timeline Races
  const loadGoal = () => {
    setLoadingGoal(true);
    apiFetch('/challenge/goal')
      .then(data => {
        if (data) {
          setGoalData({
            year: data.year || 2026,
            targetKm: data.targetKm || 8801,
            customTitle: data.customTitle || '',
            customSubtitle: data.customSubtitle || '',
            showAnnualGoal: data.showAnnualGoal !== false,
            showDistanceProgress: data.showDistanceProgress !== false,
            showTimeProgress: data.showTimeProgress !== false,
            showTodayMarker: data.showTodayMarker !== false,
            events: Array.isArray(data.events) ? data.events : []
          });
        }
      })
      .catch(err => console.error('Lỗi tải goal:', err))
      .finally(() => setLoadingGoal(false));
  };

  // Load Penalties & Targets Report Data
  const loadPenaltiesReport = async (m = reportMonth, y = reportYear) => {
    setLoadingPenalties(true);
    try {
      const [conf, tgts, totalKmBase] = await Promise.all([
        apiFetch('/challenge/config').catch(() => null),
        apiFetch('/challenge/targets').catch(() => ({})),
        apiFetch('/challenge/total-km').catch(() => null)
      ]);
      setPenaltiesTargets(tgts || {});
      if (totalKmBase) setTotalKmBase(totalKmBase);

      const monthKey = `${y}_${m}`;
      const parts = (conf?.monthlyParticipants && conf.monthlyParticipants[monthKey]) || conf?.participants || {};
      
      const acts = await loadChallengeData(apiFetch, athlete, parts);
      const processed = processChallengeData(acts, parts, y, m, totalKmBase);
      setPenaltiesChallengeData(processed || []);
    } catch (e) {
      console.error('Lỗi tải báo cáo cam kết phạt:', e);
    } finally {
      setLoadingPenalties(false);
    }
  };

  // Load Treasury & Penalties Ledger
  const loadTreasuryData = async (m = reportMonth, y = reportYear) => {
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;
    try {
      const [sumRes, ledRes, cfRes] = await Promise.all([
        apiFetch(`/penalties/summary?month=${monthStr}`).catch(() => null),
        apiFetch(`/penalties/ledger?month=${monthStr}`).catch(() => null),
        apiFetch('/penalties/cashflow').catch(() => null)
      ]);
      if (sumRes) setTreasurySummary(sumRes);
      if (ledRes && Array.isArray(ledRes.members)) setTreasuryLedger(ledRes.members);
      if (cfRes) setCashFlowData(cfRes);
    } catch (err) {
      console.error('Lỗi tải dữ liệu quỹ và phạt:', err);
    }
  };

  // Admin toggle payment status for a runner in a month
  const handleTogglePayment = async (athleteId, displayName, currentStatus, currentNote = '') => {
    const monthStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}`;
    const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';

    const result = await Swal.fire({
      title: nextStatus === 'paid' ? (lang === 'en' ? 'Confirm Payment?' : 'Xác nhận Đã Nộp Tiền?') : (lang === 'en' ? 'Revert to Unpaid?' : 'Chuyển về Chưa Nộp?'),
      text: lang === 'en' 
        ? `Mark penalty payment for ${displayName} (Month ${reportMonth}/${reportYear}) as ${nextStatus.toUpperCase()}?` 
        : `Xác nhận thành viên ${displayName} (Tháng ${reportMonth}/${reportYear}) ${nextStatus === 'paid' ? 'đã nộp đủ tiền phạt vào quỹ' : 'chưa nộp phạt'}?`,
      input: 'text',
      inputLabel: lang === 'en' ? 'Payment Note / Receipt (Optional)' : 'Ghi chú nộp tiền / Số chứng từ (Tùy chọn)',
      inputValue: currentNote || '',
      inputPlaceholder: lang === 'en' ? 'E.g. Bank transfer ref #1234' : 'Ví dụ: Chuyển khoản Techcombank ngày 05/09',
      icon: nextStatus === 'paid' ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: nextStatus === 'paid' ? '#00A3A6' : '#ea580c',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: nextStatus === 'paid' ? (lang === 'en' ? 'Yes, Mark Paid' : 'Đồng ý Đã Nộp') : (lang === 'en' ? 'Mark Unpaid' : 'Chuyển Chưa Nộp'),
      cancelButtonText: t('cancel')
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch('/penalties/payment', {
          method: 'POST',
          body: JSON.stringify({
            athleteId,
            rawName: displayName,
            month: monthStr,
            status: nextStatus,
            note: result.value || '',
            actor: athlete?.name || (athlete?.firstname ? `${athlete.firstname} ${athlete.lastname || ''}`.trim() : 'Admin')
          })
        });

        if (res && res.success) {
          Swal.fire({
            icon: nextStatus === 'paid' ? 'success' : 'info',
            title: nextStatus === 'paid' ? (lang === 'en' ? 'Payment Recorded!' : 'Đã Ghi Nhận Nộp Phạt!') : (lang === 'en' ? 'Updated Status' : 'Đã Cập Nhật Trạng Thái'),
            text: `${displayName} (${monthStr}): ${nextStatus === 'paid' ? (lang === 'en' ? 'Paid' : 'Đã nộp') : (lang === 'en' ? 'Unpaid' : 'Chưa nộp')}`,
            timer: 2000,
            showConfirmButton: false
          });
          loadTreasuryData(reportMonth, reportYear);
          window.dispatchEvent(new CustomEvent('penaltiesUpdated'));
        }
      } catch (err) {
        Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', err.message, 'error');
      }
    }
  };

  // Admin add new Cash Flow income/expense
  const handleSaveCashFlow = async (e) => {
    e.preventDefault();
    if (!cashFlowForm.description.trim() || !cashFlowForm.amountVND) {
      Swal.fire(lang === 'en' ? 'Missing info' : 'Thiếu thông tin', lang === 'en' ? 'Please enter description and amount' : 'Vui lòng nhập nội dung và số tiền', 'warning');
      return;
    }

    setSavingCashFlow(true);
    try {
      const res = await apiFetch('/penalties/cashflow', {
        method: 'POST',
        body: JSON.stringify({
          ...cashFlowForm,
          amountVND: Number(cashFlowForm.amountVND),
          actor: athlete?.name || (athlete?.firstname ? `${athlete.firstname} ${athlete.lastname || ''}`.trim() : 'Admin')
        })
      });

      if (res && res.success) {
        Swal.fire({
          icon: 'success',
          title: lang === 'en' ? 'Transaction Recorded!' : 'Đã Ghi Nhận Giao Dịch!',
          text: `${cashFlowForm.type === 'income' ? (lang === 'en' ? 'Income' : 'Thu vào') : (lang === 'en' ? 'Expense' : 'Chi ra')}: ${Number(cashFlowForm.amountVND).toLocaleString('vi-VN')} VNĐ`,
          timer: 2200,
          showConfirmButton: false
        });
        setCashFlowModalOpen(false);
        setCashFlowForm({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amountVND: '',
          type: 'expense',
          note: ''
        });
        loadTreasuryData(reportMonth, reportYear);
        window.dispatchEvent(new CustomEvent('penaltiesUpdated'));
      }
    } catch (err) {
      Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', err.message, 'error');
    } finally {
      setSavingCashFlow(false);
    }
  };

  // Quick edit target in report
  const handleAdminTargetChange = async (matchKey, newTarget) => {
    const key = `${matchKey}_${reportYear}_${reportMonth}`;
    const cleanStr = String(newTarget).replace(/^0+(?=\d)/, '');
    const num = cleanStr === '' ? '' : (isNaN(parseInt(cleanStr, 10)) ? '' : parseInt(cleanStr, 10));
    
    setPenaltiesTargets(prev => ({
      ...prev,
      [key]: { ...prev[key], target: num }
    }));
    
    await apiFetch('/challenge/targets', {
      method: 'POST',
      body: JSON.stringify({ matchKey: key, target: num })
    }).catch(e => console.error('Lỗi lưu target:', e));
    window.dispatchEvent(new CustomEvent('challengeTargetsUpdated', { detail: { matchKey, year: reportYear, month: reportMonth, target: num } }));
  };

  // Quick edit penalty in report
  const handleAdminPenaltyChange = async (matchKey, newPenalty) => {
    const key = `${matchKey}_${reportYear}_${reportMonth}`;
    setPenaltiesTargets(prev => ({
      ...prev,
      [key]: { ...prev[key], penalty: newPenalty }
    }));
    
    await apiFetch('/challenge/targets', {
      method: 'POST',
      body: JSON.stringify({ matchKey: key, penalty: newPenalty })
    }).catch(e => console.error('Lỗi lưu penalty:', e));
    window.dispatchEvent(new CustomEvent('challengeTargetsUpdated', { detail: { matchKey, year: reportYear, month: reportMonth, penalty: newPenalty } }));
  };

  // Export report to CSV
  const exportReportCsv = () => {
    if (!reportRows || reportRows.length === 0) {
      Swal.fire(lang === 'en' ? 'No data to export' : (t('noData') || 'Không có dữ liệu để xuất'), '', 'warning');
      return;
    }
    
    const headers = lang === 'en' ? [
      '#',
      'Full Name',
      'Month',
      'Year',
      'Target (km)',
      'Distance (km)',
      'Remaining (km)',
      'Progress (%)',
      'Penalty Committed',
      'Status',
      'Penalty Due (VND)'
    ] : [
      'STT',
      'Họ và tên',
      'Tháng',
      'Năm',
      'Mục tiêu (km)',
      'Đã chạy (km)',
      'Còn thiếu (km)',
      'Tiến độ (%)',
      'Cam kết phạt',
      'Trạng thái',
      'Tiền phạt phải nộp (VNĐ)'
    ];
    
    const rows = filteredReportRows.map((r, i) => [
      i + 1,
      `"${(r.displayName || '').replace(/"/g, '""')}"`,
      reportMonth,
      reportYear,
      r.targetKm || 0,
      r.totalDist.toFixed(1),
      r.diffKm.toFixed(1),
      `"${r.progressPct}%"`,
      r.hasPenalty ? (lang === 'en' ? 'Committed' : 'Có cam kết') : (lang === 'en' ? 'No commitment' : 'Không cam kết'),
      r.status === 'safe' 
        ? (lang === 'en' ? 'Goal reached (0k)' : 'Đã đạt (0k)') 
        : (r.status === 'owing' 
            ? (lang === 'en' ? 'Incomplete' : 'Chưa đạt') 
            : (r.status === 'no_target' ? (lang === 'en' ? 'No target set' : 'Chưa đặt target') : (lang === 'en' ? 'No commitment' : 'Không tham gia'))),
      r.hasPenalty ? r.penaltyAmountVnd : 0
    ]);
    
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', lang === 'en' ? `Penalty_Commitment_Report_M${reportMonth}_${reportYear}.csv` : `Bao_Cao_Cam_Ket_Phat_T${reportMonth}_${reportYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    Swal.fire({
      icon: 'success',
      title: t('exportCsvSuccessTitle'),
      text: t('exportCsvSuccessText').replace('{month}', reportMonth).replace('{year}', reportYear),
      timer: 2500,
      showConfirmButton: false
    });
  };

  // Auto load penalties and treasury when tab or month/year changes
  useEffect(() => {
    if (activeTab === 'penalties') {
      loadPenaltiesReport(reportMonth, reportYear);
      loadTreasuryData(reportMonth, reportYear);
    }
  }, [activeTab, reportMonth, reportYear]);

  // Calculations for penalties report
  const reportRows = React.useMemo(() => {
    if (!penaltiesChallengeData || penaltiesChallengeData.length === 0) return [];
    const monthStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}`;
    
    return penaltiesChallengeData.map((row, idx) => {
      const userKey = `${row.matchKey}_${reportYear}_${reportMonth}`;
      const rawTarget = penaltiesTargets[userKey]?.target !== undefined 
        ? penaltiesTargets[userKey]?.target 
        : penaltiesTargets[row.matchKey]?.target;
      const targetKm = (rawTarget !== undefined && rawTarget !== '') ? (isNaN(Number(rawTarget)) ? 0 : Number(rawTarget)) : 0;
      
      const hasPenalty = Boolean(
        penaltiesTargets[userKey]?.penalty !== undefined 
          ? penaltiesTargets[userKey]?.penalty 
          : penaltiesTargets[row.matchKey]?.penalty
      );
      
      const totalDist = row.totalDistance || 0;
      const diffKm = targetKm > 0 ? Math.max(0, targetKm - totalDist) : 0;
      const progressPct = targetKm > 0 ? Math.min(100, Math.round((totalDist / targetKm) * 100)) : 0;
      const isReached = targetKm > 0 && totalDist >= targetKm;
      
      let penaltyAmountK = null;
      if (hasPenalty && targetKm > 0) {
        if (isReached) {
          penaltyAmountK = 0;
        } else {
          const rawK = (diffKm / targetKm) * 200;
          penaltyAmountK = Math.min(200, Math.ceil(rawK / 10) * 10);
        }
      }
      const penaltyAmountVnd = penaltyAmountK !== null ? penaltyAmountK * 1000 : 0;
      
      const displayName = row.member?.name || (row.member ? `${row.member.firstname || ''} ${row.member.lastname || ''}`.trim() : (row.name || 'Runner'));
      const avatarUrl = row.member?.profile_medium || row.member?.profile || row.member?.avatar || row.avatar || '';

      const matchedTreasury = (treasuryLedger || []).find(m => 
        (m.athleteId && row.athleteId && String(m.athleteId) === String(row.athleteId)) ||
        (m.rawName && row.name && m.rawName.toLowerCase() === row.name.toLowerCase()) ||
        (m.fullName && displayName && m.fullName.toLowerCase() === displayName.toLowerCase())
      );
      const paymentInfo = matchedTreasury?.monthlyPaymentStatus && matchedTreasury.monthlyPaymentStatus[monthStr]
        ? matchedTreasury.monthlyPaymentStatus[monthStr]
        : { status: matchedTreasury?.currentMonthPaymentStatus || 'unpaid', paidAt: null, note: '' };

      return {
        ...row,
        displayName,
        avatarUrl,
        index: idx + 1,
        targetKm,
        totalDist: Math.round(totalDist * 10) / 10,
        diffKm: Math.round(diffKm * 10) / 10,
        progressPct,
        hasPenalty,
        isReached,
        penaltyAmountK,
        penaltyAmountVnd,
        paymentStatus: paymentInfo.status || 'unpaid',
        paidAt: paymentInfo.paidAt || null,
        paymentNote: paymentInfo.note || '',
        matchedTreasury,
        status: !hasPenalty 
          ? 'none' 
          : (targetKm === 0 ? 'no_target' : (isReached ? 'safe' : 'owing'))
      };
    });
  }, [penaltiesChallengeData, penaltiesTargets, treasuryLedger, reportMonth, reportYear]);

  const totalRunners = reportRows.length;
  const committedCount = reportRows.filter(r => r.hasPenalty).length;
  const committedRate = totalRunners > 0 ? Math.round((committedCount / totalRunners) * 100) : 0;
  const safeCount = reportRows.filter(r => r.status === 'safe').length;
  const owingCount = reportRows.filter(r => r.status === 'owing').length;
  const totalFundVnd = reportRows.reduce((sum, r) => sum + (r.hasPenalty ? (r.penaltyAmountVnd || 0) : 0), 0);
  const totalPaidFundVnd = reportRows.filter(r => r.hasPenalty && r.paymentStatus === 'paid').reduce((sum, r) => sum + (r.penaltyAmountVnd || 0), 0);
  const totalUnpaidFundVnd = totalFundVnd - totalPaidFundVnd;

  const filteredReportRows = reportRows.filter(r => {
    if (reportSearch.trim()) {
      const q = reportSearch.trim().toLowerCase();
      if (!r.displayName.toLowerCase().includes(q)) return false;
    }
    if (reportFilter === 'committed') return r.hasPenalty;
    if (reportFilter === 'owing') return r.status === 'owing';
    if (reportFilter === 'safe') return r.status === 'safe';
    return true;
  });

  // All-time Cumulative rows (lấy tổng KM từ bảng challenge)
  const allTimeRows = React.useMemo(() => {
    const normalize = (s) => (s || '').trim().toLowerCase().replace(/[\.\s]/g, '');

    // 1. Gắn số KM All-Time từ bảng Challenge cho từng thành viên
    let list = (treasuryLedger || []).map(m => {
      const athId = m.athleteId ? String(m.athleteId) : null;
      const memNorm = normalize(m.fullName || m.rawName);

      // A. Khớp trực tiếp với dữ liệu bảng Challenge đang tính toán (live)
      const matchedChallenge = (penaltiesChallengeData || []).find(r => {
        if (athId && r.member?.id && String(r.member.id) === athId) return true;
        if (athId && r.athleteId && String(r.athleteId) === athId) return true;
        const rNorm = normalize(r.displayName || r.name || `${r.member?.firstname || ''} ${r.member?.lastname || ''}`);
        return rNorm && memNorm && (rNorm === memNorm || rNorm.includes(memNorm) || memNorm.includes(rNorm));
      });

      let challengeKm = null;
      if (matchedChallenge && matchedChallenge.allTimeDistance !== null && matchedChallenge.allTimeDistance !== undefined) {
        challengeKm = matchedChallenge.allTimeDistance;
      }

      // B. Nếu thành viên không nằm trong nhóm chạy tháng này, tra cứu từ Total-km base
      if (challengeKm === null && totalKmBase && Array.isArray(totalKmBase.items)) {
        const matchedBase = totalKmBase.items.find(it => {
          if (athId && it.athleteId && String(it.athleteId) === athId) return true;
          const itNorm = normalize(it.name);
          return itNorm && memNorm && (itNorm === memNorm || itNorm.includes(memNorm) || memNorm.includes(itNorm));
        });
        if (matchedBase && matchedBase.baseDistance !== null && matchedBase.baseDistance !== undefined) {
          challengeKm = matchedBase.baseDistance;
        }
      }

      // C. Dự phòng giá trị đã tính toán từ backend ledger / fallback Money.csv
      if (challengeKm === null) {
        if (m.financialSummary?.allTimeKmChallenge !== undefined && m.financialSummary?.allTimeKmChallenge !== null) {
          challengeKm = m.financialSummary.allTimeKmChallenge;
        } else if (m.allTimeKmChallenge !== undefined && m.allTimeKmChallenge !== null) {
          challengeKm = m.allTimeKmChallenge;
        } else if (m.financialSummary?.allTimeKm !== undefined && m.financialSummary?.allTimeKm !== null) {
          challengeKm = m.financialSummary.allTimeKm;
        } else {
          challengeKm = m.financialSummary?.allTimeKmMoneyFile || 0;
        }
      }

      return {
        ...m,
        challengeKm: Math.round(Number(challengeKm) * 10) / 10
      };
    });

    // 2. Tính lại Hạng KM (KM Rank) từ cao xuống thấp theo số KM bảng Challenge
    const sortedByKm = [...list].sort((a, b) => (b.challengeKm || 0) - (a.challengeKm || 0));
    const kmRankMap = new Map();
    sortedByKm.forEach((item, idx) => {
      const key = item.athleteId ? String(item.athleteId) : (item.rawName || item.fullName);
      kmRankMap.set(key, idx + 1);
    });

    list = list.map(item => {
      const key = item.athleteId ? String(item.athleteId) : (item.rawName || item.fullName);
      return {
        ...item,
        kmRank: kmRankMap.get(key) || '-'
      };
    });

    // 3. Lọc tìm kiếm theo tên hoặc Athlete ID
    if (allTimeSearch.trim()) {
      const q = allTimeSearch.trim().toLowerCase();
      list = list.filter(m => 
        (m.fullName && m.fullName.toLowerCase().includes(q)) ||
        (m.rawName && m.rawName.toLowerCase().includes(q)) ||
        (m.athleteId && String(m.athleteId).includes(q))
      );
    }

    // 4. Sắp xếp theo lựa chọn
    list.sort((a, b) => {
      if (allTimeSort === 'rank') return (b.financialSummary?.totalPenaltyVND || 0) - (a.financialSummary?.totalPenaltyVND || 0);
      if (allTimeSort === 'km') return (b.challengeKm || 0) - (a.challengeKm || 0);
      if (allTimeSort === 'name') return (a.fullName || a.rawName || '').localeCompare(b.fullName || b.rawName || '');
      return 0;
    });

    return list;
  }, [treasuryLedger, penaltiesChallengeData, totalKmBase, allTimeSearch, allTimeSort]);

  // Cash Flow sorted
  const sortedCashFlow = React.useMemo(() => {
    const list = [...(cashFlowData?.cashFlowLedger || [])];
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [cashFlowData]);

  // Initial loads
  useEffect(() => {
    loadConfig();
    loadGoal();
    loadAdmins();
    loadAdminPermissions();
    loadLogs();
    loadStorageStats();

    // Lấy danh sách clubs
    apiFetch('/clubs')
      .then(data => setClubs(data || []))
      .catch(err => console.error('Lỗi tải clubs:', err));

    const handleConfigChange = (e) => {
      if (e.detail && e.detail.allowEditOthers !== undefined) {
        setConfig(prev => ({ ...prev, allowEditOthers: e.detail.allowEditOthers }));
      }
    };
    const handleGoalUpdated = () => loadGoal();

    window.addEventListener('configChanged', handleConfigChange);
    window.addEventListener('goalUpdated', handleGoalUpdated);
    return () => {
      window.removeEventListener('configChanged', handleConfigChange);
      window.removeEventListener('goalUpdated', handleGoalUpdated);
    };
  }, [apiFetch]);

  // Load members when club is selected
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

  // Handlers for Timeline & Races
  const handleSaveGoalSettings = async (overrideData, showNotification = true) => {
    const dataToSave = overrideData || goalData;
    setSavingGoal(true);
    try {
      await apiFetch('/challenge/goal', {
        method: 'POST',
        body: JSON.stringify(dataToSave)
      });
      // Also save config because title is now visually in this section
      await apiFetch('/challenge/config', {
        method: 'POST',
        body: JSON.stringify(config)
      });
      window.dispatchEvent(new Event('challengeUpdated'));
      
      window.dispatchEvent(new Event('goalUpdated'));
      if (showNotification) {
        Swal.fire({
          icon: 'success',
          title: lang === 'en' ? 'Success' : 'Thành công',
          text: lang === 'en' ? 'Timeline and race events saved successfully!' : 'Đã lưu cấu hình Timeline và Giải chạy!',
          timer: 2000,
          showConfirmButton: false
        });
      }
      loadGoal();
    } catch (err) {
      Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', (lang === 'en' ? 'Cannot save goal config: ' : 'Không thể lưu cấu hình goal: ') + err.message, 'error');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleOpenAddRace = () => {
    setEditingRaceIndex(-1);
    setRaceForm({
      name: '',
      date: `${goalData.year || 2026}-01-01`,
      logoUrl: '',
      registrationUrl: '',
      icon: '🏅',
      type: 'race',
      location: '',
      note: ''
    });
    setRaceModalOpen(true);
  };

  const handleOpenEditRace = (index) => {
    setEditingRaceIndex(index);
    const item = goalData.events[index];
    setRaceForm({
      name: item?.name || '',
      date: item?.date || '',
      logoUrl: item?.logoUrl || '',
      registrationUrl: item?.registrationUrl || '',
      icon: item?.icon || '🏅',
      type: item?.type || 'race',
      location: item?.location || '',
      note: item?.note || ''
    });
    setRaceModalOpen(true);
  };

  const handleDeleteRace = async (index) => {
    const raceName = goalData.events[index]?.name || (lang === 'en' ? 'race event' : 'giải chạy');
    const result = await Swal.fire({
      title: lang === 'en' ? 'Confirm deletion?' : 'Xác nhận xóa?',
      text: lang === 'en' ? `Are you sure you want to remove "${raceName}" from timeline?` : `Bạn có chắc muốn xóa "${raceName}" khỏi timeline?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: lang === 'en' ? 'Yes, delete' : 'Đồng ý xóa',
      cancelButtonText: t('cancel')
    });

    if (result.isConfirmed) {
      const updatedEvents = goalData.events.filter((_, i) => i !== index);
      const updated = { ...goalData, events: updatedEvents };
      setGoalData(updated);
      handleSaveGoalSettings(updated, true);
    }
  };

  const handleSaveRaceModal = (e) => {
    e.preventDefault();
    if (!raceForm.name.trim()) {
      Swal.fire(
        lang === 'en' ? 'Missing Information' : 'Thiếu thông tin',
        lang === 'en' ? 'Please enter race / event name' : 'Vui lòng nhập tên giải chạy / sự kiện',
        'warning'
      );
      return;
    }

    const item = {
      id: editingRaceIndex >= 0 ? goalData.events[editingRaceIndex]?.id || `race_${Date.now()}` : `race_${Date.now()}`,
      name: raceForm.name.trim(),
      date: raceForm.date,
      logoUrl: raceForm.logoUrl.trim(),
      registrationUrl: raceForm.registrationUrl?.trim() || '',
      icon: raceForm.icon || '🏅',
      type: raceForm.type || 'race',
      location: raceForm.location.trim(),
      note: raceForm.note.trim()
    };

    let updatedEvents = [...goalData.events];
    if (editingRaceIndex >= 0) {
      updatedEvents[editingRaceIndex] = item;
    } else {
      updatedEvents.push(item);
    }

    // Sắp xếp các sự kiện theo ngày tăng dần
    updatedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    const updated = { ...goalData, events: updatedEvents };
    setGoalData(updated);
    setRaceModalOpen(false);
    handleSaveGoalSettings(updated, true);
  };

  // ==========================================
  // HANDLERS: SETTINGS
  // ==========================================
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await apiFetch('/challenge/config', {
        method: 'POST',
        body: JSON.stringify(config)
      });
      if (res && (res.success || res.title || res.participants)) {
        window.dispatchEvent(new CustomEvent('challengeUpdated'));
        Swal.fire({
          icon: 'success',
          title: lang === 'en' ? 'Success' : 'Thành công',
          text: lang === 'en' ? 'Challenge configuration saved successfully!' : 'Đã lưu cấu hình thử thách thành công!',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', (lang === 'en' ? 'Cannot save configuration: ' : 'Không thể lưu cấu hình: ') + err.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // ==========================================
  // HANDLERS: ROLES
  // ==========================================
  const handleAddAdmin = async (member) => {
    const uniqueId = member.id ? member.id.toString() : `${member.firstname}_${member.lastname}`;
    const memberName = `${member.firstname} ${member.lastname}`;
    try {
      const res = await apiFetch('/admins', {
        method: 'POST',
        body: JSON.stringify({ adminId: uniqueId, name: memberName })
      });
      if (res.success) {
        Swal.fire(
          lang === 'en' ? 'Success' : 'Thành công',
          lang === 'en' ? `Granted Admin role to ${memberName}` : `Đã cấp quyền Admin cho ${memberName}`,
          'success'
        );
        setSubAdmins(res.admins);
        loadLogs();
        loadStorageStats();
      }
    } catch (e) {
      Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', e.message || (lang === 'en' ? 'Cannot grant admin role' : 'Không thể cấp quyền admin'), 'error');
    }
  };

  const handleRemoveAdmin = async (adminInput) => {
    const adminObj = typeof adminInput === 'object' && adminInput !== null ? adminInput : { id: adminInput, name: adminInput };
    const targetId = adminObj.athleteId || adminObj.id || adminObj.matchKey;
    const targetName = adminObj.name || targetId;

    const confirm = await Swal.fire({
      title: lang === 'en' ? 'Revoke Admin Role?' : 'Thu hồi quyền Admin?',
      text: lang === 'en' ? `Are you sure you want to revoke admin role for: ${targetName}?` : `Bạn có chắc chắn muốn xóa quyền Admin của: ${targetName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: lang === 'en' ? 'Revoke Now' : 'Thu hồi ngay',
      cancelButtonText: t('cancel'),
      confirmButtonColor: '#d32f2f'
    });
    
    if (confirm.isConfirmed) {
      try {
        const res = await apiFetch(`/admins/${targetId}`, {
          method: 'DELETE'
        });
        if (res.success) {
          Swal.fire(
            lang === 'en' ? 'Revoked' : 'Đã thu hồi',
            lang === 'en' ? 'Admin role revoked successfully.' : 'Đã xóa quyền admin thành công.',
            'success'
          );
          setSubAdmins(res.admins);
          loadLogs();
          loadStorageStats();
        }
      } catch (e) {
        Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', e.message || (lang === 'en' ? 'Cannot revoke admin role' : 'Không thể xóa quyền admin'), 'error');
      }
    }
  };

  // Tải cấu hình phân quyền Sub-Admin từ server
  const loadAdminPermissions = async () => {
    try {
      const data = await apiFetch('/admin/permissions');
      if (data && data.defaultPermissions) {
        setAdminPermissions(data);
        if (selectedSubAdminScope === 'all') {
          setPermissionsForm(data.defaultPermissions);
        } else if (data.customPermissions && data.customPermissions[selectedSubAdminScope]) {
          setPermissionsForm({ ...data.defaultPermissions, ...data.customPermissions[selectedSubAdminScope] });
        } else {
          setPermissionsForm(data.defaultPermissions);
        }
      }
    } catch (e) {
      console.error('Lỗi tải permissions:', e);
    }
  };

  // Đồng bộ form quyền khi đổi đối tượng áp dụng
  useEffect(() => {
    if (!adminPermissions || !adminPermissions.defaultPermissions) return;
    if (selectedSubAdminScope === 'all') {
      setPermissionsForm(adminPermissions.defaultPermissions);
    } else if (adminPermissions.customPermissions && adminPermissions.customPermissions[selectedSubAdminScope]) {
      setPermissionsForm({ ...adminPermissions.defaultPermissions, ...adminPermissions.customPermissions[selectedSubAdminScope] });
    } else {
      setPermissionsForm(adminPermissions.defaultPermissions);
    }
  }, [selectedSubAdminScope, adminPermissions]);

  // Lưu cấu hình phân quyền Sub-Admin
  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    try {
      const updatedDefault = { ...adminPermissions.defaultPermissions };
      const updatedCustom = { ...(adminPermissions.customPermissions || {}) };

      if (selectedSubAdminScope === 'all') {
        Object.assign(updatedDefault, permissionsForm);
      } else {
        updatedCustom[selectedSubAdminScope] = { ...permissionsForm };
      }

      const res = await apiFetch('/admin/permissions', {
        method: 'POST',
        body: JSON.stringify({
          defaultPermissions: updatedDefault,
          customPermissions: updatedCustom
        })
      });

      if (res && res.success) {
        setAdminPermissions({
          defaultPermissions: updatedDefault,
          customPermissions: updatedCustom
        });
        Swal.fire({
          icon: 'success',
          title: lang === 'en' ? 'Saved Successfully' : 'Đã lưu thành công',
          text: lang === 'en' ? 'Sub-Admin permissions have been updated.' : 'Đã cập nhật bảng giới hạn tính năng cho Sub-Admin.',
          timer: 2000,
          showConfirmButton: false
        });
        loadLogs();
      } else {
        Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', res?.error || 'Failed to save permissions', 'error');
      }
    } catch (e) {
      Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', (lang === 'en' ? 'Cannot save permissions: ' : 'Không thể lưu phân quyền: ') + e.message, 'error');
    } finally {
      setSavingPermissions(false);
    }
  };

  // Reset về cấu hình an toàn mặc định
  const handleResetToSafeDefault = () => {
    setPermissionsForm({
      generalSettings: true,
      manageRoles: false,
      activityLogs: true,
      dataManagement: false,
      penaltiesTargets: true,
      syncStrava: true,
      importActivities: true
    });
  };

  // Kiểm tra quyền hạn khi Sub-Admin chuyển tab
  const effectivePermissions = isSuperAdmin ? {
    generalSettings: true,
    manageRoles: true,
    activityLogs: true,
    dataManagement: true,
    penaltiesTargets: true,
    syncStrava: true,
    importActivities: true
  } : (permissions || adminPermissions.defaultPermissions || {});

  const handleTabClick = (tabId) => {
    const tabPermMap = {
      settings: 'generalSettings',
      roles: 'manageRoles',
      logs: 'activityLogs',
      data: 'dataManagement',
      penalties: 'penaltiesTargets'
    };
    const reqPerm = tabPermMap[tabId];
    if (!isSuperAdmin && reqPerm && effectivePermissions[reqPerm] === false) {
      Swal.fire({
        icon: 'info',
        title: lang === 'en' ? 'Access Restricted' : 'Tính năng bị giới hạn',
        text: lang === 'en' 
          ? 'You do not have permission to access this module. Please contact Super Admin.' 
          : 'Bạn không có quyền truy cập chức năng này. Vui lòng liên hệ Super Admin.',
        confirmButtonColor: 'var(--accent)'
      });
      return;
    }
    setActiveTab(tabId);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    }, { replace: true });
  };

  // ==========================================
  // HANDLERS: AUDIT LOGS
  // ==========================================
  const handleClearLogs = async () => {
    const confirm = await Swal.fire({
      title: lang === 'en' ? 'Clear all audit logs?' : 'Xóa sạch nhật ký hoạt động?',
      text: lang === 'en' ? 'All historical audit log records will be permanently deleted.' : 'Toàn bộ bản ghi lịch sử audit log cũ sẽ bị xóa.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: lang === 'en' ? 'Clear All' : 'Xóa toàn bộ',
      cancelButtonText: t('cancel'),
      confirmButtonColor: '#d32f2f'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await apiFetch('/admin/audit-logs', { method: 'DELETE' });
        if (res.success) {
          Swal.fire(
            lang === 'en' ? 'Cleared' : 'Đã xóa',
            lang === 'en' ? 'Audit logs cleared successfully.' : 'Nhật ký hoạt động đã được làm sạch.',
            'success'
          );
          setLogs([]);
        }
      } catch (e) {
        Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', e.message || (lang === 'en' ? 'Cannot clear audit logs' : 'Không thể xóa nhật ký'), 'error');
      }
    }
  };

  // ==========================================
  // HANDLERS: DATA MANAGEMENT
  // ==========================================
  const handleSyncStorage = async () => {
    setProcessingAction(true);
    try {
      const res = await apiFetch('/challenge/sync-storage', { method: 'POST' });
      if (res.success) {
        Swal.fire(
          lang === 'en' ? 'Sync Completed' : 'Đồng bộ hoàn tất',
          lang === 'en' ? `Scanned and merged ${res.count} activities from Storage successfully!` : `Đã quét và hợp nhất thành công ${res.count} hoạt động từ thư mục Storage!`,
          'success'
        );
        loadStorageStats();
        loadLogs();
      }
    } catch (e) {
      Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', (lang === 'en' ? 'Cannot sync: ' : 'Không thể đồng bộ: ') + e.message, 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCreateBackup = async () => {
    setProcessingAction(true);
    try {
      const res = await apiFetch('/admin/backup', { method: 'POST' });
      if (res.success) {
        Swal.fire(
          lang === 'en' ? 'Backup Created Successfully' : 'Tạo bản sao lưu thành công',
          lang === 'en' ? `Backup file created: <b>${res.filename}</b>` : `File backup đã được lưu: <b>${res.filename}</b>`,
          'success'
        );
        loadLogs();
        loadStorageStats();
      }
    } catch (e) {
      Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', (lang === 'en' ? 'Cannot create backup: ' : 'Không thể tạo bản sao lưu: ') + e.message, 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSyncMembers = async () => {
    setProcessingAction(true);
    try {
      const res = await apiFetch('/admin/sync-members', { method: 'POST' });
      if (res.success) {
        Swal.fire(
          lang === 'en' ? 'Success' : 'Thành công',
          lang === 'en' ? `Synced Name and Avatar for ${res.updatedCount} members in Challenge!` : `Đã đồng bộ Tên và Avatar cho ${res.updatedCount} thành viên trong Challenge!`,
          'success'
        );
        loadLogs();
        loadStorageStats();
        window.dispatchEvent(new Event('challengeUpdated'));
      }
    } catch (e) {
      Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', (lang === 'en' ? 'Cannot sync members: ' : 'Không thể đồng bộ thành viên: ') + e.message, 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  // =========================================================================
  // BỘ 3 GIẢI PHÁP ĐỒNG BỘ & BẢO TOÀN DỮ LIỆU (VỚI POPUP GIẢI THÍCH CHI TIẾT)
  // =========================================================================

  // [GIẢI PHÁP 1] Tải toàn bộ Storage (ZIP)
  const handleExportZipWithConfirm = async () => {
    const confirm = await Swal.fire({
      title: lang === 'en' ? '📦 1. Export Full Storage (ZIP)?' : '📦 1. Tải Toàn Bộ Storage (ZIP)?',
      html: `
        <div style="text-align: left; font-size: 0.88rem; line-height: 1.6; color: #334155;">
          <p style="margin-bottom: 8px;"><b>${lang === 'en' ? '✨ Features:' : '✨ Tính năng:'}</b> ${lang === 'en' ? 'Package all data files in the <code>Storage/</code> directory (including <code>imported_activities.json</code>, <code>targets.json</code>, <code>challenge_config.json</code>, name mappings, synchronized CSV files...) into <b>a single ZIP file</b>.' : 'Đóng gói toàn bộ các tệp dữ liệu trong thư mục <code>Storage/</code> (gồm <code>imported_activities.json</code>, <code>targets.json</code>, <code>challenge_config.json</code>, mapping tên, các file CSV đồng bộ...) thành <b>1 file nén ZIP duy nhất</b>.'}</p>
          <p style="margin-bottom: 8px;"><b>${lang === 'en' ? '💾 Storage Location:' : '💾 Nơi lưu trữ:'}</b> ${lang === 'en' ? 'The browser will automatically download the file <code>strava-app-storage-....zip</code> to the <b>Downloads</b> folder on your computer.' : 'Trình duyệt sẽ tự động tải file <code>strava-app-storage-....zip</code> về thư mục <b>Downloads</b> trên máy tính cá nhân của bạn.'}</p>
          <p style="margin-bottom: 0;"><b>${lang === 'en' ? '🛡️ Protection Purpose:' : '🛡️ Mục đích bảo vệ:'}</b> ${lang === 'en' ? '100% safe backup of your data before source code updates or guarding against Render server restarts.' : 'Sao lưu an toàn 100% dữ liệu trước khi cập nhật mã nguồn hoặc phòng ngừa rủi ro máy chủ Render khởi động lại.'}</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: lang === 'en' ? 'Download ZIP Now' : 'Tiến hành tải ZIP ngay',
      cancelButtonText: lang === 'en' ? 'Cancel' : 'Hủy bỏ',
      confirmButtonColor: '#1d4ed8'
    });

    if (confirm.isConfirmed) {
      window.open('/api/storage/export-zip', '_blank');
      Swal.fire({
        title: lang === 'en' ? 'Downloading...' : 'Đang tải xuống...',
        text: lang === 'en' ? 'Your ZIP file is downloading to your computer.' : 'File ZIP đang được tải về thư mục Downloads của bạn.',
        icon: 'success',
        timer: 2500,
        showConfirmButton: false
      });
    }
  };

  // [GIẢI PHÁP 2] Kéo dữ liệu từ Cloud Render về máy tính
  const handlePullFromCloudWithConfirm = async () => {
    const confirm = await Swal.fire({
      title: lang === 'en' ? '☁️⬇️ 2. Pull Data from Cloud Render?' : '☁️⬇️ 2. Kéo Dữ Liệu Từ Cloud Render Về Máy?',
      html: `
        <div style="text-align: left; font-size: 0.88rem; line-height: 1.6; color: #334155;">
          <p style="margin-bottom: 8px;"><b>${lang === 'en' ? '🌐 Feature:' : '🌐 Tính năng:'}</b> ${lang === 'en' ? 'Automatically connect to Render Cloud (<code>https://strava-app-86t5.onrender.com</code>) to retrieve the latest activities and pledges synced by <b>Sub-Admins</b>.' : 'Tự động kết nối tới máy chủ Cloud Render (<code>https://strava-app-86t5.onrender.com</code>) để lấy dữ liệu hoạt động và cam kết mới nhất do <b>Sub-Admin</b> vừa đồng bộ.'}</p>
          <p style="margin-bottom: 8px;"><b>${lang === 'en' ? '📂 Updated Files:' : '📂 Các tệp cập nhật:'}</b> <code>imported_activities.json</code>, <code>targets.json</code>, <code>challenge_config.json</code>, <code>admins.json</code>.</p>
          <p style="margin-bottom: 8px;"><b>${lang === 'en' ? '⚠️ Impact:' : '⚠️ Tác động:'}</b> ${lang === 'en' ? 'Data on your local computer will be synchronized with the latest version from Cloud.' : 'Dữ liệu trên máy tính local của bạn sẽ được cập nhật đồng bộ với bản mới nhất từ Cloud.'}</p>
          <p style="margin-bottom: 0;"><b>${lang === 'en' ? '💡 Recommendation:' : '💡 Khuyến nghị:'}</b> ${lang === 'en' ? 'After pulling successfully, you can run <code>git push</code> in terminal to permanently save data to GitHub, preventing data loss 100%!' : 'Sau khi kéo về thành công, bạn chỉ cần mở terminal chạy <code>git push</code> để lưu vĩnh viễn dữ liệu đó vào GitHub, chống mất dữ liệu 100%!'}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: lang === 'en' ? 'Pull Data Now' : 'Tiến hành kéo dữ liệu',
      cancelButtonText: lang === 'en' ? 'Cancel' : 'Hủy bỏ',
      confirmButtonColor: '#0f766e'
    });

    if (confirm.isConfirmed) {
      setProcessingAction(true);
      try {
        const res = await apiFetch('/storage/pull-from-cloud', { method: 'POST' });
        if (res.success) {
          loadStorageStats();
          loadLogs();
          window.dispatchEvent(new Event('challengeUpdated'));

          // Hiển thị popup thành công kèm nút "Git Push" ngay cạnh nút "OK"
          const pullResult = await Swal.fire({
            title: lang === 'en' ? 'Pull Completed!' : 'Kéo dữ liệu thành công!',
            html: `
              <div style="text-align: left; font-size: 0.88rem; color: #334155; line-height: 1.6;">
                <p><b>${lang === 'en' ? 'Source:' : 'Nguồn:'}</b> <code>${res.source}</code></p>
                <p><b>${lang === 'en' ? 'Updated files:' : 'Đã cập nhật các tệp:'}</b></p>
                <ul style="margin: 6px 0 12px 18px;">${(res.updated || []).map(u => `<li><b>${u}</b></li>`).join('')}</ul>
                <p style="color: #059669; font-weight: 700;">${lang === 'en' ? '✅ Local data has been synchronized with Cloud Sub-Admin!' : '✅ Dữ liệu trên máy bạn đã được đồng bộ với Sub-Admin trên Cloud!'}</p>
              </div>
            `,
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: '🚀 Git Push',
            cancelButtonText: lang === 'en' ? 'Close' : 'Đóng',
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#7066e0',
            reverseButtons: true
          });

          if (pullResult.isConfirmed) {
            await handleGitPushDirect();
          }
        } else {
          Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', res.error || (lang === 'en' ? 'Unknown error' : 'Lỗi không xác định'), 'error');
        }
      } catch (e) {
        Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', (lang === 'en' ? 'Cannot pull data: ' : 'Không thể kéo dữ liệu: ') + e.message, 'error');
      } finally {
        setProcessingAction(false);
      }
    }
  };

  // [GIT PUSH] Chạy trực tiếp lệnh git push lên GitHub
  const handleGitPushDirect = async () => {
    setProcessingAction(true);
    Swal.fire({
      title: lang === 'en' ? 'Pushing to GitHub...' : 'Đang đẩy lên GitHub...',
      html: lang === 'en' ? 'Executing <code>git push origin main</code>. Please wait...' : 'Hệ thống đang thực thi lệnh <code>git push origin main</code>. Vui lòng đợi trong giây lát...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const res = await apiFetch('/admin/git-push', { method: 'POST' });
      if (res.success) {
        await Swal.fire({
          title: lang === 'en' ? 'Git Push Successful!' : 'Git Push Thành Công!',
          html: `
            <div style="text-align: left; font-size: 0.88rem; color: #334155; line-height: 1.6;">
              <p style="color: #16a34a; font-weight: 700; margin-bottom: 8px;">${lang === 'en' ? '✅ Successfully pushed all data to GitHub (origin/main)!' : '✅ Đã đẩy thành công toàn bộ dữ liệu lên GitHub (origin/main)!'}</p>
              ${res.commitMessage ? `<p style="margin-bottom: 6px; color: #0284c7;"><b>📝 Commit:</b> ${res.commitMessage}</p>` : ''}
              <p style="margin-bottom: 8px;">${lang === 'en' ? '🚀 Render Cloud will automatically deploy the latest update.' : '🚀 Render Cloud sẽ tự động triển khai (deploy) bản cập nhật mới nhất.'}</p>
              <pre style="background: #f1f5f9; padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; overflow-x: auto; max-height: 100px;">${res.output || 'To https://github.com/Tienptv/strava-app.git\nmain -> main'}</pre>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#16a34a',
          confirmButtonText: lang === 'en' ? 'OK' : 'Đã hiểu'
        });
        loadLogs();
        loadStorageStats();
      } else {
        Swal.fire(lang === 'en' ? 'Git Push Failed' : 'Git Push Thất Bại', res.error || (lang === 'en' ? 'Unknown error' : 'Lỗi không xác định'), 'error');
      }
    } catch (e) {
      Swal.fire(lang === 'en' ? 'Error' : 'Lỗi Git Push', (lang === 'en' ? 'Cannot execute git push: ' : 'Không thể chạy git push: ') + e.message, 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  // [GIT PUSH] Có popup xác nhận khi bấm từ toolbar
  const handleGitPushWithConfirm = async () => {
    const confirmPush = await Swal.fire({
      title: lang === 'en' ? '🚀 Run Git Push?' : '🚀 Chạy Lệnh Git Push?',
      html: `
        <div style="text-align: left; font-size: 0.88rem; line-height: 1.6; color: #334155;">
          <p style="margin-bottom: 8px;"><b>${lang === 'en' ? '💻 Command:' : '💻 Lệnh thực thi:'}</b> <code>git push origin main</code></p>
          <p style="margin-bottom: 8px;"><b>${lang === 'en' ? '📦 Content:' : '📦 Nội dung:'}</b> ${lang === 'en' ? 'Push all data in <code>Storage/</code> directory and pending commits to GitHub repository.' : 'Đẩy toàn bộ dữ liệu trong thư mục <code>Storage/</code> và các thay đổi lên kho GitHub.'}</p>
          <p style="margin-bottom: 0;"><b>${lang === 'en' ? '☁️ Cloud Impact:' : '☁️ Tác động Cloud:'}</b> ${lang === 'en' ? 'Render will automatically detect new commits and deploy the latest version!' : 'Render sẽ tự động nhận diện commit mới và cập nhật bản mới nhất!'}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: lang === 'en' ? 'Git Push Now' : 'Tiến hành Git Push ngay',
      cancelButtonText: lang === 'en' ? 'Cancel' : 'Hủy bỏ',
      confirmButtonColor: '#16a34a'
    });

    if (confirmPush.isConfirmed) {
      await handleGitPushDirect();
    }
  };

  // [GIẢI PHÁP 3] Đẩy dữ liệu từ máy tính lên Cloud Render
  const handlePushToCloudWithConfirm = async () => {
    const confirm = await Swal.fire({
      title: lang === 'en' ? '💻⬆️ 3. Push Local Data to Cloud Render?' : '💻⬆️ 3. Đẩy Dữ Liệu Từ Máy Lên Cloud Render?',
      html: `
        <div style="text-align: left; font-size: 0.88rem; line-height: 1.6; color: #334155;">
          <p style="margin-bottom: 8px;"><b>${lang === 'en' ? '💻 Feature:' : '💻 Tính năng:'}</b> ${lang === 'en' ? 'Push local activities, goals, and admin list directly to Render Cloud (<code>https://strava-app-86t5.onrender.com</code>).' : 'Lấy dữ liệu hoạt động, mục tiêu và danh sách admin từ máy tính của bạn đẩy trực tiếp lên Cloud Render (<code>https://strava-app-86t5.onrender.com</code>).'}</p>
          <p style="margin-bottom: 8px;"><b>${lang === 'en' ? '📂 Data Pushed:' : '📂 Dữ liệu được đẩy:'}</b> Toàn bộ <code>imported_activities.json</code>, <code>targets.json</code>, <code>challenge_config.json</code>, <code>admins.json</code>.</p>
          <p style="margin-bottom: 8px;"><b>${lang === 'en' ? '⚠️ Impact:' : '⚠️ Tác động:'}</b> ${lang === 'en' ? 'The web Challenge table on Render will update immediately for all Sub-Admins and Runners <b>without needing a server redeploy</b>!' : 'Bảng Challenge trên web Render sẽ cập nhật ngay lập tức cho tất cả Sub-Admin và Runner cùng thấy mà <b>không cần phải deploy lại server</b>!'}</p>
          <p style="margin-bottom: 0;"><b>${lang === 'en' ? '🛡️ Benefit:' : '🛡️ Lợi ích:'}</b> ${lang === 'en' ? 'Instant updates in just 1-2 seconds.' : 'Cập nhật tức thì chỉ sau 1-2 giây.'}</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: lang === 'en' ? 'Push to Cloud Now' : 'Tiến hành đẩy lên Cloud',
      cancelButtonText: lang === 'en' ? 'Cancel' : 'Hủy bỏ',
      confirmButtonColor: '#c2410c'
    });

    if (confirm.isConfirmed) {
      setProcessingAction(true);
      try {
        const res = await apiFetch('/storage/push-to-cloud', { method: 'POST' });
        if (res.success) {
          await Swal.fire({
            title: lang === 'en' ? 'Push Completed!' : 'Đẩy dữ liệu thành công!',
            html: `
              <div style="text-align: left; font-size: 0.88rem; color: #334155; line-height: 1.6;">
                <p><b>${lang === 'en' ? 'Destination:' : 'Đích đến:'}</b> <code>${res.target}</code></p>
                <p><b>${lang === 'en' ? 'Updated on Render Cloud:' : 'Đã cập nhật lên Render Cloud:'}</b></p>
                <ul style="margin: 6px 0 12px 18px;">${(res.updated || []).map(u => `<li><b>${u}</b></li>`).join('')}</ul>
                <p style="color: #059669; font-weight: 700;">${lang === 'en' ? '✅ All cloud users and Sub-Admins can now see the latest data!' : '✅ Tất cả người dùng và Sub-Admin trên Cloud hiện đã nhìn thấy dữ liệu mới nhất!'}</p>
              </div>
            `,
            icon: 'success',
            confirmButtonColor: '#00A3A6',
            confirmButtonText: lang === 'en' ? 'OK' : 'Đã hiểu'
          });
          loadLogs();
        } else {
          Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', res.error || (lang === 'en' ? 'Unknown error' : 'Lỗi không xác định'), 'error');
        }
      } catch (e) {
        Swal.fire(lang === 'en' ? 'Error' : 'Lỗi', (lang === 'en' ? 'Cannot push data: ' : 'Không thể đẩy dữ liệu: ') + e.message, 'error');
      } finally {
        setProcessingAction(false);
      }
    }
  };

  // Tải 1 file đơn lẻ từ Storage về máy
  const handleDownloadSingleFile = async (filename) => {
    const confirm = await Swal.fire({
      title: lang === 'en' ? `Download ${filename}?` : `Tải tệp ${filename}?`,
      text: lang === 'en' ? 'This file will be downloaded to your computer.' : 'Tệp này sẽ được tải về máy tính của bạn.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: lang === 'en' ? 'Download' : 'Tải về ngay',
      cancelButtonText: lang === 'en' ? 'Cancel' : 'Hủy bỏ',
      confirmButtonColor: '#0284c7'
    });

    if (confirm.isConfirmed) {
      window.open(`/api/storage/download/${encodeURIComponent(filename)}`, '_blank');
    }
  };

  // Filters
  const filteredMembers = (members || []).filter(m => {
    if (!m) return false;
    const fullName = `${m.firstname || ''} ${m.lastname || ''}`.toLowerCase();
    const idStr = (m.id || '').toString();
    const query = (memberSearchQuery || '').trim().toLowerCase();
    if (!query) return true;
    return fullName.includes(query) || idStr.includes(query);
  });

  const filteredLogs = logs.filter(l => {
    const q = logSearchQuery.toLowerCase();
    return (
      (l.action || '').toLowerCase().includes(q) ||
      (l.user || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q)
    );
  });

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '–';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString('vi-VN');
  };

  return (
    <div className="dashboard" style={{ padding: '20px 24px 8px 24px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="btn btn--secondary" 
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> {lang === 'en' ? 'Back to Dashboard' : 'Trở về Dashboard'}
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={28} color="var(--accent)" /> {t('adminTitle')}
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {t('adminSubtitle')}
            </p>
          </div>
        </div>

        {/* Admin Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isSuperAdmin ? (
            <span style={{ 
              background: 'linear-gradient(135deg, #002D54 0%, #00A3A6 100%)', 
              color: '#fff', padding: '6px 14px', borderRadius: '20px', 
              fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 163, 166, 0.3)'
            }}>
              {t('superAdminFull')}
            </span>
          ) : (
            <span style={{ 
              background: 'rgba(0, 45, 84, 0.08)', 
              color: 'var(--primary-navy)', padding: '6px 14px', borderRadius: '20px', 
              fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px',
              border: '1px solid var(--border)'
            }}>
              {t('subAdminBadge')}
            </span>
          )}
        </div>
      </div>

      {/* 4 Main Module Buttons / Tabs */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '12px', 
        marginBottom: '16px' 
      }}>
        {/* Tab 1 */}
        <button
          onClick={() => handleTabClick('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '12px',
            border: activeTab === 'settings' ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: activeTab === 'settings' ? '#ffffff' : 'var(--bg-glass)',
            boxShadow: activeTab === 'settings' ? '0 6px 16px rgba(0, 163, 166, 0.15)' : 'none',
            color: activeTab === 'settings' ? 'var(--primary-navy)' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            fontWeight: activeTab === 'settings' ? 700 : 500,
            opacity: !isSuperAdmin && effectivePermissions.generalSettings === false ? 0.6 : 1
          }}
        >
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '10px', 
            background: activeTab === 'settings' ? 'var(--accent)' : 'rgba(0, 45, 84, 0.06)', 
            color: activeTab === 'settings' ? '#fff' : 'var(--primary-navy)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Settings size={22} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{t('tab1Title')}</div>
            {!isSuperAdmin && effectivePermissions.generalSettings === false && <Lock size={14} color="#94a3b8" />}
          </div>
        </button>

        {/* Tab 2 */}
        <button
          onClick={() => handleTabClick('roles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '12px',
            border: activeTab === 'roles' ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: activeTab === 'roles' ? '#ffffff' : 'var(--bg-glass)',
            boxShadow: activeTab === 'roles' ? '0 6px 16px rgba(0, 163, 166, 0.15)' : 'none',
            color: activeTab === 'roles' ? 'var(--primary-navy)' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            fontWeight: activeTab === 'roles' ? 700 : 500,
            opacity: !isSuperAdmin && effectivePermissions.manageRoles === false ? 0.6 : 1
          }}
        >
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '10px', 
            background: activeTab === 'roles' ? 'var(--accent)' : 'rgba(0, 45, 84, 0.06)', 
            color: activeTab === 'roles' ? '#fff' : 'var(--primary-navy)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Users size={22} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{t('tab2Title')}</div>
            {!isSuperAdmin && effectivePermissions.manageRoles === false && <Lock size={14} color="#94a3b8" />}
          </div>
        </button>

        {/* Tab 3 */}
        <button
          onClick={() => handleTabClick('logs')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '12px',
            border: activeTab === 'logs' ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: activeTab === 'logs' ? '#ffffff' : 'var(--bg-glass)',
            boxShadow: activeTab === 'logs' ? '0 6px 16px rgba(0, 163, 166, 0.15)' : 'none',
            color: activeTab === 'logs' ? 'var(--primary-navy)' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            fontWeight: activeTab === 'logs' ? 700 : 500,
            opacity: !isSuperAdmin && effectivePermissions.activityLogs === false ? 0.6 : 1
          }}
        >
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '10px', 
            background: activeTab === 'logs' ? 'var(--accent)' : 'rgba(0, 45, 84, 0.06)', 
            color: activeTab === 'logs' ? '#fff' : 'var(--primary-navy)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FileText size={22} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{t('tab3Title')}</div>
            {!isSuperAdmin && effectivePermissions.activityLogs === false && <Lock size={14} color="#94a3b8" />}
          </div>
        </button>

        {/* Tab 4 */}
        <button
          onClick={() => handleTabClick('data')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '12px',
            border: activeTab === 'data' ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: activeTab === 'data' ? '#ffffff' : 'var(--bg-glass)',
            boxShadow: activeTab === 'data' ? '0 6px 16px rgba(0, 163, 166, 0.15)' : 'none',
            color: activeTab === 'data' ? 'var(--primary-navy)' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            fontWeight: activeTab === 'data' ? 700 : 500,
            opacity: !isSuperAdmin && effectivePermissions.dataManagement === false ? 0.6 : 1
          }}
        >
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '10px', 
            background: activeTab === 'data' ? 'var(--accent)' : 'rgba(0, 45, 84, 0.06)', 
            color: activeTab === 'data' ? '#fff' : 'var(--primary-navy)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Database size={22} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{t('tab4Title')}</div>
            {!isSuperAdmin && effectivePermissions.dataManagement === false && <Lock size={14} color="#94a3b8" />}
          </div>
        </button>

        {/* Tab 5: Báo cáo & Cam kết Phạt */}
        <button
          onClick={() => handleTabClick('penalties')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '12px',
            border: activeTab === 'penalties' ? '2px solid #ea580c' : '1px solid var(--border)',
            background: activeTab === 'penalties' ? '#ffffff' : 'var(--bg-glass)',
            boxShadow: activeTab === 'penalties' ? '0 6px 16px rgba(234, 88, 12, 0.18)' : 'none',
            color: activeTab === 'penalties' ? '#c2410c' : 'var(--text-secondary)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            fontWeight: activeTab === 'penalties' ? 700 : 500,
            opacity: !isSuperAdmin && effectivePermissions.penaltiesTargets === false ? 0.6 : 1
          }}
        >
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '10px', 
            background: activeTab === 'penalties' ? '#ea580c' : 'rgba(234, 88, 12, 0.1)', 
            color: activeTab === 'penalties' ? '#fff' : '#c2410c',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <DollarSign size={22} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{t('tab5Title')}</div>
            {!isSuperAdmin && effectivePermissions.penaltiesTargets === false && <Lock size={14} color="#94a3b8" />}
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT 1: CẤU HÌNH CHUNG (CHALLENGE SETTINGS)                        */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          
          <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <Settings size={22} color="var(--accent)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-navy)', margin: 0 }}>
                {t('rulesAndGoals')}
              </h2>
            </div>

            {loadingConfig ? (
              <p>{t('loadingConfig')}</p>
            ) : config ? (
              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--primary-navy)' }}>
                      {t('defaultTargetLabel')}
                    </label>
                    <input 
                      type="number"
                      value={config.defaultTarget || 50}
                      onChange={(e) => setConfig({ ...config, defaultTarget: Number(e.target.value) })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--primary-navy)' }}>
                      {t('penaltyRateLabel')}
                    </label>
                    <input 
                      type="number"
                      value={config.penaltyRate || 10000}
                      onChange={(e) => setConfig({ ...config, penaltyRate: Number(e.target.value) })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                <div style={{ 
                  background: 'rgba(0, 163, 166, 0.05)', 
                  padding: '14px', 
                  borderRadius: '10px', 
                  border: '1px dashed var(--accent)',
                  marginTop: '4px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: 'var(--primary-navy)', fontSize: '0.9rem' }}>
                    <input 
                      type="checkbox" 
                      id="allowEditAdmin" 
                      checked={!!config.allowEditOthers}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setConfig({ ...config, allowEditOthers: checked });
                        window.dispatchEvent(new CustomEvent('configChanged', { detail: { allowEditOthers: checked } }));
                      }}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                    />
                    {t('allowEditAthletesLabel')}
                  </label>
                  <p style={{ margin: '6px 0 0 28px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {t('allowEditAthletesDesc')}
                  </p>
                </div>

                <button 
                  type="submit" 
                  className="btn btn--primary" 
                  disabled={savingConfig}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', borderRadius: '8px', fontWeight: 700, marginTop: '8px'
                  }}
                >
                  <Save size={18} /> {savingConfig ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Challenge Configuration' : 'Lưu Cấu Hình Thử Thách')}
                </button>
              </form>
            ) : (
              <p>{lang === 'en' ? 'No configuration available' : 'Không có cấu hình'}</p>
            )}
          </div>

          {/* Quick Help & Status */}
          <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <Activity size={22} color="var(--accent)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-navy)', margin: 0 }}>
                {lang === 'en' ? 'System Operations' : 'Thông tin Vận hành'}
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: '10px', borderLeft: '4px solid #00A3A6' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.9rem' }}>
                  {lang === 'en' ? 'Eligible Sports:' : 'Bộ môn được tính điểm:'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {lang === 'en' 
                    ? '🏃 Run, 🏃‍♂️ Trail Run, 🏃‍♂️ Virtual Run (indoor / treadmill).' 
                    : '🏃 Run (Chạy bộ), 🏃‍♂️ Trail Run (Chạy địa hình), 🏃‍♂️ Virtual Run (Chạy trong nhà/máy).'}
                </div>
              </div>

              <div style={{ padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: '10px', borderLeft: '4px solid #B5D334' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.9rem' }}>
                  {lang === 'en' ? 'Smart Sync Rules:' : 'Quy tắc đồng bộ thông minh:'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {lang === 'en' 
                    ? 'Automatically deduplicates activities and normalizes GMT+7 timezone when importing CSV or scraping.' 
                    : 'Tự động loại bỏ bản ghi trùng lặp và làm sạch timezone GMT+7 khi import file CSV hoặc cạo dữ liệu.'}
                </div>
              </div>

              <div style={{ padding: '12px 16px', background: 'var(--bg-glass)', borderRadius: '10px', borderLeft: '4px solid #002D54' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.9rem' }}>
                  {lang === 'en' ? 'Timezone & Cycle:' : 'Múi giờ & Chu kỳ:'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {lang === 'en' 
                    ? 'Calculated monthly from 1st to end of month in Vietnam time (GMT+7).' 
                    : 'Tính toán theo tháng từ 01 đến 31 hàng tháng theo giờ Việt Nam.'}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CARD 3: QUẢN LÝ TIMELINE NĂM & CÁC GIẢI CHẠY (ANNUAL TIMELINE & RACES)    */}
          {/* ========================================================================= */}
          <div className="card" style={{ gridColumn: '1 / -1', padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(0, 163, 166, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-navy)', margin: 0 }}>
                    {lang === 'en' ? 'Annual Timeline & Race Events Management' : 'Quản Lý Timeline Năm & Các Giải Chạy (Annual Timeline)'}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {lang === 'en' 
                      ? 'Configure year, target distance, runner animation mode and annual race events' 
                      : 'Cấu hình năm, mục tiêu cự ly, cơ chế hiển thị của Runner và thiết lập danh sách các giải chạy / sự kiện nổi bật'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={handleOpenAddRace}
                  className="btn btn--secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontWeight: 600, color: 'var(--accent)', borderColor: 'var(--accent)' }}
                >
                  <Plus size={16} /> {t('addRaceBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveGoalSettings(null, true)}
                  disabled={savingGoal}
                  className="btn btn--primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontWeight: 700 }}
                >
                  <Save size={16} /> {savingGoal ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Settings' : 'Lưu Thiết Lập')}
                </button>
              </div>
            </div>

            {/* Form Cấu hình cơ bản Timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--primary-navy)' }}>
                  {lang === 'en' ? 'Monthly Goal' : 'Mục tiêu của tháng'}
                </label>
                <input 
                  type="text"
                  value={config?.title || 'Journey from HCMC to the North Pole'}
                  onChange={(e) => setConfig({ ...(config || {}), title: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  placeholder={t('challengeTitlePlaceholder')}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--primary-navy)' }}>
                  {lang === 'en' ? 'Challenge Year' : 'Năm Thử Thách'}
                </label>
                <input 
                  type="number"
                  value={goalData.year || 2026}
                  onChange={(e) => setGoalData({ ...goalData, year: parseInt(e.target.value) || 2026 })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--primary-navy)' }}>
                  {lang === 'en' ? 'Monthly Target (km)' : 'Mục tiêu Tháng (km)'}
                </label>
                <input 
                  type="number"
                  value={goalData.targetKm || 600}
                  onChange={(e) => setGoalData({ ...goalData, targetKm: parseInt(e.target.value) || 600 })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--primary-navy)' }}>
                  {lang === 'en' ? 'Timeline Title (Custom)' : 'Tiêu đề Timeline (Custom Title)'}
                </label>
                <input 
                  type="text"
                  value={goalData.customTitle || ''}
                  placeholder={`Haskoning Vietnam Running Journey ${goalData.year || 2026}`}
                  onChange={(e) => setGoalData({ ...goalData, customTitle: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--primary-navy)' }}>
                  {lang === 'en' ? 'Subtitle (Custom)' : 'Thông điệp / Phụ đề (Custom Subtitle)'}
                </label>
                <input 
                  type="text"
                  value={goalData.customSubtitle || ''}
                  placeholder={lang === 'en' ? 'Journey to conquer annual goals & major races' : 'Hành trình chinh phục mục tiêu năm & các giải chạy lớn'}
                  onChange={(e) => setGoalData({ ...goalData, customSubtitle: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {/* Tùy chọn hiển thị & Cơ chế di chuyển của Runner */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.9rem', marginBottom: '10px' }}>
                ⚙️ {lang === 'en' ? 'Display Options & Runner Movement Mode:' : 'Tùy chọn hiển thị & Cơ chế di chuyển của Runner:'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  <input 
                    type="checkbox"
                    checked={goalData.showAnnualGoal !== false}
                    onChange={(e) => {
                      const nextVal = e.target.checked;
                      const updated = { ...goalData, showAnnualGoal: nextVal };
                      setGoalData(updated);
                      handleSaveGoalSettings(updated, false);
                    }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                  />
                  <span>{lang === 'en' ? 'Show Annual Target KPI in top-right corner' : 'Hiển thị Chỉ số Mục tiêu cả năm (km) ở góc trên bên phải'}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  <input 
                    type="checkbox"
                    checked={goalData.showTodayMarker}
                    onChange={(e) => setGoalData({ ...goalData, showTodayMarker: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                  />
                  <span>{lang === 'en' ? 'Show Today Marker with radar pulse' : 'Hiển thị Vạch Ngày hôm nay (Today Marker) có hiệu ứng Radar'}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  <input 
                    type="checkbox"
                    checked={goalData.showDistanceProgress}
                    onChange={(e) => setGoalData({ ...goalData, showDistanceProgress: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                  />
                  <span>{lang === 'en' ? 'Enable Distance Progress fill (Mode A)' : 'Bật hiển thị Tiến độ Cự ly km (Cách A)'}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  <input 
                    type="checkbox"
                    checked={goalData.showTimeProgress}
                    onChange={(e) => setGoalData({ ...goalData, showTimeProgress: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                  />
                  <span>{lang === 'en' ? 'Enable Real-time Annual Progress fill (Mode B)' : 'Bật hiển thị Tiến độ Thời gian thực trong năm (Cách B)'}</span>
                </label>
              </div>

              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(0, 163, 166, 0.08)', borderRadius: '8px', borderLeft: '4px solid var(--accent)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {lang === 'en' 
                  ? <span><strong>💡 Runner Movement Rule:</strong> When both modes are active, the Runner prioritizes <strong>Mode B (Real-time in year)</strong> while the distance progress bar displays actual km. If one is disabled, the Runner follows the remaining mode.</span>
                  : <span><strong>💡 Quy tắc điều khiển vị trí Runner:</strong> Nếu cả 2 cách cùng bật, Runner ưu tiên di chuyển theo <strong>Cách B (Thời gian thực trong năm)</strong> và dải fill thể hiện cự ly km. Nếu một cách bị ẩn, Runner sẽ tự động di chuyển theo cách còn lại.</span>}
              </div>
            </div>

            {/* Danh sách các Giải chạy & Sự kiện */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="var(--accent)" />
                  {lang === 'en' ? `Timeline Races & Events (${(goalData?.events || []).length})` : `Danh Sách Giải Chạy & Sự Kiện Trên Timeline (${(goalData?.events || []).length})`}
                </h3>
              </div>

              {(goalData?.events || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <Trophy size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px', fontSize: '0.9rem' }}>
                    {lang === 'en' ? `No races configured for year ${goalData.year || 2026}.` : `Chưa có giải chạy nào được cấu hình cho năm ${goalData.year || 2026}.`}
                  </p>
                  <button 
                    type="button" 
                    onClick={handleOpenAddRace}
                    className="btn btn--primary" 
                    style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 600 }}
                  >
                    <Plus size={16} /> {lang === 'en' ? 'Add First Race' : 'Thêm giải chạy đầu tiên'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {(goalData?.events || []).map((ev, idx) => (
                    <div 
                      key={ev.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 6px rgba(0, 45, 84, 0.04)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: '42px', 
                          height: '42px', 
                          borderRadius: '50%', 
                          background: '#f8fafc', 
                          border: '2px solid var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          {ev.logoUrl ? (
                            <>
                              <img 
                                src={ev.logoUrl} 
                                alt={ev.name} 
                                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} 
                                onError={(e) => { 
                                  e.target.style.display = 'none'; 
                                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                }} 
                              />
                              <span style={{ fontSize: '20px', display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                                {ev.icon || '🏅'}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {ev.icon || '🏅'}
                            </span>
                          )}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary-navy)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {ev.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '10px', marginTop: '2px' }}>
                            <span>📅 {ev.date}</span>
                            {ev.location && <span>📍 {ev.location}</span>}
                          </div>
                          {ev.note && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                              🎯 {ev.note}
                            </div>
                          )}
                          {ev.registrationUrl && (
                            <div style={{ marginTop: '6px' }}>
                              <a href={ev.registrationUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#fff', background: 'var(--accent)', borderRadius: '6px', textDecoration: 'none' }}>
                                {lang === 'en' ? 'Register' : 'Đăng Ký'}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button 
                          type="button" 
                          onClick={() => handleOpenEditRace(idx)}
                          className="btn-icon" 
                          title={lang === 'en' ? 'Edit event' : 'Sửa thông tin'}
                          style={{ padding: '6px', borderRadius: '6px', color: 'var(--accent)', background: 'rgba(0, 163, 166, 0.08)' }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteRace(idx)}
                          className="btn-icon" 
                          title={lang === 'en' ? 'Delete event' : 'Xóa giải chạy'}
                          style={{ padding: '6px', borderRadius: '6px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 2: QUẢN LÝ PHÂN QUYỀN (ROLES & PERMISSIONS)                    */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* Cột 1: Danh sách Admin */}
          <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={22} color="var(--accent)" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-navy)', margin: 0 }}>
                  {t('adminListTitle')}
                </h2>
              </div>
              <span style={{ fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                {1 + normalizedAdmins.length} Admins
              </span>
            </div>

            {/* Super Admin Item */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {t('superAdminPrimary')}
              </div>
              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '14px', background: 'rgba(0, 45, 84, 0.04)', borderRadius: '10px',
                border: '1px solid rgba(0, 45, 84, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    👑
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>
                      {athlete ? `${athlete.firstname} ${athlete.lastname}` : 'Super Admin'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Strava ID: <b>{import.meta.env.VITE_ADMIN_STRAVA_ID || '133066813'}</b>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  {t('permanent')}
                </span>
              </div>
            </div>

            {/* Sub-Admins List */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Sub-Admins ({normalizedAdmins.length})
              </div>

              {normalizedAdmins.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-glass)', borderRadius: '10px' }}>
                  {t('noSubAdmins')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                  {normalizedAdmins.map((admin) => {
                    const adminKey = admin.athleteId || admin.matchKey || admin.id || admin.name;
                    return (
                      <div 
                        key={adminKey} 
                        style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '10px',
                          background: '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0, 163, 166, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            <UserCheck size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.95rem' }}>
                              {admin.name} {admin.matchKey && admin.name !== admin.matchKey ? <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.8rem' }}>({admin.matchKey})</span> : ''}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {admin.athleteId ? <span>Strava ID: <b>{admin.athleteId}</b> • </span> : ''}
                              {t('subAdminAppointed')}
                            </div>
                          </div>
                        </div>

                        {isSuperAdmin && (
                          <button 
                            onClick={() => handleRemoveAdmin(admin)}
                            className="btn btn--secondary"
                            style={{ 
                              color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2',
                              padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <UserX size={14} /> {lang === 'en' ? 'Revoke' : 'Thu hồi'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cột 2: Cấp quyền Admin mới */}
          <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <Plus size={22} color="var(--accent)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-navy)', margin: 0 }}>
                {t('appointAdminTitle')}
              </h2>
            </div>

            {!isSuperAdmin ? (
              <div style={{ padding: '20px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fef3c7', color: '#b45309', fontSize: '0.9rem' }}>
                ⚠️ {t('superAdminNotice')}
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary-navy)' }}>
                    {lang === 'en' ? '1. Select Club' : '1. Chọn Câu Lạc Bộ (Club)'}
                  </label>
                  <select 
                    className="sidebar__select"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                  >
                    <option value="">{lang === 'en' ? '-- Select club to load members --' : '-- Chọn nhóm để tải thành viên --'}</option>
                    {clubs.map(club => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>

                {selectedClubId && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary-navy)', margin: 0 }}>
                        {lang === 'en' ? '2. Search and Grant Admin Role' : '2. Tìm kiếm và Cấp quyền Thành viên'}
                      </label>
                      <span style={{ fontSize: '0.78rem', background: 'rgba(0, 163, 166, 0.1)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        {loadingMembers ? (lang === 'en' ? 'Loading...' : 'Đang tải...') : `${filteredMembers.length} ${lang === 'en' ? 'Members' : 'Thành viên'}`}
                      </span>
                    </div>
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                      <input
                        type="text"
                        style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                        placeholder={lang === 'en' ? 'Search member name...' : 'Tìm theo tên thành viên...'}
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px' }}>
                      {loadingMembers ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {lang === 'en' ? 'Loading members list...' : 'Đang tải danh sách thành viên...'}
                        </div>
                      ) : filteredMembers.length > 0 ? (
                        filteredMembers.map((member) => {
                          const uniqueId = (member.id || `${member.firstname || ''}_${member.lastname || ''}`).toString();
                          const memberName = `${member.firstname || ''} ${member.lastname || ''}`.trim() || 'Thành viên';
                          const memberMatchKey = `${member.firstname || ''}_${member.lastname || ''}`.toLowerCase();
                          const isAlreadyAdmin = normalizedAdmins.some(a => 
                            (member.id && (a.athleteId === member.id.toString() || a.id === member.id.toString())) || 
                            (a.matchKey && a.matchKey.toLowerCase() === memberMatchKey) ||
                            (a.name && a.name.toLowerCase() === memberName.toLowerCase()) ||
                            (a.id && a.id === uniqueId)
                          ) || (subAdmins || []).some(sa => {
                            if (typeof sa === 'string') return sa === uniqueId || sa.toLowerCase() === memberMatchKey;
                            return (sa?.athleteId && sa.athleteId.toString() === uniqueId) || 
                                   (sa?.id && sa.id.toString() === uniqueId) || 
                                   (sa?.matchKey && sa.matchKey.toLowerCase() === memberMatchKey);
                          }) || uniqueId === (import.meta.env.VITE_ADMIN_STRAVA_ID || '133066813');
                          
                          return (
                            <div 
                              key={uniqueId} 
                              style={{ 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                padding: '10px 12px', borderBottom: '1px solid #f1f5f9',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {member.profile_medium ? (
                                  <img src={member.profile_medium} alt="avatar" style={{ width: 34, height: 34, borderRadius: '50%' }} />
                                ) : (
                                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8rem' }}>
                                    {(member.firstname || '?')[0]}
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary-navy)' }}>
                                    {memberName}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    ID: {member.id || 'N/A'}
                                  </div>
                                </div>
                              </div>
                              
                              {isAlreadyAdmin ? (
                                <span style={{ color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>
                                  {lang === 'en' ? '✓ Already Admin' : '✓ Đã là Admin'}
                                </span>
                              ) : (
                                <button 
                                  className="btn btn--primary" 
                                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', fontWeight: 600 }}
                                  onClick={() => handleAddAdmin(member)}
                                >
                                  {lang === 'en' ? 'Grant Admin' : 'Cấp quyền'}
                                </button>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {lang === 'en' ? 'No members found.' : 'Không tìm thấy thành viên nào.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cột 3: Giới hạn tính năng Sub-Admin (Khung xanh) */}
          <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sliders size={22} color="var(--accent)" />
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary-navy)', margin: 0, whiteSpace: 'nowrap' }}>
                    {lang === 'en' ? 'Sub-Admin Permissions' : 'Giới Hạn Tính Năng Sub-Admin'}
                  </h2>
                </div>
              </div>

              {!isSuperAdmin ? (
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                  <p style={{ fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '6px' }}>
                    {lang === 'en' ? 'Your Current Permissions' : 'Quyền Hạn Hiện Tại Của Bạn'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.82rem' }}>
                    {lang === 'en' 
                      ? 'Only Super Admin can modify Sub-Admin access permissions. Features not permitted will be locked or restricted.' 
                      : 'Chỉ Super Admin mới có quyền điều chỉnh phân quyền. Các tính năng không được cấp sẽ bị khóa hoặc giới hạn.'}
                  </p>
                </div>
              ) : (
                <div>
                  {/* Bộ chọn Sub-Admin áp dụng */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary-navy)' }}>
                      {lang === 'en' ? 'Apply Permissions To:' : 'Áp dụng quyền hạn cho:'}
                    </label>
                    <select
                      className="sidebar__select"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: 'var(--primary-navy)' }}
                      value={selectedSubAdminScope}
                      onChange={(e) => setSelectedSubAdminScope(e.target.value)}
                    >
                      <option value="all">
                        {lang === 'en' ? 'All Sub-Admins (Default)' : 'Tất cả Sub-Admins (Mặc định)'}
                      </option>
                      {normalizedAdmins.map(admin => {
                        const adminKey = (admin.athleteId || admin.id || admin.matchKey || '').toString();
                        return (
                          <option key={adminKey} value={adminKey}>
                            {admin.name} ({admin.athleteId ? `ID: ${admin.athleteId}` : (admin.matchKey || admin.id)})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Danh sách 7 quyền hạn dạng Checkbox (Không có icon đầu dòng) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                    {[
                      {
                        key: 'generalSettings',
                        title: lang === 'en' ? 'General Settings & Races (Tab 1)' : 'Cấu hình Thử thách & Giải chạy (Tab 1)',
                        desc: lang === 'en' ? 'Edit challenge dates, rules and timeline race events.' : 'Chỉnh sửa ngày tháng, mục tiêu thử thách và sự kiện giải chạy Timeline.'
                      },
                      {
                        key: 'manageRoles',
                        title: lang === 'en' ? 'Roles & Permissions (Tab 2)' : 'Quản lý Phân quyền Admin (Tab 2)',
                        desc: lang === 'en' ? 'Appoint and manage Sub-Admins in the club.' : 'Xem và bổ nhiệm thêm Sub-Admin mới trong câu lạc bộ.'
                      },
                      {
                        key: 'activityLogs',
                        title: lang === 'en' ? 'Activity & Audit Logs (Tab 3)' : 'Xem & Quản lý Nhật ký (Tab 3)',
                        desc: lang === 'en' ? 'View system activity history and clear audit logs.' : 'Xem lịch sử thao tác hệ thống và dọn dẹp nhật ký hoạt động.'
                      },
                      {
                        key: 'dataManagement',
                        title: lang === 'en' ? 'Data Management & Sync (Tab 4)' : 'Quản trị Dữ liệu Nâng cao (Tab 4)',
                        desc: lang === 'en' ? 'Push/pull Render Cloud, Git push and backup/restore.' : 'Kéo/đẩy dữ liệu Render Cloud, chạy Git Push GitHub, Sao lưu & Phục hồi.'
                      },
                      {
                        key: 'penaltiesTargets',
                        title: lang === 'en' ? 'Monthly Targets & Penalties (Tab 5)' : 'Chỉnh sửa Mục tiêu & Tiền phạt (Tab 5)',
                        desc: lang === 'en' ? 'Update monthly km targets and penalty fund rates.' : 'Điều chỉnh chỉ tiêu km hàng tháng và mức phạt đóng quỹ của các thành viên.'
                      },
                      {
                        key: 'syncStrava',
                        title: lang === 'en' ? 'Auto Sync Strava' : 'Chạy Đồng bộ Strava tự động',
                        desc: lang === 'en' ? 'Trigger automatic Strava scraper from the sidebar.' : 'Sử dụng nút Auto Sync Strava scraper trên thanh Sidebar.'
                      },
                      {
                        key: 'importActivities',
                        title: lang === 'en' ? 'Import Activity Files' : 'Tải lên Tệp dữ liệu Hoạt động',
                        desc: lang === 'en' ? 'Upload CSV/Excel activities from the sidebar.' : 'Sử dụng nút Select File / Select Folder CSV/Excel trên Sidebar.'
                      }
                    ].map(item => {
                      const isChecked = !!permissionsForm[item.key];
                      return (
                        <div
                          key={item.key}
                          onClick={() => {
                            setPermissionsForm(prev => ({
                              ...prev,
                              [item.key]: !prev[item.key]
                            }));
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '12px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid',
                            borderColor: isChecked ? 'rgba(0, 163, 166, 0.4)' : '#e2e8f0',
                            background: isChecked ? 'rgba(0, 163, 166, 0.04)' : '#fafafa',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.86rem', color: isChecked ? 'var(--primary-navy)' : 'var(--text-secondary)' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.35 }}>
                              {item.desc}
                            </div>
                          </div>
                          
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '5px',
                            border: isChecked ? '2px solid var(--accent)' : '2px solid #cbd5e1',
                            background: isChecked ? 'var(--accent)' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                            transition: 'all 0.15s ease'
                          }}>
                            {isChecked && <Check size={13} color="#fff" strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Nút thao tác nhanh và Lưu phân quyền */}
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setPermissionsForm({
                            generalSettings: true,
                            manageRoles: true,
                            activityLogs: true,
                            dataManagement: true,
                            penaltiesTargets: true,
                            syncStrava: true,
                            importActivities: true
                          });
                        }}
                        className="btn btn--secondary"
                        style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem', borderRadius: '6px', fontWeight: 600, borderColor: 'rgba(0, 45, 84, 0.15)', color: 'var(--primary-navy)' }}
                      >
                        {lang === 'en' ? 'Select All' : 'Chọn tất cả'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToSafeDefault}
                        className="btn btn--secondary"
                        style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem', borderRadius: '6px', fontWeight: 600, borderColor: 'rgba(0, 45, 84, 0.15)', color: 'var(--primary-navy)' }}
                      >
                        {lang === 'en' ? 'Safe Default' : 'Mặc định an toàn'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSavePermissions}
                      disabled={savingPermissions}
                      className="btn btn--primary"
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Save size={16} /> {savingPermissions ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Permissions' : 'Lưu Phân Quyền')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 3: NHẬT KÝ HOẠT ĐỘNG (AUDIT LOGS)                              */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} color="var(--accent)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-navy)', margin: 0 }}>
                {t('auditLogsTitle')}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={loadLogs} 
                className="btn btn--secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <RefreshCw size={14} /> {t('refresh')}
              </button>
              {logs.length > 0 && (
                <button 
                  onClick={handleClearLogs} 
                  className="btn btn--secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                >
                  <Trash2 size={14} /> {t('clearLogsBtn')}
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              placeholder={t('searchLogsPlaceholder')}
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
            />
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-glass)', borderBottom: '1px solid #e2e8f0', color: 'var(--primary-navy)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700, width: '180px' }}>{t('timeCol')}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, width: '160px' }}>{t('actionCol')}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, width: '180px' }}>{t('userCol')}</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t('detailsCol')}</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {t('loadingLogs')}
                    </td>
                  </tr>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(log.timestamp)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ 
                          background: log.action.includes('Cấp quyền') ? '#ecfdf5' : 
                                      log.action.includes('Thu hồi') ? '#fef2f2' :
                                      log.action.includes('sao lưu') ? '#eff6ff' : 'rgba(0, 45, 84, 0.06)',
                          color: log.action.includes('Cấp quyền') ? '#059669' : 
                                 log.action.includes('Thu hồi') ? '#dc2626' :
                                 log.action.includes('sao lưu') ? '#2563eb' : 'var(--primary-navy)',
                          padding: '4px 10px', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem'
                        }}>
                          {lang === 'en' 
                            ? (log.action.includes('Cấp quyền') ? log.action.replace('Cấp quyền Admin', 'Grant Admin').replace('Cấp quyền', 'Grant Admin') 
                               : log.action.includes('Thu hồi') ? log.action.replace('Thu hồi quyền Admin', 'Revoke Admin').replace('Thu hồi', 'Revoke') 
                               : log.action.includes('sao lưu') ? 'Backup Data' : log.action) 
                            : log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--primary-navy)' }}>
                        {log.user}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {t('noLogs')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 4: QUẢN LÝ DỮ LIỆU (DATA MANAGEMENT)                          */}
      {/* ========================================================================= */}
      {activeTab === 'data' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* BỘ 3 GIẢI PHÁP ĐỒNG BỘ & BẢO TOÀN DỮ LIỆU */}
          <div className="card" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '2px solid #0284c7', boxShadow: '0 8px 24px rgba(2, 132, 199, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HardDrive size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', margin: 0 }}>
                  {lang === 'en' ? 'Data Sync & Cloud Protection Suite' : 'Bộ 3 Giải Pháp Đồng Bộ & Bảo Toàn Dữ Liệu (Cloud & Local)'}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {lang === 'en' 
                    ? 'Ensure two-way synchronization between Sub-Admins on Render and Super Admin on Local PC' 
                    : 'Đảm bảo đồng bộ 2 chiều giữa Sub-Admin (trên web Render) và Super Admin (trên máy tính cá nhân)'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '16px', marginTop: '20px' }}>
              {/* Giải Pháp 1: Tải Toàn Bộ Storage (ZIP) */}
              <div style={{ padding: '18px', borderRadius: '12px', border: '1px solid #bfdbfe', background: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1d4ed8', fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
                    <DownloadCloud size={20} />
                    <span>{lang === 'en' ? '1. Export Storage (ZIP)' : '1. Tải Toàn Bộ Storage (ZIP)'}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                    {lang === 'en'
                      ? 'Pack all activities, targets, and config JSON & CSV files into a single ZIP file downloaded directly to your PC.'
                      : 'Đóng gói toàn bộ file JSON, CSV cấu hình và lịch sử hoạt động thành 1 file ZIP tải về máy tính lưu trữ an toàn.'}
                  </div>
                </div>
                <button 
                  onClick={handleExportZipWithConfirm}
                  disabled={processingAction}
                  className="btn btn--secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', fontWeight: 700, color: '#1d4ed8', borderColor: '#bfdbfe', background: '#eff6ff' }}
                >
                  <Download size={16} /> {lang === 'en' ? 'Download Full ZIP' : 'Tải Về File ZIP Ngay'}
                </button>
              </div>

              {/* Giải Pháp 2: Kéo Dữ Liệu Từ Cloud Về Máy */}
              <div style={{ padding: '18px', borderRadius: '12px', border: '1px solid #99f6e4', background: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e', fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
                    <ArrowDownCircle size={20} />
                    <span>{lang === 'en' ? '2. Pull Data from Cloud' : '2. Kéo Dữ Liệu Từ Cloud Về Máy'}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                    {lang === 'en'
                      ? 'Automatically fetch the latest activities and targets synced by Sub-Admins on Render and update into your local Storage.'
                      : 'Tự động kết nối Render Cloud, lấy toàn bộ dữ liệu mới nhất do Sub-Admin vừa đồng bộ về máy local để commit lên GitHub.'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button 
                    onClick={handlePullFromCloudWithConfirm}
                    disabled={processingAction}
                    className="btn btn--primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', fontWeight: 700, background: '#0f766e', borderColor: '#0f766e' }}
                  >
                    <ArrowDownCircle size={16} /> {lang === 'en' ? 'Pull from Render Cloud' : 'Kéo Dữ Liệu Từ Cloud Về'}
                  </button>

                  <button 
                    onClick={handleGitPushWithConfirm}
                    disabled={processingAction}
                    className="btn btn--secondary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4', fontSize: '0.82rem' }}
                    title="Chạy lệnh git push origin main để lưu vào GitHub"
                  >
                    <UploadCloud size={16} /> {lang === 'en' ? '🚀 Run Git Push' : '🚀 Git Push Lên GitHub'}
                  </button>
                </div>
              </div>

              {/* Giải Pháp 3: Đẩy Dữ Liệu Từ Máy Lên Cloud */}
              <div style={{ padding: '18px', borderRadius: '12px', border: '1px solid #fed7aa', background: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
                    <ArrowUpCircle size={20} />
                    <span>{lang === 'en' ? '3. Push Local Data to Cloud' : '3. Đẩy Dữ Liệu Lên Cloud'}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                    {lang === 'en'
                      ? 'Instantly push your local activities, targets and settings to Render Cloud without redeploying the server.'
                      : 'Đẩy nhanh toàn bộ dữ liệu activities, mục tiêu tháng và danh sách admin từ máy tính lên Cloud Render tức thì không cần redeploy.'}
                  </div>
                </div>
                <button 
                  onClick={handlePushToCloudWithConfirm}
                  disabled={processingAction}
                  className="btn btn--secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', fontWeight: 700, color: '#c2410c', borderColor: '#fed7aa', background: '#fff7ed' }}
                >
                  <ArrowUpCircle size={16} /> {lang === 'en' ? 'Push to Render Cloud' : 'Đẩy Lên Render Cloud Ngay'}
                </button>
              </div>
            </div>
          </div>

          {/* Action Toolbar Phụ */}
          <div className="card" style={{ padding: '20px 24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-navy)', margin: '0 0 14px' }}>
              {t('quickDataActions')}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button 
                onClick={handleGitPushWithConfirm}
                disabled={processingAction}
                className="btn btn--primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, background: '#16a34a', borderColor: '#16a34a' }}
                title="Đẩy dữ liệu và commit mới lên GitHub (git push)"
              >
                <UploadCloud size={16} /> {lang === 'en' ? 'Git Push (GitHub)' : 'Git Push Lên GitHub'}
              </button>

              <button 
                onClick={handleSyncStorage}
                disabled={processingAction}
                className="btn btn--primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontWeight: 600 }}
              >
                <RefreshCw size={16} /> {t('syncAllCsvBtn')}
              </button>

              <button 
                onClick={handleCreateBackup}
                disabled={processingAction}
                className="btn btn--secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontWeight: 600 }}
              >
                <HardDrive size={16} /> {t('instantBackupBtn')}
              </button>

              <button 
                onClick={loadStorageStats}
                disabled={processingAction}
                className="btn btn--secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontWeight: 600 }}
              >
                <RefreshCw size={16} /> {t('refreshFileStatusBtn')}
              </button>

              <button 
                onClick={handleSyncMembers}
                disabled={processingAction}
                className="btn btn--secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5' }}
              >
                <Users size={16} /> {t('syncMembersBtn')}
              </button>
            </div>
          </div>

          {/* Files List Table với cột Tải Về */}
          <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <Database size={22} color="var(--accent)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-navy)', margin: 0 }}>
                {t('storageFilesTitle')}
              </h2>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-glass)', borderBottom: '1px solid #e2e8f0', color: 'var(--primary-navy)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t('fileNameCol')}</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '120px' }}>{t('fileStatusCol')}</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '130px' }}>{t('recordCountCol')}</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '110px' }}>{t('fileSizeCol')}</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '160px' }}>{t('lastModifiedCol')}</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, width: '110px', textAlign: 'center' }}>
                      {lang === 'en' ? 'Download' : 'Thao tác'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStorage ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {t('checkingStorage')}
                      </td>
                    </tr>
                  ) : storageFiles.length > 0 ? (
                    storageFiles.map((file) => (
                      <tr key={file.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>{file.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{file.desc} ({file.key})</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {file.exists ? (
                            <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>
                              {t('statusReady')}
                            </span>
                          ) : (
                            <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>
                              {t('statusNotCreated')}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--primary-navy)' }}>
                          {file.count !== undefined ? `${file.count.toLocaleString()} ${lang === 'en' ? 'records' : 'mục'}` : '–'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {formatFileSize(file.size)}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                          {formatDate(file.lastModified)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {file.exists ? (
                            <button
                              onClick={() => handleDownloadSingleFile(file.key)}
                              className="btn btn--secondary"
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: '#0284c7',
                                borderColor: '#bae6fd',
                                background: '#f0f9ff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer'
                              }}
                              title={lang === 'en' ? `Download ${file.key}` : `Tải file ${file.key} về máy`}
                            >
                              <Download size={13} /> {lang === 'en' ? 'Download' : 'Tải về'}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>–</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {t('noDataFiles')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 5: TRUNG TÂM QUẢN LÝ TIỀN PHẠT & QUỸ CLB (CLUB TREASURY)      */}
      {/* ========================================================================= */}
      {activeTab === 'penalties' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Sub-Tabs Navigation */}
          <div className="treasury-subtabs-nav">
            <button
              type="button"
              className={`treasury-subtab-btn ${penaltySubTab === 'monthly' ? 'active' : ''}`}
              onClick={() => setPenaltySubTab('monthly')}
            >
              <Calendar size={18} />
              <span>{t('subTabMonthly')}</span>
            </button>
            <button
              type="button"
              className={`treasury-subtab-btn ${penaltySubTab === 'alltime' ? 'active' : ''}`}
              onClick={() => setPenaltySubTab('alltime')}
            >
              <Trophy size={18} />
              <span>{t('subTabAllTime')}</span>
            </button>
            <button
              type="button"
              className={`treasury-subtab-btn ${penaltySubTab === 'cashflow' ? 'active' : ''}`}
              onClick={() => setPenaltySubTab('cashflow')}
            >
              <DollarSign size={18} />
              <span>{t('subTabCashFlow')}</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* SUB-TAB 1: THU PHẠT THÁNG HIỆN TẠI (MONTHLY COLLECTION)                  */}
          {/* ========================================================================= */}
          {penaltySubTab === 'monthly' && (
            <>
              {/* Hero Banner: Số dư Quỹ & Tổng Phạt */}
              <div className="treasury-hero-card">
                <div>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85, fontWeight: 700 }}>
                    {t('fundBalanceKpi')}
                  </div>
                  <div className="treasury-hero-balance">
                    {(cashFlowData?.currentClubFundBalance || 11097000).toLocaleString('vi-VN')}
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>VNĐ</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '4px' }}>
                    {t('totalPenaltyCollectedKpi')}: <strong>{(cashFlowData?.totalPenaltyFundCollected || 16900000).toLocaleString('vi-VN')} VNĐ</strong> (Lũy kế 49 tháng từ 06/2022)
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => { loadPenaltiesReport(); loadTreasuryData(); }}
                    disabled={loadingPenalties}
                    className="btn btn--secondary"
                    style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#fff', borderColor: 'rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(4px)', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', fontWeight: 600 }}
                  >
                    <RefreshCw size={16} className={loadingPenalties ? 'spinning' : ''} />
                    <span>{t('refresh')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportReportCsv}
                    disabled={loadingPenalties || reportRows.length === 0}
                    className="btn"
                    style={{ background: '#ffffff', color: 'var(--primary-navy)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                  >
                    <Download size={16} />
                    <span>{lang === 'en' ? 'Export Month (CSV)' : 'Xuất Báo Cáo Tháng'}</span>
                  </button>
                </div>
              </div>

              {/* 1. Header Toolbar & Filters */}
              <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Month selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={16} color="var(--primary-navy)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-navy)' }}>{t('filterMonth')}:</span>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: '#fff', color: 'var(--primary-navy)' }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                        <option key={m} value={m}>{lang === 'en' ? `Month ${m}` : `Tháng ${m}`}</option>
                      ))}
                    </select>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: '#fff', color: 'var(--primary-navy)' }}
                    >
                      {[2026, 2025, 2024, 2023, 2022].map(y => (
                        <option key={y} value={y}>{lang === 'en' ? `Year ${y}` : `Năm ${y}`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status filter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={15} color="var(--primary-navy)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-navy)' }}>{t('filterLabel')}:</span>
                    <select
                      value={reportFilter}
                      onChange={(e) => setReportFilter(e.target.value)}
                      style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: '#fff', color: 'var(--primary-navy)' }}
                    >
                      <option value="all">{lang === 'en' ? `All members (${totalRunners})` : `Tất cả thành viên (${totalRunners})`}</option>
                      <option value="committed">{lang === 'en' ? `Committed to penalty (${committedCount})` : `Có cam kết phạt (${committedCount})`}</option>
                      <option value="owing">{lang === 'en' ? `Incomplete / Owing (${owingCount})` : `Chưa đạt / Cần nộp phạt (${owingCount})`}</option>
                      <option value="safe">{lang === 'en' ? `Goal reached / 0k (${safeCount})` : `Đã đạt mục tiêu / 0k (${safeCount})`}</option>
                    </select>
                  </div>

                  {/* Search input */}
                  <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      placeholder={t('searchRunnerPlaceholder')}
                      style={{ width: '100%', padding: '7px 12px 7px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. KPI Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {/* KPI 1 */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(0, 45, 84, 0.08)', color: 'var(--primary-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('totalRunnersKpi')}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-navy)' }}>{totalRunners} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{t('runnerUnit')}</span></div>
                  </div>
                </div>

                {/* KPI 2 */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #fed7aa', background: '#fffaf0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scale size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#9a3412', fontWeight: 600 }}>{t('penaltyCommittedKpi')}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c2410c' }}>
                      {committedCount} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>({committedRate}%)</span>
                    </div>
                  </div>
                </div>

                {/* KPI 3 */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>{t('goalReachedKpi')}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>{safeCount} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{t('runnerUnit')}</span></div>
                  </div>
                </div>

                {/* KPI 4 */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', border: '1px solid #fecaca', background: '#fef2f2', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>{t('owingPenaltyKpi')}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b91c1c' }}>{owingCount} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{t('runnerUnit')}</span></div>
                  </div>
                </div>

                {/* KPI 5: Phạt tháng & Tình trạng nộp */}
                <div className="card" style={{ padding: '16px 20px', borderRadius: '12px', border: '1.5px solid #f97316', background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#ea580c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)' }}>
                    <DollarSign size={26} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#9a3412', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('monthDueKpi')}: {totalFundVnd.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                      {t('monthPaidKpi')}: {totalPaidFundVnd.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 700 }}>
                      {t('totalPenaltyOwedKpi')}: {totalUnpaidFundVnd.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Detailed Table with Payment Toggle */}
              <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                    {lang === 'en' ? `Detailed List - Month ${reportMonth}/${reportYear} (${filteredReportRows.length} runners)` : `Danh Sách Thu Phạt Tháng ${reportMonth}/${reportYear} (${filteredReportRows.length} runner)`}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {lang === 'en' ? 'Click on Payment Status badge to mark as Paid / Unpaid' : 'Nhấp vào huy hiệu Trạng thái để chuyển đổi Đã nộp / Chưa nộp'}
                  </span>
                </div>

                {loadingPenalties ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={24} className="spinning" style={{ marginBottom: '8px' }} />
                    <div>{t('calculatingPenalties')}</div>
                  </div>
                ) : filteredReportRows.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {t('noRunnersFoundFilter')}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="admin-penalty-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: 'var(--primary-navy)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px', width: '45px', textAlign: 'center' }}>{t('colIndex')}</th>
                          <th style={{ padding: '10px 12px' }}>{t('colMember')}</th>
                          <th style={{ padding: '10px 12px', width: '90px' }}>{t('colTargetKm')}</th>
                          <th style={{ padding: '10px 12px', width: '95px' }}>{t('colDistanceRun')}</th>
                          <th style={{ padding: '10px 12px', width: '95px' }}>{t('colRemainingKm')}</th>
                          <th style={{ padding: '10px 12px', width: '120px' }}>{t('colProgress')}</th>
                          <th style={{ padding: '10px 12px', width: '100px', textAlign: 'center' }}>{t('colCommitment')}</th>
                          <th style={{ padding: '10px 12px', width: '120px' }}>{t('colStatus')}</th>
                          <th style={{ padding: '10px 12px', width: '130px', textAlign: 'center' }}>{t('paymentStatusCol')}</th>
                          <th style={{ padding: '10px 12px', width: '110px', textAlign: 'right' }}>{t('colPenaltyDue')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReportRows.map((r, i) => (
                          <tr key={r.matchKey || i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {r.avatarUrl ? (
                                  <img src={r.avatarUrl} alt={r.displayName} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>
                                    {(r.displayName || '?').charAt(0)}
                                  </div>
                                )}
                                <span style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>{r.displayName}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <input
                                type="number"
                                min="0"
                                value={r.targetKm === 0 ? '' : r.targetKm}
                                placeholder="0"
                                onChange={(e) => handleAdminTargetChange(r.matchKey, e.target.value)}
                                style={{ width: '65px', padding: '5px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-navy)', textAlign: 'center' }}
                                title={lang === 'en' ? 'Edit target (km)' : 'Sửa mục tiêu (km)'}
                              />
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--primary-navy)' }}>
                              {r.totalDist.toFixed(1)} km
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: r.diffKm > 0 ? '#ef4444' : '#10b981' }}>
                              {r.diffKm > 0 ? `-${r.diffKm.toFixed(1)} km` : '0 km'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ flex: 1, height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ width: `${r.progressPct}%`, height: '100%', background: r.progressPct >= 100 ? '#10b981' : (r.progressPct >= 50 ? '#00A3A6' : '#f59e0b'), borderRadius: '4px' }}></div>
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', minWidth: '32px' }}>{r.progressPct}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={r.hasPenalty}
                                onChange={(e) => handleAdminPenaltyChange(r.matchKey, e.target.checked)}
                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ea580c' }}
                                title={t('checkPenaltyCommitment')}
                              />
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {r.status === 'safe' && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 700 }}>
                                  {t('statusSafeBadge')}
                                </span>
                              )}
                              {r.status === 'owing' && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: '#ffedd5', color: '#c2410c', fontSize: '0.75rem', fontWeight: 700 }}>
                                  {t('statusOwingBadge')}
                                </span>
                              )}
                              {r.status === 'no_target' && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontSize: '0.75rem', fontWeight: 600 }}>
                                  {t('statusNoTargetBadge')}
                                </span>
                              )}
                              {r.status === 'none' && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>
                                  {t('statusNoneBadge')}
                                </span>
                              )}
                            </td>

                            {/* Payment Status Column */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {r.hasPenalty && r.penaltyAmountK > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePayment(r.athleteId, r.displayName, r.paymentStatus, r.paymentNote)}
                                  className={`payment-status-badge ${r.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`}
                                  title={r.paymentStatus === 'paid' ? `${lang === 'en' ? 'Paid on' : 'Đã nộp ngày'}: ${r.paidAt ? new Date(r.paidAt).toLocaleDateString('vi-VN') : ''} ${r.paymentNote ? `(${r.paymentNote})` : ''}` : (lang === 'en' ? 'Click to mark as paid' : 'Bấm để đánh dấu đã nộp')}
                                >
                                  {r.paymentStatus === 'paid' ? `✓ ${t('paidStatusBadge')}` : `🔴 ${t('unpaidStatusBadge')}`}
                                </button>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>–</span>
                              )}
                            </td>

                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              {r.hasPenalty && r.targetKm > 0 ? (
                                <span className={`penalty-due-badge ${r.penaltyAmountK === 0 ? 'is-free' : 'is-owing'}`}>
                                  {r.penaltyAmountK === 0 ? '0k' : `${r.penaltyAmountK}k`}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8', opacity: 0.5 }}>-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 2: LŨY KẾ LỊCH SỬ TỪ 2022 (ALL-TIME CUMULATIVE)                   */}
          {/* ========================================================================= */}
          {penaltySubTab === 'alltime' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* All-time Header Card */}
              <div className="card" style={{ padding: '20px 24px', borderRadius: '16px', background: 'linear-gradient(135deg, #002D54 0%, #0891b2 100%)', color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Trophy size={24} color="#facc15" />
                      {lang === 'en' ? 'Haskoning Running Club - All-Time Cumulative Ledger' : 'Bảng Xếp Hạng & Lũy Kế Quỹ Phạt CLB (Từ 06/2022 - Nay)'}
                    </h3>
                    <p style={{ margin: '6px 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                      {lang === 'en' 
                        ? 'Historical dataset verified across 49 months from Money.csv with 28 members.' 
                        : 'Dữ liệu tài chính lịch sử đối soát qua 49 tháng từ file Money.csv với đầy đủ 28 thành viên.'}
                    </p>
                  </div>
                  <a
                    href="/api/penalties/export-csv"
                    download="member_penalties_mapped.csv"
                    className="btn"
                    style={{ background: '#ffffff', color: 'var(--primary-navy)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none' }}
                  >
                    <Download size={16} />
                    <span>{t('exportAllTimeCsv')}</span>
                  </a>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>{lang === 'en' ? 'Total Members' : 'Tổng Thành Viên'}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{allTimeRows.length} {lang === 'en' ? 'runners' : 'thành viên'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>{lang === 'en' ? 'Total Penalties Paid' : 'Tổng Phạt Đã Thu All-Time'}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fef08a' }}>{(cashFlowData?.totalPenaltyFundCollected || 16900000).toLocaleString('vi-VN')} đ</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>{lang === 'en' ? 'Total Historical Distance' : 'Tổng KM Chạy Lịch Sử'}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                      {(allTimeRows.reduce((sum, r) => sum + (r.challengeKm || 0), 0) || treasurySummary?.metadata?.totalKmHistoricalRecorded || 52820.9).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>{t('fundBalanceKpi')}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#67e8f9' }}>{(cashFlowData?.currentClubFundBalance || 11097000).toLocaleString('vi-VN')} đ</div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="card" style={{ padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Filter size={16} color="var(--primary-navy)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{lang === 'en' ? 'Sort by:' : 'Sắp xếp theo:'}</span>
                  <select
                    value={allTimeSort}
                    onChange={(e) => setAllTimeSort(e.target.value)}
                    style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: '#fff' }}
                  >
                    <option value="rank">{lang === 'en' ? 'Total Penalties (High to Low)' : 'Tổng tiền phạt (Cao xuống thấp)'}</option>
                    <option value="km">{lang === 'en' ? 'Total Distance (High to Low)' : 'Tổng KM chạy (Nhiều xuống ít)'}</option>
                    <option value="name">{lang === 'en' ? 'Name (A to Z)' : 'Họ và tên (A - Z)'}</option>
                  </select>
                </div>

                <div style={{ minWidth: '240px', position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={allTimeSearch}
                    onChange={(e) => setAllTimeSearch(e.target.value)}
                    placeholder={lang === 'en' ? 'Search runner name or ID...' : 'Tìm theo tên hoặc Athlete ID...'}
                    style={{ width: '100%', padding: '7px 12px 7px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', background: '#fff', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="alltime-ledger-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: 'var(--primary-navy)', textAlign: 'left' }}>
                        <th style={{ width: '60px', textAlign: 'center' }}>{t('allTimeRankCol')}</th>
                        <th>{t('colMember')}</th>
                        <th style={{ width: '140px' }}>Strava Athlete ID</th>
                        <th style={{ width: '110px' }}>{lang === 'en' ? 'Role' : 'Vai Trò'}</th>
                        <th style={{ width: '170px', textAlign: 'right' }}>{t('allTimeTotalPenaltyCol')}</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>{lang === 'en' ? 'Penalty Rank' : 'Hạng Phạt'}</th>
                        <th style={{ width: '150px', textAlign: 'right' }}>{t('allTimeKmCol')}</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>{lang === 'en' ? 'KM Rank' : 'Hạng KM'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTimeRows.map((m, idx) => {
                        const rankClass = idx === 0 ? 'top1' : (idx === 1 ? 'top2' : (idx === 2 ? 'top3' : 'other'));
                        const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : null));
                        return (
                          <tr key={`${m.athleteId || m.rawName || 'mem'}_${m.stt || idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`rank-circle ${rankClass}`}>
                                {medal || (idx + 1)}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.95rem' }}>
                                {m.fullName || m.rawName}
                              </div>
                              {m.rawName && m.fullName && m.rawName !== m.fullName && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  ({m.rawName})
                                </div>
                              )}
                            </td>
                            <td>
                              {m.athleteId ? (
                                <a
                                  href={`https://www.strava.com/athletes/${m.athleteId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  {m.athleteId} ↗
                                </a>
                              ) : (
                                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                                  {lang === 'en' ? 'Former member' : 'Cựu thành viên'}
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem', 
                                fontWeight: 700,
                                background: m.role === 'Admin' ? '#fef3c7' : (m.role === 'Former' ? '#f1f5f9' : '#e0f2fe'),
                                color: m.role === 'Admin' ? '#b45309' : (m.role === 'Former' ? '#64748b' : '#0369a1')
                              }}>
                                {m.role}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#c2410c', fontSize: '0.95rem' }}>
                              {(m.financialSummary?.totalPenaltyVND || 0).toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary-navy)' }}>
                              #{m.financialSummary?.penaltyRank || '-'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#047857' }} title={lang === 'en' ? 'Total All-Time KM from Challenge Table' : 'Tổng tất cả các KM từ bảng challenge'}>
                              {(m.challengeKm !== undefined ? m.challengeKm : (m.financialSummary?.allTimeKmMoneyFile || 0)).toLocaleString('vi-VN')} km
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#047857' }}>
                              #{m.kmRank || m.financialSummary?.kmRankChallenge || m.financialSummary?.kmRankMoneyFile || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB 3: SỔ THU - CHI QUỸ CLB (CASH FLOW LEDGER)                        */}
          {/* ========================================================================= */}
          {penaltySubTab === 'cashflow' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Cash flow Hero Card */}
              <div className="treasury-hero-card" style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #00A3A6 100%)' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85, fontWeight: 700 }}>
                    {t('fundBalanceKpi')} (Sổ Quỹ Thực Tế)
                  </div>
                  <div className="treasury-hero-balance">
                    {(cashFlowData?.currentClubFundBalance || 11097000).toLocaleString('vi-VN')}
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>VNĐ</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '4px' }}>
                    {lang === 'en' 
                      ? `${sortedCashFlow.length} income & expense transactions recorded in club history.` 
                      : `Đã ghi nhận ${sortedCashFlow.length} giao dịch thu/chi tài chính trong suốt quá trình hoạt động.`}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setCashFlowModalOpen(true)}
                    className="btn"
                    style={{ background: '#ffffff', color: '#065f46', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' }}
                  >
                    <Plus size={18} />
                    <span>{t('addCashFlowBtn')}</span>
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', background: '#fff', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                    {lang === 'en' ? 'Transactions History' : 'Lịch Sử Các Khoản Thu & Chi Quỹ'}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {lang === 'en' ? 'Includes uniforms, gathering smoothies, donations' : 'Bao gồm tiền áo CLB, phí ship, các buổi liên hoan sinh tố, tài trợ'}
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="cashflow-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: 'var(--primary-navy)', textAlign: 'left' }}>
                        <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                        <th style={{ width: '120px' }}>{t('cashFlowDate')}</th>
                        <th style={{ width: '110px' }}>{t('cashFlowType')}</th>
                        <th>{t('cashFlowDesc')}</th>
                        <th style={{ width: '170px', textAlign: 'right' }}>{t('cashFlowAmount')}</th>
                        <th>{t('cashFlowNote')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCashFlow.map((tx, idx) => {
                        const isIncome = tx.type === 'income' || tx.amountVND > 0;
                        return (
                          <tr key={tx.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>
                              {tx.date || '–'}
                            </td>
                            <td>
                              <span className={`cashflow-badge ${isIncome ? 'income' : 'expense'}`}>
                                {isIncome ? (
                                  <><ArrowUpCircle size={13} /> {t('incomeType')}</>
                                ) : (
                                  <><ArrowDownCircle size={13} /> {t('expenseType')}</>
                                )}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>
                              {tx.description}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: isIncome ? '#166534' : '#dc2626' }}>
                              {isIncome ? '+' : ''}{tx.amountVND.toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              {tx.note || '–'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GHI NHẬN THU / CHI QUỸ CLB (ADD CASH FLOW MODAL)                    */}
      {/* ========================================================================= */}
      {cashFlowModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 45, 84, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setCashFlowModalOpen(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={22} color="#00A3A6" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                  {t('cashFlowModalTitle')}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setCashFlowModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCashFlow} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                  {t('cashFlowDate')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="date"
                  required
                  value={cashFlowForm.date}
                  onChange={(e) => setCashFlowForm({ ...cashFlowForm, date: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                  {t('cashFlowType')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, color: '#dc2626' }}>
                    <input 
                      type="radio"
                      name="cashflow_type"
                      checked={cashFlowForm.type === 'expense'}
                      onChange={() => setCashFlowForm({ ...cashFlowForm, type: 'expense' })}
                    />
                    {t('expenseType')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, color: '#166534' }}>
                    <input 
                      type="radio"
                      name="cashflow_type"
                      checked={cashFlowForm.type === 'income'}
                      onChange={() => setCashFlowForm({ ...cashFlowForm, type: 'income' })}
                    />
                    {t('incomeType')}
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                  {t('cashFlowDesc')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text"
                  required
                  value={cashFlowForm.description}
                  onChange={(e) => setCashFlowForm({ ...cashFlowForm, description: e.target.value })}
                  placeholder={lang === 'en' ? 'E.g. Smoothie party, Running shirt...' : 'Ví dụ: Tiền sinh tố giao lưu, Mua áo CLB...'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                  {t('cashFlowAmount')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  value={cashFlowForm.amountVND}
                  onChange={(e) => setCashFlowForm({ ...cashFlowForm, amountVND: e.target.value })}
                  placeholder="Ví dụ: 300000"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                  {t('cashFlowNote')}
                </label>
                <input 
                  type="text"
                  value={cashFlowForm.note}
                  onChange={(e) => setCashFlowForm({ ...cashFlowForm, note: e.target.value })}
                  placeholder={lang === 'en' ? 'Optional note or receipt info' : 'Ghi chú thêm hoặc số hóa đơn (tùy chọn)'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button"
                  onClick={() => setCashFlowModalOpen(false)}
                  className="btn btn--secondary"
                  style={{ padding: '8px 16px', borderRadius: '8px' }}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={savingCashFlow}
                  className="btn btn--primary"
                  style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: 700, background: '#00A3A6', border: 'none' }}
                >
                  {savingCashFlow ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save Transaction' : 'Lưu Giao Dịch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THÊM / SỬA GIẢI CHẠY (ADD / EDIT RACE MODAL)                       */}
      {/* ========================================================================= */}
      {raceModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 45, 84, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setRaceModalOpen(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={20} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                  {editingRaceIndex >= 0 
                    ? (lang === 'en' ? 'Edit Race / Event' : 'Sửa Giải Chạy / Sự Kiện') 
                    : (lang === 'en' ? 'Add New Race / Event' : 'Thêm Giải Chạy / Sự Kiện Mới')}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setRaceModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRaceModal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                  {lang === 'en' ? 'Race / Event Name' : 'Tên Giải Chạy / Sự Kiện'} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text"
                  required
                  value={raceForm.name}
                  onChange={(e) => setRaceForm({ ...raceForm, name: e.target.value })}
                  placeholder={lang === 'en' ? 'E.g., Tien Phong Marathon 2026' : 'Ví dụ: Tiền Phong Marathon 2026'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                    {lang === 'en' ? 'Event Date' : 'Ngày Diễn Ra'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="date"
                    required
                    value={raceForm.date}
                    onChange={(e) => setRaceForm({ ...raceForm, date: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                    {lang === 'en' ? 'Alternative Icon / Badge' : 'Icon / Huy hiệu thay thế'}
                  </label>
                  <select
                    value={raceForm.icon}
                    onChange={(e) => setRaceForm({ ...raceForm, icon: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
                  >
                    <option value="🏅">🏅 {lang === 'en' ? 'Gold Medal' : 'Huy chương vàng'}</option>
                    <option value="🏆">🏆 {lang === 'en' ? 'Trophy' : 'Cúp vô địch'}</option>
                    <option value="🎖️">🎖️ {lang === 'en' ? 'Commemorative Medal' : 'Kỷ niệm chương'}</option>
                    <option value="🏁">🏁 {lang === 'en' ? 'Finish Flag' : 'Cờ vạch đích'}</option>
                    <option value="🏃">🏃 {lang === 'en' ? 'Runner' : 'Runner chạy bộ'}</option>
                    <option value="🏮">🏮 {lang === 'en' ? 'Festival / Spring' : 'Lễ hội / Khai xuân'}</option>
                    <option value="⭐">⭐ {lang === 'en' ? 'Glory Star' : 'Ngôi sao vinh quang'}</option>
                    <option value="🔥">🔥 {lang === 'en' ? 'Enthusiastic Fire' : 'Ngọn lửa nhiệt huyết'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                  {lang === 'en' ? 'Race Logo (Upload file or paste URL)' : 'Logo Giải Chạy (Tải ảnh từ máy hoặc dán link URL)'}
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text"
                    value={raceForm.logoUrl}
                    onChange={(e) => setRaceForm({ ...raceForm, logoUrl: e.target.value })}
                    placeholder={lang === 'en' ? 'https://... or upload image' : 'https://... hoặc tải ảnh từ máy tính'}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                  <label 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      cursor: 'pointer', 
                      padding: '9px 12px', 
                      background: 'rgba(0, 163, 166, 0.1)', 
                      color: 'var(--accent)', 
                      borderRadius: '8px', 
                      border: '1px solid var(--accent)',
                      whiteSpace: 'nowrap',
                      margin: 0,
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                    title={lang === 'en' ? 'Choose file from computer' : 'Chọn file ảnh từ máy tính'}
                  >
                    📁 {lang === 'en' ? 'Choose file' : 'Chọn file'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setRaceForm({ ...raceForm, logoUrl: event.target.result });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {raceForm.logoUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', padding: '6px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                      <img src={raceForm.logoUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>✓ {lang === 'en' ? 'Logo Preview' : 'Xem trước Logo'}</span>
                    <button 
                      type="button" 
                      onClick={() => setRaceForm({ ...raceForm, logoUrl: '' })}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {lang === 'en' ? 'Remove Logo' : 'Xóa Logo'}
                    </button>
                  </div>
                )}
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {lang === 'en' 
                    ? 'Supports direct image upload (PNG, JPG, SVG) or web URL. Leave empty to use Icon.' 
                    : 'Hỗ trợ tải trực tiếp ảnh từ máy (PNG, JPG, SVG) hoặc dán link URL. Để trống nếu muốn dùng Icon/Huy hiệu.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                    {lang === 'en' ? 'Location / Venue' : 'Địa Điểm Tổ Chức'}
                  </label>
                  <input 
                    type="text"
                    value={raceForm.location}
                    onChange={(e) => setRaceForm({ ...raceForm, location: e.target.value })}
                    placeholder={lang === 'en' ? 'E.g., Phu Yen, Hanoi...' : 'Ví dụ: Phú Yên, Hà Nội...'}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                    {lang === 'en' ? 'Distance / Note' : 'Cự Ly / Ghi Chú'}
                  </label>
                  <input 
                    type="text"
                    value={raceForm.note}
                    onChange={(e) => setRaceForm({ ...raceForm, note: e.target.value })}
                    placeholder={lang === 'en' ? 'E.g., 21km / 42km' : 'Ví dụ: 21km / 42km'}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '5px', color: 'var(--primary-navy)' }}>
                  {lang === 'en' ? 'Registration Link (URL)' : 'Link Đăng Ký (URL)'}
                </label>
                <input 
                  type="text"
                  value={raceForm.registrationUrl || ''}
                  onChange={(e) => setRaceForm({ ...raceForm, registrationUrl: e.target.value })}
                  placeholder={lang === 'en' ? 'E.g., https://ticket.race.com' : 'Ví dụ: https://ticket.race.com'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button 
                  type="button"
                  onClick={() => setRaceModalOpen(false)}
                  className="btn btn--secondary"
                  style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 600 }}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="btn btn--primary"
                  style={{ padding: '8px 18px', borderRadius: '8px', fontWeight: 700 }}
                >
                  {editingRaceIndex >= 0 
                    ? (lang === 'en' ? 'Update Race' : 'Cập Nhật Giải Chạy') 
                    : (lang === 'en' ? 'Add Race' : 'Thêm Giải Chạy')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version Tag */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', paddingBottom: '4px' }}>
        <span className="app-version-tag">
          Version {APP_VERSION}
        </span>
      </div>

    </div>
  );
}
