import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLang } from '../i18n/LangContext';
import { 
  Target, Edit2, Check, X, ShieldAlert, ShieldCheck, Info, Sparkles, 
  CheckCircle2, Clock, Activity, Calendar, TrendingUp, BarChart2, RotateCw, 
  CalendarDays, Wallet, Award, Lock, Eye
} from 'lucide-react';
import { getAthleteMatchKey } from '../utils/challengeStats';
import TreasuryTransparencyModal from './TreasuryTransparencyModal';
import Swal from 'sweetalert2';

export default function PersonalGoal({ 
  activities = [], 
  athlete, 
  apiFetch, 
  challengeMonth, 
  challengeYear, 
  challengeParticipants = {},
  challengeData = [],
  isAdmin = false,
  lockTargetsAfterDate = 0
}) {
  const { t, lang } = useLang();
  
  const currentMonth = challengeMonth || (new Date().getMonth() + 1);
  const currentYear = challengeYear || new Date().getFullYear();
  
  // Identify the athlete's matchKey in the challenge participants
  const userMatchKey = getAthleteMatchKey(athlete, challengeParticipants);
  const userKey = userMatchKey ? `${userMatchKey}_${currentYear}_${currentMonth}` : null;

  const [goal, setGoal] = useState(0);
  const [hasPenalty, setHasPenalty] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState('');
  const [tempPenalty, setTempPenalty] = useState(false);
  const [currentDist, setCurrentDist] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [allTimeFinancial, setAllTimeFinancial] = useState(null);
  const [showTreasuryModal, setShowTreasuryModal] = useState(false);
  const [clubMetadata, setClubMetadata] = useState(null);
  const [matchedMemberRecord, setMatchedMemberRecord] = useState(null);

  const effectiveIsAdmin = Boolean(
    isAdmin || (athlete && import.meta.env.VITE_ADMIN_STRAVA_ID && String(athlete.id) === String(import.meta.env.VITE_ADMIN_STRAVA_ID))
  );

  // Calculate if editing is locked by date
  let isLockedByDate = false;
  if (!isAdmin && lockTargetsAfterDate > 0) {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayYear = today.getFullYear();
    
    const isPastMonth = currentYear < todayYear || (currentYear === todayYear && currentMonth < todayMonth);
    const isCurrentMonth = currentYear === todayYear && currentMonth === todayMonth;
    
    if (isPastMonth) {
      isLockedByDate = true;
    } else if (isCurrentMonth && today.getDate() > lockTargetsAfterDate) {
      isLockedByDate = true;
    }
  }

  // Fetch all-time financial contribution and penalties ledger
  useEffect(() => {
    if (apiFetch) {
      apiFetch('/penalties/ledger')
        .then(res => {
          if (res) {
            if (res.metadata) {
              setClubMetadata(res.metadata);
            }
            if (Array.isArray(res.members)) {
              const athId = athlete?.id ? String(athlete.id) : null;
              const normFullName = `${athlete?.firstname || ''} ${athlete?.lastname || ''}`.trim().toLowerCase();
              const match = res.members.find(m => 
                (athId && m.athleteId && String(m.athleteId) === athId) ||
                (m.rawName && userMatchKey && m.rawName.toLowerCase() === userMatchKey.toLowerCase()) ||
                (normFullName && m.fullName && m.fullName.toLowerCase() === normFullName)
              );
              if (match) {
                setMatchedMemberRecord(match);
                if (match.financialSummary) {
                  setAllTimeFinancial(match.financialSummary);
                }
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [apiFetch, athlete, userMatchKey]);

  // Fetch targets from backend API
  const loadUserTarget = useCallback(async () => {
    if (!apiFetch || !userKey) return;
    try {
      const data = await apiFetch('/challenge/targets', { cache: 'no-store' });
      if (data && userKey && data[userKey]) {
        const item = data[userKey];
        if (item.target !== undefined && item.target !== null && item.target !== '') {
          const num = Number(item.target);
          const validNum = !isNaN(num) && num > 0 ? num : 0;
          setGoal(validNum);
          setTempGoal(validNum > 0 ? String(validNum) : '');
        } else {
          setGoal(0);
          setTempGoal('');
        }
        if (item.penalty !== undefined) {
          setHasPenalty(Boolean(item.penalty));
          setTempPenalty(Boolean(item.penalty));
        } else {
          setHasPenalty(false);
          setTempPenalty(false);
        }
      } else if (data && userMatchKey && data[userMatchKey]) {
        // Fallback to non-month-specific key if existing
        const item = data[userMatchKey];
        if (item.target !== undefined && item.target !== null && item.target !== '') {
          const num = Number(item.target);
          const validNum = !isNaN(num) && num > 0 ? num : 0;
          setGoal(validNum);
          setTempGoal(validNum > 0 ? String(validNum) : '');
        } else {
          setGoal(0);
          setTempGoal('');
        }
        if (item.penalty !== undefined) {
          setHasPenalty(Boolean(item.penalty));
          setTempPenalty(Boolean(item.penalty));
        } else {
          setHasPenalty(false);
          setTempPenalty(false);
        }
      } else {
        // No target record exists -> default to 0 (no target)
        setGoal(0);
        setTempGoal('');
        setHasPenalty(false);
        setTempPenalty(false);
      }
    } catch (e) {
      console.error('Error loading target from API:', e);
    }
  }, [apiFetch, userKey, userMatchKey]);

  useEffect(() => {
    loadUserTarget();

    const handleTargetsUpdated = (e) => {
      if (e && e.detail) {
        const { matchKey, year: updatedYear, month: updatedMonth, target, penalty } = e.detail;
        if (matchKey === userMatchKey && updatedYear == currentYear && updatedMonth == currentMonth) {
          if (target !== undefined && target !== null && target !== '') {
            const num = Number(target);
            const validTarget = !isNaN(num) && num > 0 ? num : 0;
            setGoal(validTarget);
            setTempGoal(validTarget > 0 ? String(validTarget) : '');
          } else {
            setGoal(0);
            setTempGoal('');
          }
          if (penalty !== undefined) {
            setHasPenalty(Boolean(penalty));
            setTempPenalty(Boolean(penalty));
          }
        }
      }
      setTimeout(loadUserTarget, 300);
    };

    window.addEventListener('challengeTargetsUpdated', handleTargetsUpdated);
    return () => window.removeEventListener('challengeTargetsUpdated', handleTargetsUpdated);
  }, [loadUserTarget, userMatchKey, currentYear, currentMonth]);

  // Calculate distance for the current month
  useEffect(() => {
    // 1. If challengeData is available and user is present, use that distance for exact match
    if (challengeData && challengeData.length > 0 && userMatchKey) {
      const myRow = challengeData.find(r => r.matchKey === userMatchKey);
      if (myRow && myRow.totalDistance !== undefined) {
        setCurrentDist(myRow.totalDistance);
        return;
      }
    }

    // 2. Fallback: calculate from raw activities list
    let dist = 0;
    if (activities && activities.length > 0) {
      activities.forEach(act => {
        if (act.start_date_local && act.distance) {
          const actDateStr = act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local;
          const actDate = new Date(actDateStr);
          if (actDate.getFullYear() === currentYear && (actDate.getMonth() + 1) === currentMonth) {
            // Only runs & trail runs
            const type = (act.type || '').toLowerCase();
            if (['run', 'virtualrun', 'trailrun', 'trail run'].includes(type) || type.includes('run') || type.includes('trail') || !type) {
              dist += act.distance;
            }
          }
        }
      });
    }
    
    // distance is in meters, convert to km
    setCurrentDist(Math.round((dist / 1000) * 100) / 100);
  }, [activities, challengeData, userMatchKey, currentYear, currentMonth]);

  const handleStartEdit = () => {
    setTempGoal(goal > 0 ? String(goal) : '');
    setTempPenalty(hasPenalty);
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const cleanStr = String(tempGoal).trim().replace(/^0+(?=\d)/, '');
    const num = cleanStr === '' ? 0 : parseInt(cleanStr, 10);
    const validTarget = isNaN(num) ? 0 : Math.max(0, num);
    const newPenalty = Boolean(tempPenalty);

    setGoal(validTarget);
    setHasPenalty(newPenalty);
    setIsEditing(false);

    if (apiFetch && userKey) {
      setSaving(true);
      try {
        await apiFetch('/challenge/targets', {
          method: 'POST',
          body: JSON.stringify({
            matchKey: userKey,
            target: validTarget,
            penalty: newPenalty
          })
        });

        // Trigger event so ChallengeTable & other components update in real time
        window.dispatchEvent(new CustomEvent('challengeTargetsUpdated', {
          detail: { matchKey: userMatchKey, year: currentYear, month: currentMonth, target: validTarget, penalty: newPenalty }
        }));

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } catch (err) {
        console.error('Error saving target to API:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempGoal(goal > 0 ? String(goal) : '');
    setTempPenalty(hasPenalty);
  };

  const percent = goal > 0 ? Math.min(Math.round((currentDist / goal) * 100) || 0, 100) : 0;
  const isGoalReached = goal > 0 && currentDist >= goal;

  // Format month text
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString(
    lang === 'vi' ? 'vi-VN' : 'en-US', 
    { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }
  );

  // Smart Pace & Days Analysis
  const paceAnalysis = useMemo(() => {
    const today = new Date();
    const isCurrentMonth = (today.getMonth() + 1 === currentMonth) && (today.getFullYear() === currentYear);
    const isPastMonth = (currentYear < today.getFullYear()) || (currentYear === today.getFullYear() && currentMonth < (today.getMonth() + 1));
    const isFutureMonth = (currentYear > today.getFullYear()) || (currentYear === today.getFullYear() && currentMonth > (today.getMonth() + 1));

    let daysPassed = 0;
    let daysLeft = 0;
    const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    if (isCurrentMonth) {
      daysPassed = today.getDate();
      daysLeft = Math.max(1, totalDaysInMonth - daysPassed + 1); // including today
    } else if (isPastMonth) {
      daysPassed = totalDaysInMonth;
      daysLeft = 0;
    } else {
      daysPassed = 0;
      daysLeft = totalDaysInMonth;
    }

    const remainingKm = goal > 0 ? Math.max(0, Math.round((goal - currentDist) * 10) / 10) : 0;
    const requiredPacePerDay = (goal > 0 && daysLeft > 0 && remainingKm > 0) ? (remainingKm / daysLeft).toFixed(1) : '0.0';
    const expectedPercent = totalDaysInMonth > 0 ? (daysPassed / totalDaysInMonth) * 100 : 0;
    const currentPercent = goal > 0 ? (currentDist / goal) * 100 : 0;

    return {
      isCurrentMonth,
      isPastMonth,
      isFutureMonth,
      daysPassed,
      daysLeft,
      totalDaysInMonth,
      remainingKm,
      requiredPacePerDay,
      expectedPercent,
      currentPercent
    };
  }, [goal, currentDist, currentYear, currentMonth]);

  // Tính tiền phạt dự kiến nếu có cam kết phạt và target > 0
  let penaltyDue = 0;
  if (hasPenalty && goal > 0) {
    if (paceAnalysis.remainingKm > 0) {
      const rawK = 200 * (paceAnalysis.remainingKm / goal);
      penaltyDue = Math.min(200, Math.ceil(rawK / 10) * 10);
    }
  }

  // 1. Dữ liệu Tiết kiệm Tiền phạt & Bảo vệ Ví tiền (Phương án 1 & 2)
  const savingsData = useMemo(() => {
    if (!hasPenalty || goal <= 0) return null;
    const maxPenaltyK = 200;
    const penaltySavedK = Math.max(0, maxPenaltyK - penaltyDue);
    const penaltySavedVND = penaltySavedK * 1000;
    const maxPenaltyVND = maxPenaltyK * 1000;
    const savedPercent = Math.min(100, Math.round((penaltySavedK / maxPenaltyK) * 100));
    const savingsPerKm = goal > 0 ? Math.round(maxPenaltyVND / goal) : 0;

    let nextThresholdK = 0;
    if (penaltyDue > 150) nextThresholdK = 150;
    else if (penaltyDue > 100) nextThresholdK = 100;
    else if (penaltyDue > 50) nextThresholdK = 50;
    else if (penaltyDue > 0) nextThresholdK = 0;

    let kmNeededForNextTier = 0;
    if (penaltyDue > 0) {
      const kmAtNextThreshold = goal * (nextThresholdK / maxPenaltyK);
      kmNeededForNextTier = Math.max(0.1, Math.round((paceAnalysis.remainingKm - kmAtNextThreshold) * 10) / 10);
    }

    return {
      penaltySavedK,
      penaltySavedVND,
      maxPenaltyVND,
      savedPercent,
      savingsPerKm,
      nextThresholdK,
      kmNeededForNextTier,
      isFullySaved: penaltyDue === 0 && isGoalReached
    };
  }, [hasPenalty, goal, penaltyDue, paceAnalysis.remainingKm, isGoalReached]);

  // 2. Tác động Quỹ CLB (Phương án 1)
  const treasuryImpact = useMemo(() => {
    const memberTotal = allTimeFinancial?.totalPenaltyVND || 0;
    const clubTotal = clubMetadata?.totalPenaltyFundCollected || 16900000;
    const sharePct = clubTotal > 0 ? ((memberTotal / clubTotal) * 100).toFixed(1) : '0.0';
    const completedMonths = allTimeFinancial?.targetCompletedMonths || 0;

    return {
      memberTotal,
      clubTotal,
      sharePct,
      completedMonths,
      rank: allTimeFinancial?.penaltyRank || 0
    };
  }, [allTimeFinancial, clubMetadata]);

  // 3. Lịch sử nộp phạt cá nhân (Phương án 3: Hiển thị cho tất cả thành viên, Admin tương tác, User chỉ xem)
  const adminPenaltyHistory = useMemo(() => {
    let penaltiesObj = {};
    let paymentStatusObj = {};

    if (matchedMemberRecord && matchedMemberRecord.monthlyPenaltiesVND) {
      penaltiesObj = matchedMemberRecord.monthlyPenaltiesVND;
      paymentStatusObj = matchedMemberRecord.monthlyPaymentStatus || {};
    }

    const months = Object.keys(penaltiesObj).sort().reverse();
    if (months.length > 0) {
      return months.slice(0, 3).map(mKey => {
        const penaltyAmount = penaltiesObj[mKey] || 0;
        const payment = paymentStatusObj[mKey] || { status: penaltyAmount === 0 ? 'safe' : 'unpaid' };
        const [y, m] = mKey.split('-');
        const label = lang === 'vi' ? `T${parseInt(m, 10)}/${y}` : `M${parseInt(m, 10)}/${y}`;
        return {
          monthKey: mKey,
          label,
          penaltyAmount,
          status: payment.status || (penaltyAmount === 0 ? 'safe' : 'unpaid')
        };
      });
    }

    // Fallback: Nếu runner chưa có bản ghi phạt, hiển thị 3 tháng gần nhất với trạng thái 0đ Đạt chuẩn
    const fallbackMonths = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const mKey = `${y}-${String(m).padStart(2, '0')}`;
      const label = lang === 'vi' ? `T${m}/${y}` : `M${m}/${y}`;
      fallbackMonths.push({
        monthKey: mKey,
        label,
        penaltyAmount: 0,
        status: 'safe'
      });
    }
    return fallbackMonths;
  }, [matchedMemberRecord, lang, currentYear, currentMonth]);

  // Admin bấm chuyển trạng thái nộp phạt (Paid/Unpaid)
  const handleAdminTogglePenaltyStatus = async (item) => {
    if (!effectiveIsAdmin) return;
    if (item.penaltyAmount === 0) {
      Swal.fire({
        title: t('safeStatusTag'),
        text: t('safeNoPenaltyAlert'),
        icon: 'info',
        confirmButtonColor: '#00A3A6',
        confirmButtonText: 'OK'
      });
      return;
    }

    const nextStatus = item.status === 'paid' ? 'unpaid' : 'paid';
    const confirmText = nextStatus === 'paid'
      ? t('confirmToggleToPaid').replace('{month}', item.label)
      : t('confirmToggleToUnpaid').replace('{month}', item.label);

    const result = await Swal.fire({
      title: t('confirmUpdatePenaltyStatus'),
      text: confirmText,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#00A3A6',
      cancelButtonColor: '#64748b',
      confirmButtonText: lang === 'vi' ? 'Xác nhận' : 'Confirm',
      cancelButtonText: lang === 'vi' ? 'Hủy' : 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await apiFetch('/penalties/payment', {
          method: 'POST',
          body: JSON.stringify({
            athleteId: athlete?.id || null,
            rawName: matchedMemberRecord?.rawName || matchedMemberRecord?.fullName || userMatchKey,
            month: item.monthKey,
            status: nextStatus,
            actor: 'Admin'
          })
        });

        // Cập nhật state cục bộ để UI phản hồi ngay lập tức
        setMatchedMemberRecord(prev => {
          if (!prev) return prev;
          const newPaymentStatus = { ...(prev.monthlyPaymentStatus || {}) };
          newPaymentStatus[item.monthKey] = {
            status: nextStatus,
            paidAt: nextStatus === 'paid' ? new Date().toISOString() : null,
            updatedBy: 'Admin',
            updatedAt: new Date().toISOString()
          };
          return { ...prev, monthlyPaymentStatus: newPaymentStatus };
        });

        window.dispatchEvent(new CustomEvent('challengeTargetsUpdated', { detail: { refresh: true } }));

        Swal.fire({
          title: t('updatePenaltySuccess'),
          icon: 'success',
          timer: 1600,
          showConfirmButton: false
        });
      } catch (err) {
        Swal.fire({
          title: lang === 'vi' ? 'Lỗi' : 'Error',
          text: err.message,
          icon: 'error',
          confirmButtonColor: '#002D54'
        });
      }
    }
  };

  // Calculate Monthly Statistics
  const monthlyStats = useMemo(() => {
    let totalDist = 0;
    let totalTime = 0;
    let longestRun = 0;
    let runsCount = 0;
    const activeDaysSet = new Set();

    if (activities && activities.length > 0) {
      activities.forEach(act => {
        if (act.start_date_local && act.distance) {
          const actDateStr = act.start_date_local.endsWith('Z') ? act.start_date_local.slice(0, -1) : act.start_date_local;
          const actDate = new Date(actDateStr);
          if (actDate.getFullYear() === currentYear && (actDate.getMonth() + 1) === currentMonth) {
            const type = (act.type || '').toLowerCase();
            if (['run', 'virtualrun', 'trailrun', 'trail run'].includes(type) || type.includes('run') || type.includes('trail') || !type) {
              const distKm = act.distance / 1000;
              totalDist += distKm;
              if (act.moving_time) totalTime += act.moving_time;
              if (distKm > longestRun) longestRun = distKm;
              runsCount++;
              activeDaysSet.add(actDate.getDate());
            }
          }
        }
      });
    }
    
    let avgPaceStr = '--:--';
    if (totalDist > 0 && totalTime > 0) {
      const paceSecondsPerKm = totalTime / totalDist;
      const mins = Math.floor(paceSecondsPerKm / 60);
      const secs = Math.floor(paceSecondsPerKm % 60);
      avgPaceStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const hours = Math.floor(totalTime / 3600);
    const minutes = Math.floor((totalTime % 3600) / 60);
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      totalDistance: Math.round(totalDist * 10) / 10,
      totalTimeStr: timeStr,
      activeDays: activeDaysSet.size,
      runsCount,
      longestRun: Math.round(longestRun * 10) / 10,
      averagePace: avgPaceStr,
      avgDistPerRun: runsCount > 0 ? Math.round((totalDist / runsCount) * 10) / 10 : 0
    };
  }, [activities, currentYear, currentMonth]);

  // Fallback quy tắc cơ bản (hiển thị ngay lập tức khi chưa có dữ liệu AI)
  const fallbackCoach = useMemo(() => {
    if (goal <= 0) {
      return {
        message: lang === 'vi' ? 'Hãy thiết lập mục tiêu tháng để nhận tư vấn và kế hoạch tập luyện cá nhân hóa!' : 'Set a monthly goal to get personalized coaching and training plans!',
        type: 'info',
        badge: 'Goal Setup'
      };
    }
    
    if (isGoalReached) {
      return {
        message: lang === 'vi' ? 'Tuyệt vời! Bạn đã đạt mục tiêu tháng này. Hãy nghỉ ngơi phục hồi hoặc đặt thêm một mục tiêu phụ (stretch goal) nhé.' : 'Incredible! You reached your goal. Take some rest or push for a stretch goal.',
        type: 'success',
        badge: 'Goal Reached 🎯'
      };
    }

    if (paceAnalysis.isPastMonth) {
      return {
        message: lang === 'vi' ? 'Tháng này đã kết thúc. Chúc bạn có những thành tích tốt hơn trong tương lai!' : 'This month has ended. Wish you better achievements in the future!',
        type: 'info',
        badge: 'Month Ended'
      };
    }

    if (paceAnalysis.isFutureMonth) {
      return {
        message: lang === 'vi' ? 'Tháng này chưa bắt đầu. Hãy lên kế hoạch tập luyện sẵn sàng nhé!' : 'This month hasn\'t started yet. Get ready!',
        type: 'info',
        badge: 'Upcoming Month'
      };
    }

    if (paceAnalysis.currentPercent >= paceAnalysis.expectedPercent) {
      return {
        message: lang === 'vi' 
          ? `Làm tốt lắm! Bạn đang đi đúng tiến độ. Cứ giữ nhịp độ tối thiểu ${paceAnalysis.requiredPacePerDay} km/ngày, bạn sẽ hoàn thành mục tiêu dễ dàng.` 
          : `Great job! You are on track. Maintain at least ${paceAnalysis.requiredPacePerDay} km/day to hit your goal easily.`,
        type: 'success',
        badge: 'On Track 👍'
      };
    } else {
      return {
        message: lang === 'vi' 
          ? `Bạn đang chậm hơn tiến độ dự kiến. Cần chạy trung bình ${paceAnalysis.requiredPacePerDay} km/ngày trong ${paceAnalysis.daysLeft} ngày còn lại. Hãy sắp xếp thời gian nhé!` 
          : `You're slightly behind schedule. You need to run ${paceAnalysis.requiredPacePerDay} km/day for the remaining ${paceAnalysis.daysLeft} days. You can do it!`,
        type: 'warning',
        badge: 'Behind Schedule ⚠️'
      };
    }
  }, [goal, isGoalReached, paceAnalysis, lang]);

  // AI Running Coach States
  const [aiAdvice, setAiAdvice] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [loadingWeeklyPlan, setLoadingWeeklyPlan] = useState(false);

  // Lời khuyên mở rộng cho Coach Recommendations (Chiến lược tuần, Phục hồi, Bài tập kế tiếp)
  const effectiveActionPlan = useMemo(() => {
    if (aiAdvice?.actionPlan) return aiAdvice.actionPlan;
    if (goal <= 0) return lang === 'vi' ? 'Chọn mục tiêu từ 50km - 150km phù hợp với thể lực.' : 'Set a realistic target between 50km - 150km.';
    if (isGoalReached) return lang === 'vi' ? 'Chạy thả lỏng 3-5km hoặc nghỉ ngơi phục hồi dưỡng sức.' : 'Easy 3-5km recovery jog or active rest.';
    const nextKm = Math.max(3, Math.min(8, Math.round(parseFloat(paceAnalysis.requiredPacePerDay) * 1.5)));
    return lang === 'vi' 
      ? `Buổi tới: Chạy ${nextKm} km ở nhịp thở trò chuyện thoải mái (Zone 2).` 
      : `Next session: ${nextKm} km at conversational pace (Zone 2).`;
  }, [aiAdvice, goal, isGoalReached, paceAnalysis, lang]);

  const effectiveStrategyTip = useMemo(() => {
    if (aiAdvice?.strategyTip) return aiAdvice.strategyTip;
    if (isGoalReached) {
      return lang === 'vi' 
        ? 'Đã hoàn thành cự ly tháng. Hãy duy trì các bài chạy ngắn tích lũy hiếu khí nhẹ nhàng.' 
        : 'Monthly goal completed. Switch to short aerobic maintenance runs.';
    }
    if (goal <= 0) {
      return lang === 'vi' 
        ? 'Chọn mục tiêu phù hợp để AI Coach lập chiến lược phân bổ km mỗi tuần.' 
        : 'Set a goal so AI Coach can map out your weekly mileage.';
    }
    const remainingWeeks = Math.max(1, Math.ceil(paceAnalysis.daysLeft / 7));
    const sessionsPerWeek = Math.min(4, Math.max(2, Math.round(paceAnalysis.remainingKm / 6) || 3));
    const kmPerSession = (paceAnalysis.remainingKm / (remainingWeeks * sessionsPerWeek)).toFixed(1);
    return lang === 'vi'
      ? `Duy trì ~${sessionsPerWeek} buổi/tuần, mỗi buổi ~${kmPerSession} km để hoàn thành mục tiêu ${goal} km bền bỉ, không dồn áp lực cuối tháng.`
      : `Aim for ~${sessionsPerWeek} runs/week (~${kmPerSession} km each) to hit ${goal} km smoothly without late-month strain.`;
  }, [aiAdvice, goal, isGoalReached, paceAnalysis, lang]);

  const effectiveRecoveryTip = useMemo(() => {
    if (aiAdvice?.recoveryTip) return aiAdvice.recoveryTip;
    return lang === 'vi'
      ? 'Bù 300-500ml nước điện giải ngay sau chạy, nạp 20g protein trong 45 phút đầu và ngủ đủ 7-8 tiếng để phục hồi sợi cơ.'
      : 'Sip 300-500ml electrolytes post-run, consume 20g protein within 45 mins, and prioritize 7-8h sleep for muscle repair.';
  }, [aiAdvice, lang]);

  const readinessScore = aiAdvice?.readinessScore || (monthlyStats.runsCount >= 3 ? 88 : 92);

  // Gọi API lấy tư vấn AI Coach theo hoạt động
  const handleFetchAiAdvice = useCallback(async (force = false) => {
    if (!apiFetch) return;
    setLoadingAi(true);
    try {
      const res = await apiFetch('/ai/coach-advice', {
        method: 'POST',
        body: JSON.stringify({
          athlete,
          activities,
          goal,
          currentDist,
          paceAnalysis,
          hasPenalty,
          penaltyDue,
          lang,
          forceRefresh: force
        })
      });
      if (res && res.message) {
        setAiAdvice(res);
      }
    } catch (err) {
      console.warn('Lỗi khi tải AI Coach Advice:', err.message);
    } finally {
      setLoadingAi(false);
    }
  }, [apiFetch, athlete, activities, goal, currentDist, paceAnalysis, hasPenalty, penaltyDue, lang]);

  // Tự động gọi phân tích khi mount hoặc khi activities thay đổi
  useEffect(() => {
    handleFetchAiAdvice(false);
  }, [handleFetchAiAdvice]);

  // Gọi API lấy Kế hoạch tập luyện tuần (Weekly Plan)
  const handleFetchWeeklyPlan = useCallback(async (force = false) => {
    if (!apiFetch) return;
    setLoadingWeeklyPlan(true);
    setShowWeeklyModal(true);
    try {
      const res = await apiFetch('/ai/weekly-plan', {
        method: 'POST',
        body: JSON.stringify({
          athlete,
          activities,
          goal,
          currentDist,
          paceAnalysis,
          hasPenalty,
          penaltyDue,
          lang,
          forceRefresh: force
        })
      });
      if (res && res.schedule) {
        setWeeklyPlan(res);
      }
    } catch (err) {
      console.warn('Lỗi khi tải Weekly Plan:', err.message);
    } finally {
      setLoadingWeeklyPlan(false);
    }
  }, [apiFetch, athlete, activities, goal, currentDist, paceAnalysis, hasPenalty, penaltyDue, lang]);

  return (
    <div className="personal-goal-dashboard pg-layout-2col">
      
      {/* COLUMN 1: HERO CARD (MONTHLY GOAL + STATS + AI COACH) */}
      <div className="pg-card pg-hero-card">
        <div className="personal-goal__header">
          <div className="personal-goal__title">
            <div className="personal-goal__icon-badge">
              <Target size={20} color="#00A3A6" />
            </div>
            <div>
              <span className="personal-goal__main-title">{t('personalGoalTitle')}</span>
              <span className="personal-goal__month-subtitle"> ({monthName})</span>
            </div>
          </div>
          
          {!isEditing && (
            <button 
              className="btn-icon btn-edit-goal" 
              onClick={isLockedByDate ? undefined : handleStartEdit} 
              title={isLockedByDate ? `${lang === 'en' ? 'Only Admins can edit targets after day' : 'Chỉ Admin mới có thể thay đổi mục tiêu sau ngày'} ${lockTargetsAfterDate}` : (goal > 0 ? t('editGoal') : t('setGoal'))}
              style={isLockedByDate ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              disabled={isLockedByDate}
            >
              <Edit2 size={16} />
              <span style={{ fontSize: '0.8rem', marginLeft: '4px', fontWeight: 600 }}>{goal > 0 ? t('editGoal') : t('setGoal')}</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <form className="personal-goal__edit-form" onSubmit={handleSave}>
            <div className="personal-goal__edit-fields">
              <div className="form-group-compact">
                <label className="compact-label">{t('targetKm')}:</label>
                <div className="input-with-unit">
                  <input 
                    type="number" 
                    value={tempGoal} 
                    onChange={(e) => setTempGoal(e.target.value)}
                    className="goal-input-premium"
                    placeholder="0"
                    min="0"
                    autoFocus
                  />
                  <span className="goal-unit-badge">km</span>
                </div>
              </div>

              <div className="form-group-compact penalty-toggle-group">
                <label className="penalty-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={tempPenalty} 
                    onChange={(e) => setTempPenalty(e.target.checked)}
                    className="custom-penalty-checkbox"
                  />
                  <span className="penalty-label-text">
                    <strong>{t('joinPenaltyChallenge')}</strong>
                    <small>{t('penaltyChallengeHint')}</small>
                  </span>
                </label>
              </div>
            </div>

            <div className="personal-goal__edit-actions">
              <button type="button" className="btn-secondary-sm" onClick={handleCancel}>
                <X size={15} style={{ marginRight: 4 }} /> {t('cancel')}
              </button>
              <button type="submit" className="btn-primary-sm" disabled={saving}>
                <Check size={15} style={{ marginRight: 4 }} /> {saving ? t('saving') : t('save')}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Goal Progress Section (Tight Grouping) */}
            <div className="pg-goal-progress-wrap">
              <div className="personal-goal__stats" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div className="goal-numbers" style={{ display: 'flex', alignItems: 'baseline', gap: '6px', lineHeight: 1 }}>
                  <span className="current-dist" style={{ lineHeight: 1 }}>{currentDist.toFixed(1)}</span>
                  <span className="total-goal" style={{ lineHeight: 1 }}>/ {goal > 0 ? `${goal} km` : `${t('noGoalSet')} (0 km)`}</span>
                </div>
                <div className={`goal-percent-badge ${isGoalReached ? 'is-complete' : ''}`} style={{ alignSelf: 'flex-end', lineHeight: 1.2, marginBottom: 0 }}>
                  {goal > 0 ? `${percent}% ${isGoalReached ? '🎯' : ''}` : '--'}
                </div>
              </div>

              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${goal > 0 ? Math.max(percent, 3) : 0}%`,
                    background: isGoalReached 
                      ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                      : 'linear-gradient(90deg, #00A3A6 0%, #B5D334 100%)'
                  }}
                ></div>
              </div>

              {isGoalReached && (
                <p className="goal-congrats">🎉 {t('goalReached')}</p>
              )}

              {/* Smart Pacing Metrics Bar */}
              <div className="pg-goal-smart-metrics">
                <div className="smart-metric-item">
                  <span className="smart-metric-label">{t('daysRemaining')}</span>
                  <span className="smart-metric-val">
                    {paceAnalysis.isCurrentMonth ? `${paceAnalysis.daysLeft} ${lang === 'vi' ? 'ngày' : 'days'}` : (paceAnalysis.isPastMonth ? (lang === 'vi' ? 'Đã hết' : 'Ended') : `${paceAnalysis.daysLeft} ${lang === 'vi' ? 'ngày' : 'days'}`)}
                  </span>
                </div>
                <div className="smart-metric-divider" />
                <div className="smart-metric-item">
                  <span className="smart-metric-label">{t('remainingDistance')}</span>
                  <span className="smart-metric-val highlight">
                    {goal <= 0 ? '--' : (isGoalReached ? '0 km' : `${paceAnalysis.remainingKm} km`)}
                  </span>
                </div>
                <div className="smart-metric-divider" />
                <div className="smart-metric-item">
                  <span className="smart-metric-label">{t('dailyPaceTarget')}</span>
                  <span className="smart-metric-val accent">
                    {goal <= 0 ? '--' : (isGoalReached ? (lang === 'vi' ? 'Đã hoàn thành' : 'Completed') : `${paceAnalysis.requiredPacePerDay} km/${lang === 'vi' ? 'ngày' : 'day'}`)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3x2 Monthly Stats Grid */}
            <div className="monthly-stats-grid">
              <div className="stat-widget">
                <div className="stat-widget-icon"><Activity size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Tổng Km' : 'Total Distance'}</span>
                  <span className="stat-widget-value">{monthlyStats.totalDistance} <small>km</small></span>
                </div>
              </div>
              <div className="stat-widget">
                <div className="stat-widget-icon"><Clock size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Thời gian' : 'Moving Time'}</span>
                  <span className="stat-widget-value">{monthlyStats.totalTimeStr}</span>
                </div>
              </div>
              <div className="stat-widget">
                <div className="stat-widget-icon"><Calendar size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Ngày chạy' : 'Active Days'}</span>
                  <span className="stat-widget-value">{monthlyStats.activeDays} <small>{lang === 'vi' ? 'ngày' : 'days'}</small></span>
                </div>
              </div>
              <div className="stat-widget">
                <div className="stat-widget-icon"><BarChart2 size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Tốc độ TB' : 'Avg Pace'}</span>
                  <span className="stat-widget-value">{monthlyStats.averagePace} <small>/km</small></span>
                </div>
              </div>
              <div className="stat-widget">
                <div className="stat-widget-icon"><TrendingUp size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Dài nhất' : 'Longest Run'}</span>
                  <span className="stat-widget-value">{monthlyStats.longestRun} <small>km</small></span>
                </div>
              </div>
              <div className="stat-widget">
                <div className="stat-widget-icon"><Target size={17} /></div>
                <div className="stat-widget-info">
                  <span className="stat-widget-label">{lang === 'vi' ? 'Số lần chạy' : 'Total Runs'}</span>
                  <span className="stat-widget-value">{monthlyStats.runsCount} <small>{lang === 'vi' ? 'lần' : 'runs'}</small></span>
                </div>
              </div>
            </div>

            {/* AI Coach / Recommendations */}
            <div className={`ai-coach-box ai-coach-${aiAdvice?.type || fallbackCoach.type}`}>
              <div className="ai-coach-header-row">
                <div className="ai-coach-title-wrap">
                  <div className="ai-coach-icon">
                    <Sparkles size={16} />
                  </div>
                  <h4 className="ai-coach-title">
                    {lang === 'vi' ? 'Tư vấn & Kế hoạch' : 'Coach Recommendations'}
                  </h4>
                  <span className="ai-coach-badge">
                    {aiAdvice?.badge || fallbackCoach.badge}
                  </span>
                  {readinessScore && (
                    <span className="ai-coach-readiness-pill" title={t('coachReadinessLabel')}>
                      ⚡ {t('readinessTag')} {readinessScore}%
                    </span>
                  )}
                </div>
                
                <div className="ai-coach-actions">
                  <button 
                    type="button" 
                    className="btn-ai-coach-action"
                    onClick={() => handleFetchWeeklyPlan()}
                    title={lang === 'vi' ? 'Xem kế hoạch tập luyện 7 ngày trong tuần' : 'View 7-day training plan'}
                  >
                    <CalendarDays size={13} />
                    <span>{lang === 'vi' ? 'Kế hoạch tuần' : 'Weekly Plan'}</span>
                  </button>

                  <button 
                    type="button" 
                    className={`btn-ai-coach-refresh ${loadingAi ? 'is-loading' : ''}`}
                    onClick={() => handleFetchAiAdvice(true)}
                    title={lang === 'vi' ? 'Phân tích lại với AI' : 'Refresh AI analysis'}
                    disabled={loadingAi}
                  >
                    <RotateCw size={13} className={loadingAi ? 'spin-icon' : ''} />
                  </button>
                </div>
              </div>

              <div className="ai-coach-body">
                {loadingAi ? (
                  <div className="ai-coach-generating">
                    <span className="ai-dot-pulse" />
                    <span>{lang === 'vi' ? 'AI Coach đang phân tích hoạt động & thể lực...' : 'AI Coach is analyzing activities & stamina...'}</span>
                  </div>
                ) : (
                  <p className="ai-coach-message">{aiAdvice?.message || fallbackCoach.message}</p>
                )}
              </div>

              {!loadingAi && (
                <div className="ai-coach-extended-section">
                  {/* Highlight Next Workout */}
                  <div className="ai-coach-action-plan">
                    <span className="action-plan-label">💡 {t('nextWorkoutLabel')}:</span>
                    <span className="action-plan-text">{effectiveActionPlan}</span>
                  </div>

                  {/* 2-Column Strategy & Recovery Cards */}
                  <div className="ai-coach-insights-grid">
                    <div className="ai-coach-insight-card strategy-card">
                      <div className="insight-card-header">
                        <TrendingUp size={13} color="#00A3A6" />
                        <span>{t('weeklyStrategyLabel')}</span>
                      </div>
                      <p className="insight-card-text">{effectiveStrategyTip}</p>
                    </div>

                    <div className="ai-coach-insight-card recovery-card">
                      <div className="insight-card-header">
                        <Activity size={13} color="#10b981" />
                        <span>{t('recoveryNutritionLabel')}</span>
                      </div>
                      <p className="insight-card-text">{effectiveRecoveryTip}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* COLUMN 2: ASIDE CARD (DISCIPLINE & CLUB FUND) */}
      <div className="pg-card pg-aside-penalty-card">
        <div className="personal-goal__header">
          <div className="personal-goal__title">
            <div className="personal-goal__icon-badge" style={{ background: 'rgba(255, 152, 0, 0.1)' }}>
              <ShieldAlert size={20} color="#FF9800" />
            </div>
            <div>
              <span className="personal-goal__main-title">{t('disciplineAndFund')}</span>
              <span className="personal-goal__month-subtitle"> ({monthName})</span>
            </div>
          </div>
        </div>

        <div className="pg-aside-content">
          <div className="personal-goal__penalty-section">
            {hasPenalty ? (
              <div className={`penalty-status-box ${isGoalReached ? 'penalty-status-safe' : 'penalty-status-active'}`}>
                <div className="penalty-status-header">
                  {isGoalReached ? (
                    <ShieldCheck size={18} className="penalty-icon safe" />
                  ) : (
                    <ShieldAlert size={18} className="penalty-icon warning" />
                  )}
                  <span className="penalty-status-title">
                    {t('penaltyCommitted')} (Max 200k)
                  </span>
                  {penaltyDue > 0 ? (
                    <span className="penalty-amount-badge owing">
                      {t('estimatedPenalty')} <strong>{penaltyDue}k</strong>
                    </span>
                  ) : (
                    <span className="penalty-amount-badge safe">
                      {t('penaltyFree')}
                    </span>
                  )}
                </div>
                <p className="penalty-status-desc">
                  {isGoalReached ? (
                    lang === 'vi' 
                      ? '🎉 Xuất sắc! Bạn đã hoàn thành mục tiêu đề ra và không bị phạt tiền tháng này.' 
                      : '🎉 Outstanding! You reached your goal and have 0k penalty.'
                  ) : (
                    lang === 'vi' 
                      ? `🏃 Bạn còn thiếu ${paceAnalysis.remainingKm} km để hoàn thành mục tiêu và tránh nộp phạt.` 
                      : `🏃 You need ${paceAnalysis.remainingKm} more km to complete your goal and avoid penalty.`
                  )}
                </p>
              </div>
            ) : (
              <div className="penalty-status-box penalty-status-none">
                <div className="penalty-status-header">
                  <Info size={18} className="penalty-icon neutral" />
                  <span className="penalty-status-title" style={{ color: 'var(--text-secondary)' }}>
                    {t('penaltyNotCommitted')}
                  </span>
                  <button 
                    type="button" 
                    className="btn-premium-action" 
                    onClick={isLockedByDate ? undefined : handleStartEdit}
                    title={isLockedByDate ? `${lang === 'en' ? 'Only Admins can edit targets after day' : 'Chỉ Admin mới có thể thay đổi mục tiêu sau ngày'} ${lockTargetsAfterDate}` : ''}
                    style={isLockedByDate ? { opacity: 0.5, cursor: 'not-allowed', textDecoration: 'none', marginLeft: 'auto' } : { marginLeft: 'auto' }}
                    disabled={isLockedByDate}
                  >
                    <Sparkles size={14} style={{ marginRight: 6 }} />
                    {lang === 'vi' ? 'Tham gia Phạt' : 'Join Penalty'}
                  </button>
                </div>
                <p className="penalty-status-desc" style={{ color: 'var(--text-muted)' }}>
                  🏃 {lang === 'vi' ? 'Tham gia mục tiêu có phạt để nâng cao kỷ luật và đóng góp quỹ nhóm.' : 'Join penalty goals to increase discipline and contribute to the club fund.'}
                </p>
              </div>
            )}
          </div>

          {saveSuccess && (
            <div className="sync-success-pill">
              <CheckCircle2 size={14} color="#10b981" />
              <span>{t('syncedWithAdmin')}</span>
            </div>
          )}

          {/* OPTION 1 & 2: WALLET DEFENSE & SAVINGS TIER */}
          {savingsData && (
            <div className="pg-savings-defense-card">
              <div className="savings-card-header">
                <div className="savings-header-title">
                  <Wallet size={15} className="savings-icon" />
                  <span>{t('penaltySavedSoFar')}</span>
                </div>
                <span className="savings-badge-pill">
                  {t('savedAmount')}: <strong>{savingsData.penaltySavedK}k</strong> / 200k
                </span>
              </div>

              <div className="savings-progress-track">
                <div 
                  className="savings-progress-bar" 
                  style={{ width: `${savingsData.savedPercent}%` }}
                />
              </div>

              <div className="savings-card-details">
                {savingsData.isFullySaved ? (
                  <div className="savings-note safe">
                    {t('savedFullPenaltyCongrats')}
                  </div>
                ) : (
                  <>
                    <div className="savings-milestone-hint">
                      💡 {t('runMoreToReduceTo')
                        .replace('{km}', savingsData.kmNeededForNextTier)
                        .replace('{amount}', savingsData.nextThresholdK)}
                    </div>
                    <div className="savings-rate-hint">
                      ⚡ {t('perKmSavingsDesc')
                        .replace('{rate}', savingsData.savingsPerKm.toLocaleString('vi-VN'))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* IF NO PENALTY COMMITTED: INSPIRATIONAL PROMPT */}
          {!hasPenalty && (
            <div className="pg-why-penalty-card">
              <div className="why-penalty-header">
                <Sparkles size={15} color="#FF9800" />
                <span>{t('whyJoinDisciplineTitle')}</span>
              </div>
              <ul className="why-penalty-list">
                <li>{t('whyJoinDisciplineP1')}</li>
                <li>{t('whyJoinDisciplineP2')}</li>
              </ul>
            </div>
          )}

          {/* OPTION 1: CLUB TREASURY IMPACT & TRANSPARENCY LINK */}
          <div className="pg-treasury-impact-card">
            <div className="treasury-impact-header">
              <div className="treasury-impact-title-wrap">
                <Award size={15} color="#002D54" />
                <span>{t('clubFundImpact')}</span>
              </div>
              <span className="treasury-share-badge">
                {t('clubFundSharePct').replace('{pct}', treasuryImpact.sharePct)}
              </span>
            </div>

            <div className="treasury-purpose-pills">
              <span className="purpose-pill">🎽 {t('fundPurposeRunningKit')}</span>
              <span className="purpose-pill">💧 {t('fundPurposeHydration')}</span>
              <span className="purpose-pill">🍕 {t('fundPurposeGala')}</span>
            </div>

            <button 
              type="button" 
              className="btn-treasury-quick-link"
              onClick={() => setShowTreasuryModal(true)}
              title={t('viewTreasuryDetails')}
            >
              <Eye size={13} style={{ marginRight: 5 }} />
              {t('viewTreasuryDetails')}
            </button>
          </div>

          {/* OPTION 3: PERSONAL PENALTY HISTORY (HIỂN THỊ CHO TẤT CẢ, ADMIN TƯƠNG TÁC, USER CHỈ XEM) */}
          {adminPenaltyHistory.length > 0 && (
            <div 
              className={`pg-admin-penalty-history ${effectiveIsAdmin ? 'is-admin-interactive' : 'is-readonly-user'}`}
              title={!effectiveIsAdmin ? t('nonAdminNoClickTooltip') : undefined}
            >
              <div className="admin-history-header">
                <div className="admin-history-title-wrap">
                  <Lock size={13} color="#002D54" />
                  <span>{t('adminPenaltyHistoryTitle')}</span>
                </div>
                <span 
                  className={`admin-only-badge ${effectiveIsAdmin ? 'is-interactive-badge' : 'is-locked-badge'}`}
                  title={effectiveIsAdmin ? t('adminClickToToggleTooltip') : t('nonAdminNoClickTooltip')}
                >
                  {effectiveIsAdmin ? `⚡ ${t('adminInteractiveTag')}` : `🔒 ${t('viewOnlyTag')}`}
                </span>
              </div>

              <div className="admin-history-grid">
                {adminPenaltyHistory.map(item => (
                  <div key={item.monthKey} className="admin-history-item">
                    <span className="admin-history-month">{item.label}</span>
                    <span className="admin-history-amount">
                      {item.penaltyAmount > 0 ? `${item.penaltyAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
                    </span>
                    <span 
                      className={`admin-history-status ${item.penaltyAmount === 0 ? 'is-safe' : item.status === 'paid' ? 'is-paid' : 'is-unpaid'} ${effectiveIsAdmin && item.penaltyAmount > 0 ? 'is-clickable' : ''}`}
                      onClick={effectiveIsAdmin ? () => handleAdminTogglePenaltyStatus(item) : undefined}
                      title={effectiveIsAdmin ? (item.penaltyAmount > 0 ? t('adminClickToToggleTooltip') : t('safeNoPenaltyAlert')) : t('nonAdminNoClickTooltip')}
                    >
                      {item.penaltyAmount === 0 ? t('safeStatusTag') : item.status === 'paid' ? t('paidStatusTag') : t('unpaidStatusTag')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Club All-Time Contribution */}
          <div className="personal-goal__club-contribution">
            <div className="contribution-header">
              <div className="contribution-meta">
                <span className="contribution-title">{t('clubAllTimeContribution')}</span>
                <span className="contribution-sub">{lang === 'vi' ? 'Tích lũy toàn thời gian' : 'All-time accumulation'}</span>
              </div>
              {allTimeFinancial && allTimeFinancial.penaltyRank > 0 && (
                <span className="contribution-rank" title={lang === 'vi' ? 'Thứ hạng đóng góp' : 'Contribution Rank'}>
                  Top #{allTimeFinancial.penaltyRank}
                </span>
              )}
            </div>
            <div className="contribution-value">
              {allTimeFinancial ? (allTimeFinancial.totalPenaltyVND || 0).toLocaleString('vi-VN') : '0'} <small>VNĐ</small>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: WEEKLY TRAINING PLAN (KẾ HOẠCH TUẦN CHI TIẾT) */}
      {showWeeklyModal && (
        <div className="weekly-plan-modal-overlay" onClick={() => setShowWeeklyModal(false)}>
          <div className="weekly-plan-modal" onClick={e => e.stopPropagation()}>
            <div className="weekly-plan-modal__header">
              <div className="weekly-plan-modal__title-wrap">
                <div className="weekly-plan-modal__icon-badge">
                  <CalendarDays size={20} color="#00A3A6" />
                </div>
                <div>
                  <h3 className="weekly-plan-modal__title">
                    {lang === 'vi' ? 'Lịch Trình Tập Luyện Tuần Này' : 'Weekly Training Schedule'}
                  </h3>
                  <span className="weekly-plan-modal__subtitle">
                    {weeklyPlan ? (
                      lang === 'vi' 
                        ? `Đã chạy ${weeklyPlan.totalRanThisWeek} km • Mục tiêu tuần: ${weeklyPlan.weeklyGoalKm} km`
                        : `Ran ${weeklyPlan.totalRanThisWeek} km • Week Target: ${weeklyPlan.weeklyGoalKm} km`
                    ) : (
                      lang === 'vi' ? 'Đang phân tích số liệu tuần...' : 'Analyzing weekly workload...'
                    )}
                  </span>
                </div>
              </div>
              
              <button 
                className="btn-modal-close" 
                onClick={() => setShowWeeklyModal(false)}
                title={lang === 'vi' ? 'Đóng' : 'Close'}
              >
                <X size={18} />
              </button>
            </div>

            <div className="weekly-plan-modal__body">
              {loadingWeeklyPlan ? (
                <div className="weekly-plan-loading">
                  <span className="ai-dot-pulse" />
                  <p>{lang === 'vi' ? 'AI Coach đang tối ưu kế hoạch 7 ngày...' : 'AI Coach is optimizing your 7-day schedule...'}</p>
                </div>
              ) : weeklyPlan ? (
                <>
                  {weeklyPlan.coachSummary && (
                    <div className="weekly-plan-summary-box">
                      <Sparkles size={16} className="summary-sparkle-icon" />
                      <p>{weeklyPlan.coachSummary}</p>
                    </div>
                  )}

                  <div className="weekly-schedule-grid">
                    {weeklyPlan.schedule?.map(slot => (
                      <div 
                        key={slot.dayIndex} 
                        className={`schedule-card ${slot.isToday ? 'is-today' : ''} ${slot.isCompleted ? 'is-completed' : ''} ${slot.workoutType?.includes('Rest') || slot.workoutType?.includes('Nghỉ') ? 'is-rest' : ''}`}
                      >
                        <div className="schedule-card__header">
                          <span className="schedule-day-name">{slot.dayName}</span>
                          <span className="schedule-date">{slot.dateStr}</span>
                        </div>

                        <div className="schedule-card__badge-row">
                          {slot.isCompleted ? (
                            <span className="schedule-status-badge completed">
                              <CheckCircle2 size={12} /> {slot.ranKm} km
                            </span>
                          ) : slot.isToday ? (
                            <span className="schedule-status-badge today">
                              {lang === 'vi' ? 'Hôm nay' : 'Today'}
                            </span>
                          ) : (
                            <span className={`schedule-status-badge ${slot.badge?.toLowerCase() || 'plan'}`}>
                              {slot.badge || 'Plan'}
                            </span>
                          )}
                        </div>

                        <div className="schedule-card__workout">
                          <span className="workout-type-name">
                            {slot.isCompleted 
                              ? (lang === 'vi' ? 'Đã hoàn thành' : 'Completed') 
                              : slot.workoutType || (lang === 'vi' ? 'Nghỉ ngơi' : 'Rest')}
                          </span>
                          {!slot.isCompleted && slot.suggestedKm > 0 && (
                            <span className="workout-km-target">{slot.suggestedKm} km</span>
                          )}
                        </div>

                        {slot.focus && !slot.isCompleted && (
                          <div className="schedule-card__focus">
                            <small>{slot.focus}</small>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="weekly-plan-empty">
                  <p>{lang === 'vi' ? 'Không thể tạo kế hoạch tuần.' : 'Unable to generate schedule.'}</p>
                </div>
              )}
            </div>

            <div className="weekly-plan-modal__footer">
              <button 
                type="button" 
                className="btn-modal-refresh"
                onClick={() => handleFetchWeeklyPlan(true)}
                disabled={loadingWeeklyPlan}
              >
                <RotateCw size={14} className={loadingWeeklyPlan ? 'spin-icon' : ''} />
                <span>{lang === 'vi' ? 'Tạo lại kế hoạch' : 'Regenerate'}</span>
              </button>

              <button 
                type="button" 
                className="btn-modal-done"
                onClick={() => setShowWeeklyModal(false)}
              >
                {lang === 'vi' ? 'Đã hiểu' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY TREASURY TRANSPARENCY MODAL */}
      <TreasuryTransparencyModal 
        isOpen={showTreasuryModal}
        onClose={() => setShowTreasuryModal(false)}
        apiFetch={apiFetch}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
    </div>
  );
}

