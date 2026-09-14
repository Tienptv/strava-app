import React, { useState, useEffect, useCallback } from 'react';
import { 
  Send, Copy, Check, RefreshCw, Users, AlertTriangle, Target, Zap, 
  ChevronDown, ChevronUp, Settings, Save, X, Smartphone, Bell, BellRing, Radio, CloudDownload 
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useLang } from '../i18n/LangContext';

const VN_BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'VTB', name: 'Vietinbank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'ACB', name: 'ACB' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'MSB', name: 'MSB' },
  { code: 'OCB', name: 'OCB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'SHB', name: 'SHB' },
  { code: 'SEAB', name: 'SeABank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'LPB', name: 'LienVietPostBank' },
];

function buildVietQRUrl(bankConfig, amount = 0, content = '') {
  if (!bankConfig?.accountNumber || !bankConfig?.bankCode) return null;
  const base = 'https://img.vietqr.io/image';
  const bank = bankConfig.bankCode.toUpperCase();
  const acct = bankConfig.accountNumber;
  const name = encodeURIComponent(bankConfig.accountName || '');
  const amt = amount > 0 ? amount : '';
  const msg = encodeURIComponent(content || 'Nop phat HRC');
  return `${base}/${bank}-${acct}-compact2.png?amount=${amt}&addInfo=${msg}&accountName=${name}`;
}

// Helper gửi Web Push Notification
async function sendPushNotification({ targetId, athleteKey, athleteName, title, body, url }) {
  try {
    const res = await fetch('/api/wpn/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId, athleteKey, athleteName, title, body, url: url || '/' })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Tab 1: Nhắc chạy ────────────────────────────────────────────────────────
function RunningReminderTab({ data, subscribersStatus, lang, t, onRefresh }) {
  const [copied, setCopied] = useState(false);
  const [expandLowPct, setExpandLowPct] = useState(true);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  const runners = data?.shortfallRunners || [];
  const penaltyRunners = runners.filter(r => r.hasPenalty && r.pctMonth < 100);
  const belowTarget = penaltyRunners.filter(r => r.pctMonth < 80);
  const nearTarget = penaltyRunners.filter(r => r.pctMonth >= 80 && r.pctMonth < 100);
  const achieved = runners.filter(r => r.pctMonth >= 100);

  // Tạo message Zalo/Teams cho toàn bộ
  const buildGroupMessage = () => {
    const lines = [
      `🏃 *Cập nhật mục tiêu tháng ${now.getMonth() + 1}/${now.getFullYear()} — Còn ${daysLeft} ngày!*`,
      '',
    ];
    if (belowTarget.length > 0) {
      lines.push(`⚠️ *Cần nỗ lực hơn (< 80%):*`);
      belowTarget.forEach(r => {
        const bars = Math.round(r.pctMonth / 10);
        const progress = '█'.repeat(bars) + '░'.repeat(10 - bars);
        lines.push(`• ${r.runnerName}: ${r.actualKm}/${r.targetKm}km [${progress}] ${r.pctMonth}%`);
      });
      lines.push('');
    }
    if (nearTarget.length > 0) {
      lines.push(`🎯 *Sắp về đích (80-99%):*`);
      nearTarget.forEach(r => {
        lines.push(`• ${r.runnerName}: ${r.actualKm}/${r.targetKm}km — còn ${r.shortfallKm}km`);
      });
      lines.push('');
    }
    if (achieved.length > 0) {
      lines.push(`🏅 *Đã hoàn thành mục tiêu:* ${achieved.map(r => r.runnerName).join(', ')}`);
      lines.push('');
    }
    lines.push(`💪 Hãy tranh thủ những ngày cuối tháng — mỗi km đều đếm!`);
    lines.push(`📊 Xem chi tiết: https://strava-app-86t5.onrender.com`);
    return lines.join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildGroupMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Bắn push nhắc nhở toàn CLB
  const handleBroadcastPush = async () => {
    const totalDevices = subscribersStatus?.totalDevices || 0;
    const defaultTitle = lang === 'en'
      ? `🏃 Haskoning Running Club - Month ${now.getMonth() + 1} Goal!`
      : `🏃 HRC 200K - Cập nhật mục tiêu tháng ${now.getMonth() + 1}!`;
    const defaultBody = lang === 'en'
      ? `Only ${daysLeft} days left in the month! Every km counts, lace up and let's conquer our goals together!`
      : `Chỉ còn ${daysLeft} ngày nữa là kết thúc tháng. Hãy lên giày và cùng nhau hoàn thành mục tiêu nhé!`;

    const { value: formValues } = await Swal.fire({
      title: `<span style="font-size: 1.15rem; color: #002D54; font-weight: 800;">${t('confirmBroadcastTitle')}</span>`,
      html: `
        <div style="text-align: left; font-size: 0.85rem; color: #334155;">
          <p style="margin-bottom: 12px; color: #00A3A6; font-weight: 700;">
            📱 ${lang === 'en' ? `Targeting ${totalDevices} registered devices` : `Sẽ gửi đến ${totalDevices} thiết bị đang đăng ký`}
          </p>
          <label style="display: block; font-weight: 700; margin-bottom: 4px;">${t('pushTitleLabel')}:</label>
          <input id="swal-push-title" class="swal2-input" style="width: 100%; margin: 0 0 12px; padding: 8px 12px; font-size: 0.85rem; box-sizing: border-box;" value="${defaultTitle}" />
          <label style="display: block; font-weight: 700; margin-bottom: 4px;">${t('pushBodyLabel')}:</label>
          <textarea id="swal-push-body" class="swal2-textarea" style="width: 100%; margin: 0; padding: 8px 12px; font-size: 0.85rem; height: 80px; box-sizing: border-box;">${defaultBody}</textarea>
          <p style="font-size: 0.75rem; color: #64748b; margin-top: 8px;">ℹ️ ${t('broadcastNote')}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#00A3A6',
      cancelButtonColor: '#64748b',
      confirmButtonText: `🚀 ${t('pushSendNow')}`,
      cancelButtonText: lang === 'en' ? 'Cancel' : 'Hủy',
      preConfirm: () => {
        return {
          title: document.getElementById('swal-push-title').value.trim(),
          body: document.getElementById('swal-push-body').value.trim()
        };
      }
    });

    if (formValues && formValues.title && formValues.body) {
      setSendingBroadcast(true);
      Swal.fire({
        title: lang === 'en' ? 'Broadcasting Push Notification...' : 'Đang bắn thông báo đến toàn CLB...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const res = await sendPushNotification({
        targetId: 'all',
        title: formValues.title,
        body: formValues.body,
        url: '/'
      });

      setSendingBroadcast(false);

      if (res.success) {
        Swal.fire({
          title: '🎉 ' + t('pushNotificationSuccess'),
          text: res.message || (lang === 'en' ? `Delivered to ${res.successCount || totalDevices} devices.` : `Đã gửi đến ${res.successCount || totalDevices} thiết bị.`),
          icon: 'success',
          confirmButtonColor: '#00A3A6'
        });
      } else {
        Swal.fire({
          title: '⚠️ ' + t('pushNotificationError'),
          text: (lang === 'en' && res.errorEn) ? res.errorEn : (res.error || 'Unknown error'),
          icon: 'warning',
          confirmButtonColor: '#00A3A6'
        });
      }
    }
  };

  // Helper tìm kiếm đăng ký thiết bị theo tất cả alias (ID, runnerName, fullName, cleanKey, key)
  const getSubInfo = (r) => {
    const map = subscribersStatus?.athleteMap || {};
    return (
      (r.athleteId && map[r.athleteId]) ||
      (r.runnerName && map[r.runnerName]) ||
      (r.fullName && map[r.fullName]) ||
      (r.cleanKey && map[r.cleanKey]) ||
      (r.key && map[r.key]) ||
      null
    );
  };

  // Bắn push riêng cho 1 cá nhân
  const handlePushRunner = async (r) => {
    const subInfo = getSubInfo(r);
    const isSubscribed = subInfo?.registered;

    if (!isSubscribed) {
      Swal.fire({
        title: lang === 'en' ? 'Push Not Available' : 'Chưa Có Thiết Bị Nhận Push',
        text: t('noRegisteredDeviceAlert'),
        icon: 'info',
        confirmButtonColor: '#00A3A6',
        confirmButtonText: lang === 'en' ? 'OK' : 'Đã hiểu'
      });
      return;
    }

    const defaultTitle = lang === 'en' ? '🏃 Haskoning Running Club Reminder' : '🏃 Nhắc nhở chạy bộ HRC';
    const defaultBody = lang === 'en'
      ? `Hi ${r.runnerName}! You have reached ${r.actualKm}/${r.targetKm}km (${r.pctMonth}%). Keep going to reach your goal!`
      : `Chào ${r.runnerName}! Bạn đã hoàn thành ${r.actualKm}/${r.targetKm}km (${r.pctMonth}%). Cùng cố gắng hoàn thành mục tiêu nhé!`;

    const { value: formValues } = await Swal.fire({
      title: `<span style="font-size: 1.1rem; color: #002D54; font-weight: 800;">📲 ${t('confirmSendPushTitle')}</span>`,
      html: `
        <div style="text-align: left; font-size: 0.85rem; color: #334155;">
          <p style="margin-bottom: 8px;"><b>${t('pushRecipientLabel')}:</b> <span style="color: #002D54; font-weight: 800;">${r.runnerName}</span></p>
          <label style="display: block; font-weight: 700; margin-bottom: 4px;">${t('pushTitleLabel')}:</label>
          <input id="swal-runner-title" class="swal2-input" style="width: 100%; margin: 0 0 12px; padding: 8px 12px; font-size: 0.85rem; box-sizing: border-box;" value="${defaultTitle}" />
          <label style="display: block; font-weight: 700; margin-bottom: 4px;">${t('pushBodyLabel')}:</label>
          <textarea id="swal-runner-body" class="swal2-textarea" style="width: 100%; margin: 0; padding: 8px 12px; font-size: 0.85rem; height: 80px; box-sizing: border-box;">${defaultBody}</textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#00A3A6',
      cancelButtonColor: '#64748b',
      confirmButtonText: `🚀 ${t('pushSendNow')}`,
      cancelButtonText: lang === 'en' ? 'Cancel' : 'Hủy',
      preConfirm: () => {
        return {
          title: document.getElementById('swal-runner-title').value.trim(),
          body: document.getElementById('swal-runner-body').value.trim()
        };
      }
    });

    if (formValues && formValues.title && formValues.body) {
      Swal.fire({
        title: lang === 'en' ? 'Sending Push...' : 'Đang gửi thông báo...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const res = await sendPushNotification({
        targetId: r.athleteId || r.cleanKey || r.runnerName,
        athleteKey: r.cleanKey || r.runnerName,
        athleteName: r.fullName || r.runnerName,
        title: formValues.title,
        body: formValues.body,
        url: '/'
      });

      if (res.success) {
        Swal.fire({
          title: '🎉 ' + t('pushNotificationSuccess'),
          text: res.message || (lang === 'en' ? `Sent to ${r.runnerName}'s phone.` : `Đã gửi thành công đến máy của ${r.runnerName}.`),
          icon: 'success',
          confirmButtonColor: '#00A3A6'
        });
      } else {
        Swal.fire({
          title: '⚠️ ' + t('pushNotificationError'),
          text: (lang === 'en' && res.errorEn) ? res.errorEn : (res.error || 'Unknown error'),
          icon: 'warning',
          confirmButtonColor: '#00A3A6'
        });
      }
    }
  };

  return (
    <div>
      {/* Tóm tắt nhanh */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
        {[
          { icon: '⚠️', label: lang === 'en' ? 'Need push' : 'Cần cố gắng', value: belowTarget.length, color: '#ef4444' },
          { icon: '🎯', label: lang === 'en' ? 'Almost there' : 'Sắp đến đích', value: nearTarget.length, color: '#f59e0b' },
          { icon: '🏅', label: lang === 'en' ? 'Achieved' : 'Hoàn thành', value: achieved.length, color: '#22c55e' },
        ].map(item => (
          <div key={item.label} style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 10px', textAlign: 'center', border: `1px solid ${item.color}22` }}>
            <div style={{ fontSize: '1.3rem', marginBottom: '2px' }}>{item.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* 2 Nút Hành Động Đầu Trang: Copy Zalo & Broadcast Push */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <button onClick={handleCopy}
          style={{
            padding: '12px 14px', borderRadius: '10px', border: 'none',
            background: copied ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #00A3A6 0%, #002D54 100%)',
            color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 14px rgba(0,163,166,0.3)',
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied
            ? (lang === 'en' ? '✅ Copied!' : '✅ Đã chép!')
            : (lang === 'en' ? '📋 Copy for Zalo' : '📋 Chép gửi Zalo')}
        </button>

        <button onClick={handleBroadcastPush} disabled={sendingBroadcast}
          style={{
            padding: '12px 14px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #78BE20 0%, #00A3A6 100%)',
            color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 14px rgba(120, 190, 32, 0.35)',
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Radio size={16} />
          {t('broadcastPush')}
        </button>
      </div>

      {/* Preview message */}
      <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', fontSize: '0.78rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--primary-navy)', fontFamily: 'monospace', border: '1px solid #e2e8f0', maxHeight: '160px', overflowY: 'auto' }}>
        {buildGroupMessage()}
      </div>

      {/* Danh sách chi tiết */}
      {belowTarget.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <button onClick={() => setExpandLowPct(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: '0.83rem', color: 'var(--primary-navy)', padding: '4px 0', marginBottom: '8px' }}>
            {expandLowPct ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {lang === 'en' ? `${belowTarget.length} runners below 80%` : `${belowTarget.length} người dưới 80% mục tiêu`}
          </button>
          {expandLowPct && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {belowTarget.map(r => {
                const subInfo = getSubInfo(r);
                const isSubscribed = subInfo?.registered;
                const devCount = subInfo?.deviceCount || 0;

                return (
                  <div key={r.key} style={{ background: '#fff', borderRadius: '12px', padding: '12px 14px', border: '1px solid #fee2e2', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--primary-navy)' }}>{r.runnerName}</span>
                        {isSubscribed ? (
                          <span title={lang === 'en' ? `Phone push active (${devCount} devices)` : `Đã bật thông báo trên điện thoại (${devCount} thiết bị)`} 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', background: 'rgba(120, 190, 32, 0.12)', color: '#15803d', padding: '2px 7px', borderRadius: '99px', fontWeight: 700 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}></span> 📱 {devCount} {t('pushDeviceCount')}
                          </span>
                        ) : (
                          <span title={t('deviceNotRegistered')} 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', background: '#f1f5f9', color: '#64748b', padding: '2px 7px', borderRadius: '99px', fontWeight: 600 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }}></span> 📱 0
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: r.pctMonth < 50 ? '#ef4444' : '#f59e0b' }}>
                        {r.pctMonth}%
                      </div>
                    </div>

                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {r.actualKm}/{r.targetKm}km • {lang === 'en' ? `Missing ${r.shortfallKm}km` : `Thiếu ${r.shortfallKm}km`}
                      {r.weekKm > 0 && ` • ${lang === 'en' ? 'This week' : 'Tuần này'}: ${r.weekKm}km`}
                    </div>

                    {/* Thanh tiến độ */}
                    <div style={{ height: '5px', background: '#fee2e2', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, r.pctMonth)}%`, background: r.pctMonth < 50 ? '#ef4444' : '#f59e0b', borderRadius: '99px', transition: 'width 0.6s ease' }} />
                    </div>

                    {/* Nút bấm hành động riêng cho VĐV */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handlePushRunner(r)}
                        style={{
                          flex: 1, padding: '7px 10px', borderRadius: '8px', border: 'none',
                          background: isSubscribed ? 'linear-gradient(135deg, #00A3A6 0%, #002D54 100%)' : '#f1f5f9',
                          color: isSubscribed ? '#fff' : '#64748b',
                          fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                          boxShadow: isSubscribed ? '0 2px 8px rgba(0,163,166,0.25)' : 'none',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseOver={e => { if (isSubscribed) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={e => { if (isSubscribed) e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <BellRing size={13} />
                        {t('sendPush')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Nhắc phạt + VietQR ─────────────────────────────────────────────
function PenaltyReminderTab({ data, subscribersStatus, lang, t }) {
  const [copied, setCopied] = useState(null);
  const [selectedQR, setSelectedQR] = useState(null);
  const now = new Date();
  const bankConfig = data?.bankConfig || {};
  const owingList = data?.owingPenalties || [];

  const buildPersonalMsg = (person) => {
    const unpaid = person.unpaidMonths.map(m => `  - ${m.month}: ${m.fee.toLocaleString('vi-VN')}đ`).join('\n');
    return [
      `💸 Nhắc nhở: Nộp tiền phạt CLB chạy bộ Haskoning`,
      ``,
      `Xin chào ${person.fullName}!`,
      `Theo hệ thống, bạn đang có ${person.unpaidMonths.length} tháng phạt chưa đóng:`,
      unpaid,
      `Tổng cộng: ${person.totalOwing.toLocaleString('vi-VN')}đ`,
      ``,
      bankConfig.accountNumber
        ? `🏦 Chuyển khoản:\n  Ngân hàng: ${bankConfig.bankName || bankConfig.bankCode}\n  Số TK: ${bankConfig.accountNumber}\n  Chủ TK: ${bankConfig.accountName}\n  Nội dung: Nop phat HRC ${now.getFullYear()}`
        : ``,
      ``,
      `Cảm ơn bạn! 🙏 Quỹ sẽ dùng cho các hoạt động CLB.`,
    ].join('\n');
  };

  const handleCopy = async (person) => {
    await navigator.clipboard.writeText(buildPersonalMsg(person));
    setCopied(person.athleteId || person.rawName);
    setTimeout(() => setCopied(null), 2000);
  };

  // Helper tìm kiếm đăng ký thiết bị của người bị phạt
  const getPersonSubInfo = (person) => {
    const map = subscribersStatus?.athleteMap || {};
    return (
      (person.athleteId && map[person.athleteId]) ||
      (person.rawName && map[person.rawName]) ||
      (person.fullName && map[person.fullName]) ||
      (person.cleanKey && map[person.cleanKey]) ||
      null
    );
  };

  // Bắn Web Push phạt đến máy VĐV
  const handlePushPenalty = async (person) => {
    const subInfo = getPersonSubInfo(person);
    const isSubscribed = subInfo?.registered;

    if (!isSubscribed) {
      Swal.fire({
        title: lang === 'en' ? 'Push Not Available' : 'Chưa Có Thiết Bị Nhận Push',
        text: t('noRegisteredDeviceAlert'),
        icon: 'info',
        confirmButtonColor: '#00A3A6',
        confirmButtonText: lang === 'en' ? 'OK' : 'Đã hiểu'
      });
      return;
    }

    const defaultTitle = lang === 'en' ? '💸 Haskoning Club Penalty Reminder' : '💸 HRC: Nhắc nộp quỹ phạt';
    const defaultBody = lang === 'en'
      ? `Hi ${person.fullName}! You have ${person.unpaidMonths.length} unpaid penalty month(s) (Total: ${person.totalOwing.toLocaleString('vi-VN')}đ). Please check and settle with the club fund.`
      : `Chào ${person.fullName}! Bạn đang có ${person.unpaidMonths.length} tháng nợ phạt (Tổng: ${person.totalOwing.toLocaleString('vi-VN')}đ). Vui lòng kiểm tra và hoàn thành quỹ phạt nhé!`;

    const { value: formValues } = await Swal.fire({
      title: `<span style="font-size: 1.1rem; color: #002D54; font-weight: 800;">📲 ${t('confirmSendPushTitle')}</span>`,
      html: `
        <div style="text-align: left; font-size: 0.85rem; color: #334155;">
          <p style="margin-bottom: 8px;"><b>${t('pushRecipientLabel')}:</b> <span style="color: #002D54; font-weight: 800;">${person.fullName}</span></p>
          <label style="display: block; font-weight: 700; margin-bottom: 4px;">${t('pushTitleLabel')}:</label>
          <input id="swal-penalty-title" class="swal2-input" style="width: 100%; margin: 0 0 12px; padding: 8px 12px; font-size: 0.85rem; box-sizing: border-box;" value="${defaultTitle}" />
          <label style="display: block; font-weight: 700; margin-bottom: 4px;">${t('pushBodyLabel')}:</label>
          <textarea id="swal-penalty-body" class="swal2-textarea" style="width: 100%; margin: 0; padding: 8px 12px; font-size: 0.85rem; height: 80px; box-sizing: border-box;">${defaultBody}</textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#00A3A6',
      cancelButtonColor: '#64748b',
      confirmButtonText: `🚀 ${t('pushSendNow')}`,
      cancelButtonText: lang === 'en' ? 'Cancel' : 'Hủy',
      preConfirm: () => {
        return {
          title: document.getElementById('swal-penalty-title').value.trim(),
          body: document.getElementById('swal-penalty-body').value.trim()
        };
      }
    });

    if (formValues && formValues.title && formValues.body) {
      Swal.fire({
        title: lang === 'en' ? 'Sending Push...' : 'Đang gửi thông báo...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const res = await sendPushNotification({
        targetId: person.athleteId,
        athleteKey: person.rawName,
        athleteName: person.fullName,
        title: formValues.title,
        body: formValues.body,
        url: '/'
      });

      if (res.success) {
        Swal.fire({
          title: '🎉 ' + t('pushNotificationSuccess'),
          text: res.message || (lang === 'en' ? `Sent to ${person.fullName}'s phone.` : `Đã gửi đến điện thoại của ${person.fullName}.`),
          icon: 'success',
          confirmButtonColor: '#00A3A6'
        });
      } else {
        Swal.fire({
          title: '⚠️ ' + t('pushNotificationError'),
          text: (lang === 'en' && res.errorEn) ? res.errorEn : (res.error || 'Unknown error'),
          icon: 'warning',
          confirmButtonColor: '#00A3A6'
        });
      }
    }
  };

  return (
    <div>
      {/* Tổng quan */}
      <div style={{ background: 'linear-gradient(135deg, #002D54 0%, #004080 100%)', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', color: '#fff' }}>
        <div style={{ fontSize: '0.78rem', opacity: 0.8, marginBottom: '4px' }}>
          {lang === 'en' ? 'Members with unpaid penalties' : 'Thành viên còn nợ phạt'}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 900 }}>{owingList.length}</span>
          <span style={{ fontSize: '0.82rem', opacity: 0.85 }}>{lang === 'en' ? 'people' : 'người'}</span>
          <span style={{ marginLeft: '16px', fontSize: '1rem', fontWeight: 700, color: '#fbbf24' }}>
            {owingList.reduce((s, p) => s + p.totalOwing, 0).toLocaleString('vi-VN')}đ
          </span>
          <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>{lang === 'en' ? 'total' : 'tổng'}</span>
        </div>
      </div>

      {/* VietQR tổng hợp */}
      {bankConfig.accountNumber && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <div style={{ flex: 1, fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
            📱 {lang === 'en' ? 'Treasurer bank QR' : 'Mã QR ngân hàng thủ quỹ'}:<br />
            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{bankConfig.bankName || bankConfig.bankCode} — {bankConfig.accountNumber}</span>
          </div>
          <button onClick={() => setSelectedQR(buildVietQRUrl(bankConfig, 0, `Nop phat HRC ${now.getFullYear()}`))}
            style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            📲 QR
          </button>
        </div>
      )}

      {/* Danh sách người nợ */}
      {owingList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
          <div style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>
            {lang === 'en' ? 'No unpaid penalties!' : 'Không có ai nợ phạt!'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {owingList.map(person => {
            const isCopied = copied === (person.athleteId || person.rawName);
            const qrUrl = buildVietQRUrl(bankConfig, person.totalOwing, `Nop phat HRC ${now.getFullYear()}`);
            const subInfo = getPersonSubInfo(person);
            const isSubscribed = subInfo?.registered;
            const devCount = subInfo?.deviceCount || 0;

            return (
              <div key={person.athleteId || person.rawName} style={{ background: '#fff', borderRadius: '12px', padding: '12px 14px', border: '1px solid #fee2e2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--primary-navy)' }}>{person.fullName}</span>
                      {isSubscribed ? (
                        <span title={lang === 'en' ? `Phone push active (${devCount} devices)` : `Đã bật thông báo trên điện thoại (${devCount} thiết bị)`} 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', background: 'rgba(120, 190, 32, 0.12)', color: '#15803d', padding: '2px 7px', borderRadius: '99px', fontWeight: 700 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}></span> 📱 {devCount} {t('pushDeviceCount')}
                        </span>
                      ) : (
                        <span title={t('deviceNotRegistered')} 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', background: '#f1f5f9', color: '#64748b', padding: '2px 7px', borderRadius: '99px', fontWeight: 600 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }}></span> 📱 0
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {person.unpaidMonths.length} {lang === 'en' ? 'unpaid months' : 'tháng chưa đóng'}
                    </div>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#dc2626' }}>
                    {person.totalOwing.toLocaleString('vi-VN')}đ
                  </div>
                </div>

                {/* Tháng nợ */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                  {person.unpaidMonths.map(({ month, fee }) => (
                    <span key={month} style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '6px', padding: '2px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                      {month}: {(fee / 1000).toFixed(0)}k
                    </span>
                  ))}
                </div>

                {/* Actions: Chép Zalo | Bắn Push phạt | QR */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleCopy(person)}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0',
                      background: isCopied ? '#22c55e' : '#f8fafc',
                      color: isCopied ? '#fff' : 'var(--primary-navy)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      transition: 'all 0.2s ease',
                    }}>
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                    {isCopied ? (lang === 'en' ? 'Copied!' : 'Đã chép!') : (lang === 'en' ? 'Copy Zalo' : 'Chép Zalo')}
                  </button>

                  <button onClick={() => handlePushPenalty(person)}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: '8px', border: 'none',
                      background: isSubscribed ? 'linear-gradient(135deg, #00A3A6 0%, #002D54 100%)' : '#f1f5f9',
                      color: isSubscribed ? '#fff' : '#64748b',
                      fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      boxShadow: isSubscribed ? '0 2px 8px rgba(0,163,166,0.25)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseOver={e => { if (isSubscribed) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseOut={e => { if (isSubscribed) e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <BellRing size={13} />
                    {t('pushPenalty')}
                  </button>

                  {qrUrl && (
                    <button onClick={() => setSelectedQR(qrUrl)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: 'var(--primary-navy)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      📲 QR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Modal */}
      {selectedQR && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedQR(null)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedQR(null)} style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: '#f1f5f9', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            <div style={{ fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '12px', fontSize: '0.95rem' }}>
              🏦 {bankConfig.bankName || bankConfig.bankCode} — {bankConfig.accountNumber}
            </div>
            <img src={selectedQR} alt="VietQR" style={{ width: '220px', height: '220px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
              onError={e => { e.target.style.display = 'none'; e.target.insertAdjacentHTML('afterend', '<p style="color:#dc2626;font-size:0.8rem">Không tải được QR. Kiểm tra lại mã ngân hàng.</p>'); }} />
            <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {lang === 'en' ? 'Scan with any banking app' : 'Quét bằng app ngân hàng bất kỳ'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Gửi Push Tùy Chỉnh (Custom Push) ────────────────────────────────
function CustomPushTab({ data, subscribersStatus, lang, t }) {
  const [recipient, setRecipient] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [sending, setSending] = useState(false);

  const totalDevices = subscribersStatus?.totalDevices || 0;
  const totalSubscribers = subscribersStatus?.totalSubscribers || 0;
  const athleteMap = subscribersStatus?.athleteMap || {};

  // Danh sách runners để chọn
  const runners = data?.shortfallRunners || [];

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Swal.fire(lang === 'en' ? 'Missing info' : 'Thiếu thông tin', lang === 'en' ? 'Please enter both title and body.' : 'Vui lòng nhập đầy đủ tiêu đề và nội dung.', 'warning');
      return;
    }

    setSending(true);
    Swal.fire({
      title: lang === 'en' ? 'Sending Custom Push...' : 'Đang gửi thông báo...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const targetObj = recipient !== 'all' ? runners.find(r => (r.athleteId === recipient || r.key === recipient)) : null;

    const res = await sendPushNotification({
      targetId: recipient,
      athleteKey: targetObj?.key,
      athleteName: targetObj?.runnerName,
      title: title.trim(),
      body: body.trim(),
      url: url.trim() || '/'
    });

    setSending(false);

    if (res.success) {
      Swal.fire({
        title: '🎉 ' + t('pushNotificationSuccess'),
        text: res.message || (lang === 'en' ? 'Delivered successfully!' : 'Đã gửi thành công!'),
        icon: 'success',
        confirmButtonColor: '#00A3A6'
      });
      setTitle('');
      setBody('');
    } else {
      Swal.fire({
        title: '⚠️ ' + t('pushNotificationError'),
        text: (lang === 'en' && res.errorEn) ? res.errorEn : (res.error || 'Unknown error'),
        icon: 'warning',
        confirmButtonColor: '#00A3A6'
      });
    }
  };

  return (
    <div>
      {/* Banner thống kê thiết bị */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0, 45, 84, 0.06) 0%, rgba(0, 163, 166, 0.08) 100%)', borderRadius: '12px', padding: '14px 16px', marginBottom: '18px', border: '1px solid rgba(0,163,166,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--primary-navy)' }}>
            📱 {lang === 'en' ? 'Registered Devices Network' : 'Mạng lưới thiết bị đã đăng ký'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {lang === 'en' ? 'Members who enabled notifications on Android / iPhone PWA' : 'Các thành viên đã bật quyền nhận thông báo trên điện thoại Android / iPhone'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00A3A6' }}>{totalDevices}</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>{t('pushDeviceCount')}</span>
          <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>{totalSubscribers} {lang === 'en' ? 'athletes' : 'VĐV'}</div>
        </div>
      </div>

      {/* Form soạn Push */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Recipient */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-navy)', display: 'block', marginBottom: '5px' }}>
            {t('pushRecipientLabel')} *
          </label>
          <select value={recipient} onChange={e => setRecipient(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: 'var(--primary-navy)', background: '#fff', cursor: 'pointer', boxSizing: 'border-box' }}>
            <option value="all">📢 {t('pushRecipientAll')} ({totalDevices} {t('pushDeviceCount')})</option>
            {runners.map(r => {
              const hasDev = athleteMap[r.athleteId]?.registered || athleteMap[r.key]?.registered;
              const count = athleteMap[r.athleteId]?.deviceCount || athleteMap[r.key]?.deviceCount || 0;
              return (
                <option key={r.athleteId || r.key} value={r.athleteId || r.key}>
                  {hasDev ? '🟢' : '⚪'} {r.runnerName} {hasDev ? `(${count} máy)` : `(Chưa bật Push)`}
                </option>
              );
            })}
          </select>
        </div>

        {/* Title */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-navy)', display: 'block', marginBottom: '5px' }}>
            {t('pushTitleLabel')} *
          </label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder={lang === 'en' ? 'e.g. Haskoning Club Alert' : 'VD: Thông báo quan trọng từ HRC'}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 600, boxSizing: 'border-box' }} />
        </div>

        {/* Body */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-navy)', display: 'block', marginBottom: '5px' }}>
            {t('pushBodyLabel')} *
          </label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder={lang === 'en' ? 'Enter notification message to display on phone lock screen...' : 'Nhập nội dung thông báo sẽ hiện trên màn hình khóa điện thoại...'}
            rows={3}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', lineHeight: 1.5, boxSizing: 'border-box', resize: 'vertical' }} />
        </div>

        {/* URL */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-navy)', display: 'block', marginBottom: '5px' }}>
            {lang === 'en' ? 'Click action URL' : 'Đường link khi chạm vào thông báo'}
          </label>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="/"
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b', boxSizing: 'border-box' }} />
        </div>

        {/* Nút gửi */}
        <button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()}
          style={{
            marginTop: '8px', padding: '12px 16px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #78BE20 0%, #00A3A6 100%)',
            color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: (sending || !title.trim() || !body.trim()) ? 0.6 : 1,
            boxShadow: '0 4px 14px rgba(120, 190, 32, 0.35)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseOver={e => { if (title.trim() && body.trim()) e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Send size={16} />
          {sending ? (lang === 'en' ? 'Sending...' : 'Đang gửi...') : t('pushSendNow')}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 4: Cấu hình STK thủ quỹ ───────────────────────────────────────────
function BankConfigTab({ lang, onSaved }) {
  const [form, setForm] = useState({ bankCode: '', accountNumber: '', accountName: '', bankName: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/treasury/bank-config')
      .then(r => r.json())
      .then(d => { setForm({ bankCode: d.bankCode || '', accountNumber: d.accountNumber || '', accountName: d.accountName || '', bankName: d.bankName || '' }); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.accountNumber || !form.accountName || !form.bankCode) return;
    setSaving(true);
    try {
      const res = await fetch('/api/treasury/bank-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); if (onSaved) onSaved(); }
    } finally { setSaving(false); }
  };

  const selectedBank = VN_BANKS.find(b => b.code === form.bankCode);
  const qrPreview = form.accountNumber && form.bankCode
    ? buildVietQRUrl({ ...form }, 0, `Nop phat HRC ${new Date().getFullYear()}`)
    : null;

  if (loading) return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>Đang tải...</div>;

  return (
    <div>
      <div style={{ background: '#fef9c3', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.8rem', color: '#854d0e' }}>
        ⚙️ {lang === 'en' ? 'Treasurer bank account info — used for VietQR generation in payment reminders.' : 'Thông tin tài khoản thủ quỹ — dùng để tạo mã QR trong tin nhắc phạt.'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Bank */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-navy)', display: 'block', marginBottom: '4px' }}>
            {lang === 'en' ? 'Bank' : 'Ngân hàng'} *
          </label>
          <select value={form.bankCode} onChange={e => setForm(f => ({ ...f, bankCode: e.target.value, bankName: VN_BANKS.find(b => b.code === e.target.value)?.name || '' }))}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: 'var(--primary-navy)', background: '#fff', cursor: 'pointer' }}>
            <option value="">{lang === 'en' ? '— Select bank —' : '— Chọn ngân hàng —'}</option>
            {VN_BANKS.map(b => <option key={b.code} value={b.code}>{b.name} ({b.code})</option>)}
          </select>
        </div>
        {/* STK */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-navy)', display: 'block', marginBottom: '4px' }}>
            {lang === 'en' ? 'Account number' : 'Số tài khoản'} *
          </label>
          <input type="text" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
            placeholder={lang === 'en' ? 'e.g. 1234567890' : 'VD: 1234567890'}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.92rem', letterSpacing: '1px', fontWeight: 700, boxSizing: 'border-box' }} />
        </div>
        {/* Chủ TK */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-navy)', display: 'block', marginBottom: '4px' }}>
            {lang === 'en' ? 'Account holder name' : 'Tên chủ tài khoản'} *
          </label>
          <input type="text" value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value.toUpperCase() }))}
            placeholder={lang === 'en' ? 'e.g. NGUYEN VAN A' : 'VD: NGUYEN VAN A'}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', boxSizing: 'border-box' }} />
        </div>
        {/* Preview QR */}
        {qrPreview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#f0fdf4', borderRadius: '12px', padding: '12px' }}>
            <img src={qrPreview} alt="QR Preview" style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              onError={e => e.target.style.display = 'none'} />
            <div style={{ fontSize: '0.8rem', color: '#166534' }}>
              <div style={{ fontWeight: 800, marginBottom: '3px' }}>{selectedBank?.name || form.bankCode}</div>
              <div>{form.accountNumber}</div>
              <div style={{ fontWeight: 700 }}>{form.accountName}</div>
            </div>
          </div>
        )}
        {/* Save */}
        <button onClick={handleSave} disabled={saving || !form.accountNumber || !form.accountName || !form.bankCode}
          style={{
            padding: '11px 16px', borderRadius: '10px', border: 'none',
            background: saved ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #00A3A6, #002D54)',
            color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: (saving || !form.accountNumber || !form.accountName || !form.bankCode) ? 0.6 : 1,
            transition: 'all 0.25s ease',
          }}>
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? (lang === 'en' ? 'Saved!' : 'Đã lưu!') : saving ? (lang === 'en' ? 'Saving...' : 'Đang lưu...') : (lang === 'en' ? 'Save bank config' : 'Lưu thông tin ngân hàng')}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SmartReminderTool() {
  const { lang, t } = useLang();
  const [activeTab, setActiveTab] = useState('running');
  const [data, setData] = useState(null);
  const [subscribersStatus, setSubscribersStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const [error, setError] = useState(null);

  const [pullingCloud, setPullingCloud] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, subsRes] = await Promise.all([
        fetch('/api/notifications/reminders/summary'),
        fetch('/api/wpn/subscribers-status?forceCloud=true').catch(() => null)
      ]);
      if (!summaryRes.ok) throw new Error(`HTTP ${summaryRes.status}`);
      const json = await summaryRes.json();
      setData(json);

      if (subsRes && subsRes.ok) {
        const subsJson = await subsRes.json();
        setSubscribersStatus(subsJson);
      }
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePullCloud = async () => {
    setPullingCloud(true);
    try {
      const res = await fetch('/api/storage/pull-from-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data && data.success) {
        Swal.fire({
          title: '🎉 ' + (lang === 'en' ? 'Synced from Cloud!' : 'Đã đồng bộ từ Cloud!'),
          text: lang === 'en' ? 'Latest push device registrations pulled successfully.' : 'Đã kéo thành công danh sách thiết bị điện thoại mới nhất từ Cloud về PC.',
          icon: 'success',
          confirmButtonColor: '#00A3A6'
        });
        await loadData();
      } else {
        throw new Error(data?.error || 'Pull failed');
      }
    } catch (e) {
      Swal.fire({
        title: '⚠️ ' + (lang === 'en' ? 'Sync Error' : 'Lỗi đồng bộ'),
        text: e.message,
        icon: 'warning',
        confirmButtonColor: '#00A3A6'
      });
    } finally {
      setPullingCloud(false);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  const TABS = [
    { key: 'running', icon: <Target size={14} />, label: lang === 'en' ? 'Running reminders' : 'Nhắc chạy' },
    { key: 'penalty', icon: <AlertTriangle size={14} />, label: lang === 'en' ? 'Penalty reminders' : 'Nhắc phạt' },
    { key: 'custompush', icon: <Radio size={14} />, label: t('customPushTab') },
    { key: 'bankconfig', icon: <Settings size={14} />, label: lang === 'en' ? 'Bank config' : 'Cấu hình STK' },
  ];

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--accent)" /> {lang === 'en' ? 'Smart Reminder & Push Tool' : 'Công cụ Nhắc nhở & Bắn Push Thông minh'}
          </h3>
          {lastFetch && <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {lang === 'en' ? 'Updated' : 'Cập nhật'}: {lastFetch.toLocaleTimeString('vi-VN')}
            {subscribersStatus?.totalDevices > 0 && ` • 📱 ${subscribersStatus.totalDevices} ${t('pushDeviceCount')}`}
          </p>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handlePullCloud} disabled={pullingCloud || loading}
            title={lang === 'en' ? 'Pull latest mobile registrations from Cloud' : 'Kéo dữ liệu đăng ký thiết bị mới nhất từ Render Cloud về PC'}
            style={{
              padding: '7px 12px', borderRadius: '8px', border: '1px solid rgba(120,190,32,0.4)',
              background: 'rgba(120,190,32,0.08)', color: '#15803d', fontWeight: 700, fontSize: '0.78rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(120,190,32,0.18)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(120,190,32,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <CloudDownload size={13} style={{ animation: pullingCloud ? 'bounce 0.8s infinite' : 'none' }} />
            {pullingCloud ? (lang === 'en' ? 'Pulling...' : 'Đang kéo...') : (lang === 'en' ? 'Pull Cloud' : 'Kéo từ Cloud')}
          </button>

          <button onClick={loadData} disabled={loading}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid rgba(0,163,166,0.3)', background: 'transparent', color: 'var(--accent)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s ease' }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,163,166,0.07)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            {lang === 'en' ? 'Refresh' : 'Làm mới'}
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', marginBottom: '16px', gap: '4px', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '8px 10px', borderRadius: '9px', border: 'none', fontWeight: 700,
              fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              background: activeTab === tab.key ? '#fff' : 'transparent',
              color: activeTab === tab.key ? 'var(--primary-navy)' : 'var(--text-secondary)',
              boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.09)' : 'none',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '0.82rem', fontWeight: 600 }}>
          ⚠️ {lang === 'en' ? 'Failed to load data:' : 'Lỗi tải dữ liệu:'} {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: '0.85rem' }}>{lang === 'en' ? 'Scanning member data...' : 'Đang quét dữ liệu thành viên...'}</div>
        </div>
      ) : (
        <>
          {activeTab === 'running' && <RunningReminderTab data={data} subscribersStatus={subscribersStatus} lang={lang} t={t} onRefresh={loadData} />}
          {activeTab === 'penalty' && <PenaltyReminderTab data={data} subscribersStatus={subscribersStatus} lang={lang} t={t} />}
          {activeTab === 'custompush' && <CustomPushTab data={data} subscribersStatus={subscribersStatus} lang={lang} t={t} />}
          {activeTab === 'bankconfig' && <BankConfigTab lang={lang} onSaved={loadData} />}
        </>
      )}
    </div>
  );
}
