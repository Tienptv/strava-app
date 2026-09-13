import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, AlertTriangle, Target, Trophy, Megaphone, ChevronRight, CheckCheck } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

const STORAGE_KEY = 'hrc_notifications_read';

function getReadIds() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function markAllRead(ids) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {}
}

// Build VietQR URL
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

function NotifIcon({ type }) {
  const iconStyle = { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px' };
  if (type === 'penalty') return <div style={{ ...iconStyle, background: '#fee2e2', color: '#dc2626' }}><AlertTriangle size={15} /></div>;
  if (type === 'goal') return <div style={{ ...iconStyle, background: '#fef3c7', color: '#d97706' }}><Target size={15} /></div>;
  if (type === 'kudos') return <div style={{ ...iconStyle, background: '#dcfce7', color: '#16a34a' }}><Trophy size={15} /></div>;
  return <div style={{ ...iconStyle, background: 'rgba(0,163,166,0.12)', color: 'var(--accent)' }}><Megaphone size={15} /></div>;
}

function PenaltyQRModal({ notif, bankConfig, lang, onClose }) {
  const totalOwing = notif?.data?.totalOwing || 0;
  const unpaidMonths = notif?.data?.unpaidMonths || [];
  const qrUrl = buildVietQRUrl(bankConfig, totalOwing, `Nop phat HRC ${new Date().getFullYear()}`);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '28px 24px', maxWidth: '360px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', border: 'none', background: 'rgba(0,0,0,0.07)', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={15} />
        </button>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
          💸 {lang === 'en' ? 'Penalty Payment' : 'Nộp tiền phạt CLB'}
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          {lang === 'en' ? 'Scan QR or transfer to treasurer' : 'Quét mã QR hoặc chuyển khoản đến thủ quỹ'}
        </p>

        {/* Tổng tiền */}
        <div style={{ background: 'linear-gradient(135deg, #002D54 0%, #004080 100%)', borderRadius: '14px', padding: '16px', marginBottom: '16px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '0.78rem', opacity: 0.8, marginBottom: '4px' }}>{lang === 'en' ? 'Total owing' : 'Tổng tiền cần nộp'}</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{totalOwing.toLocaleString('vi-VN')}<span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: '4px' }}>đ</span></div>
          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '4px' }}>{unpaidMonths.length} {lang === 'en' ? 'unpaid month(s)' : 'tháng chưa đóng'}</div>
        </div>

        {/* Thông tin STK */}
        {bankConfig?.accountNumber ? (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', marginBottom: '14px', fontSize: '0.83rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '6px' }}>🏦 {bankConfig.bankName || bankConfig.bankCode}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{lang === 'en' ? 'Account' : 'Số TK'}: <strong style={{ color: 'var(--primary-navy)', fontSize: '0.95rem', letterSpacing: '1px' }}>{bankConfig.accountNumber}</strong></div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{lang === 'en' ? 'Name' : 'Chủ TK'}: <strong>{bankConfig.accountName}</strong></div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{lang === 'en' ? 'Content' : 'Nội dung'}: <strong>Nop phat HRC {new Date().getFullYear()}</strong></div>
          </div>
        ) : (
          <div style={{ background: '#fef9c3', borderRadius: '10px', padding: '10px', marginBottom: '14px', fontSize: '0.8rem', color: '#854d0e', textAlign: 'center' }}>
            ⚠️ {lang === 'en' ? 'Bank config not set. Please contact Admin.' : 'Chưa cấu hình STK thủ quỹ. Liên hệ Admin.'}
          </div>
        )}

        {/* VietQR */}
        {qrUrl && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>📱 {lang === 'en' ? 'Scan with any banking app' : 'Quét bằng app ngân hàng bất kỳ'}</div>
            <img src={qrUrl} alt="VietQR" style={{ width: '180px', height: '180px', borderRadius: '12px', border: '1px solid #e2e8f0', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; }} />
          </div>
        )}

        {/* Danh sách tháng nợ */}
        {unpaidMonths.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {lang === 'en' ? 'Breakdown by month' : 'Chi tiết theo tháng'}
            </div>
            <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {unpaidMonths.map(({ month, fee }) => (
                <div key={month} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 8px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>📅 {month}</span>
                  <strong style={{ color: '#dc2626' }}>{fee.toLocaleString('vi-VN')}đ</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationBell({ apiFetch, athlete }) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState(getReadIds);
  const [qrModal, setQrModal] = useState(null); // notif object for penalty QR
  const [bankConfig, setBankConfig] = useState(null);
  const bellRef = useRef(null);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const loadNotifications = useCallback(async () => {
    if (!apiFetch || !athlete || athlete.isGuest) return;
    setLoading(true);
    try {
      const params = athlete.id ? `athleteId=${athlete.id}` : '';
      const [notifData, bankData] = await Promise.all([
        apiFetch(`/notifications/user?${params}`).catch(() => null),
        apiFetch('/treasury/bank-config').catch(() => null),
      ]);
      if (notifData?.notifications) setNotifications(notifData.notifications);
      if (bankData) setBankConfig(bankData);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, athlete]);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  // Tự reload mỗi 10 phút để cập nhật trạng thái mới
  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  // Đóng khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkAllRead = () => {
    const allIds = notifications.map(n => n.id);
    markAllRead(allIds);
    setReadIds(allIds);
  };

  const handleNotifClick = (notif) => {
    // Đánh dấu đã đọc
    const newIds = [...new Set([...readIds, notif.id])];
    markAllRead(newIds);
    setReadIds(newIds);
    // Mở modal QR nếu là penalty
    if (notif.type === 'penalty') {
      setQrModal(notif);
      setOpen(false);
    }
  };

  if (!athlete || athlete.isGuest) return null;

  return (
    <>
      {/* Bell Button */}
      <div style={{ position: 'relative', display: 'inline-flex' }} ref={bellRef}>
        <button
          onClick={() => setOpen(o => !o)}
          title={lang === 'en' ? 'Notifications' : 'Thông báo'}
          style={{
            position: 'relative', background: open ? 'rgba(0,163,166,0.10)' : 'transparent',
            border: '1px solid ' + (open ? 'rgba(0,163,166,0.35)' : 'rgba(0,163,166,0.2)'),
            borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: open ? 'var(--accent)' : 'var(--primary-navy)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,163,166,0.25)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Bell size={17} style={{ animation: unreadCount > 0 ? 'bellRing 1.5s ease infinite' : 'none' }} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-5px', right: '-5px',
              background: '#ef4444', color: '#fff', borderRadius: '50%',
              width: '17px', height: '17px', fontSize: '0.62rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff', lineHeight: 1,
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Popover Panel — Desktop */}
        {open && (
          <div ref={panelRef} style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            width: '340px', maxHeight: '440px',
            background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
            borderRadius: '18px', boxShadow: '0 20px 60px rgba(0,45,84,0.18), 0 4px 16px rgba(0,163,166,0.1)',
            border: '1px solid rgba(0,163,166,0.15)',
            zIndex: 1000, overflow: 'hidden',
            animation: 'popoverSlideIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            {/* Header */}
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={15} color="var(--accent)" />
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--primary-navy)' }}>
                  {lang === 'en' ? 'Notifications' : 'Thông báo'}
                </span>
                {unreadCount > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: '20px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button onClick={handleMarkAllRead} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 6px', borderRadius: '6px' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(0,163,166,0.07)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <CheckCheck size={13} />
                  {lang === 'en' ? 'All read' : 'Đã đọc tất cả'}
                </button>
              )}
            </div>

            {/* Content */}
            <div style={{ overflowY: 'auto', maxHeight: '370px' }}>
              {loading ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '0.83rem' }}>{lang === 'en' ? 'Loading...' : 'Đang tải...'}</span>
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎉</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '4px' }}>
                    {lang === 'en' ? 'All good!' : 'Tuyệt vời!'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {lang === 'en' ? 'No pending notifications.' : 'Không có thông báo nào cần xử lý.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notifications.map(notif => {
                    const isRead = readIds.includes(notif.id);
                    const title = lang === 'en' ? notif.titleEn : notif.titleVi;
                    const body = lang === 'en' ? notif.bodyEn : notif.bodyVi;
                    return (
                      <button key={notif.id} onClick={() => handleNotifClick(notif)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '10px',
                          padding: '12px 14px', border: 'none', borderBottom: '1px solid #f8fafc',
                          background: isRead ? 'transparent' : 'rgba(0,163,166,0.04)',
                          cursor: notif.type === 'penalty' ? 'pointer' : 'default',
                          textAlign: 'left', width: '100%',
                          transition: 'background 0.15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(0,45,84,0.04)'}
                        onMouseOut={e => e.currentTarget.style.background = isRead ? 'transparent' : 'rgba(0,163,166,0.04)'}
                      >
                        <NotifIcon type={notif.type} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: isRead ? 600 : 800, fontSize: '0.83rem', color: 'var(--primary-navy)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {title}
                            {!isRead && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{body}</div>
                          {notif.type === 'penalty' && (
                            <div style={{ marginTop: '5px', fontSize: '0.73rem', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              {lang === 'en' ? 'Tap to view QR & bank info' : 'Bấm để xem mã QR & STK'}
                              <ChevronRight size={11} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Penalty QR Modal */}
      {qrModal && (
        <PenaltyQRModal
          notif={qrModal}
          bankConfig={bankConfig}
          lang={lang}
          onClose={() => setQrModal(null)}
        />
      )}

      <style>{`
        @keyframes bellRing {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(10deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(8deg); }
          40% { transform: rotate(-6deg); }
          50% { transform: rotate(0deg); }
        }
        @keyframes popoverSlideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
