import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Zap, 
  ChevronRight, 
  RefreshCw, 
  UserCheck, 
  Lock, 
  Key, 
  Search, 
  Check, 
  Eye, 
  EyeOff, 
  X, 
  ChevronDown, 
  AlertTriangle, 
  ShieldCheck,
  LogIn
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';

export default function Login({ onLogin, onGuestAccess, onMemberLogin }) {
  const { lang, switchLang, t } = useLang();

  // State: Danh sách thành viên CLB & Tìm kiếm
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // State: Passcode & Xác thực
  const [passcode, setPasscode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // State: Phần đăng nhập Admin Strava (thu gọn mặc định)
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Tải danh sách thành viên công khai từ backend
  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/club-members')
      .then(res => res.json())
      .then(data => {
        if (isMounted && Array.isArray(data)) {
          setMembers(data);
        }
      })
      .catch(err => console.warn('Lỗi nạp danh sách thành viên đăng nhập:', err))
      .finally(() => {
        if (isMounted) setLoadingMembers(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lọc danh sách thành viên theo chuỗi tìm kiếm (không dấu/có dấu)
  const filteredMembers = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => {
      const name = (m.name || '').toLowerCase();
      const fn = (m.firstname || '').toLowerCase();
      const ln = (m.lastname || '').toLowerCase();
      return name.includes(q) || fn.includes(q) || ln.includes(q);
    });
  }, [members, searchQuery]);

  // Xử lý xác thực thành viên (Phương án 3)
  const handleVerifyMember = async (e) => {
    e?.preventDefault();
    setErrorMsg('');

    if (!selectedMember) {
      setErrorMsg(t('memberSelectRequired'));
      return;
    }
    if (!passcode || !passcode.trim()) {
      setErrorMsg(t('memberPassRequired'));
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: selectedMember.id,
          passcode: passcode.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.athlete) {
        if (onMemberLogin) {
          onMemberLogin(data.athlete);
        }
      } else {
        setErrorMsg(data.error || t('memberLoginFailed'));
      }
    } catch (err) {
      setErrorMsg(err.message || t('memberLoginFailed'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="login-page">
      {/* Language switcher on login page */}
      <div className="lang-switcher" style={{ position: 'absolute', top: 16, right: 20, zIndex: 10 }}>
        {/* Desktop view */}
        <button
          className="lang-switcher__text-toggle lang-switcher__desktop"
          onClick={() => switchLang(lang === 'en' ? 'vi' : 'en')}
          title={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
          aria-label={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(0, 163, 166, 0.22)',
            borderRadius: '16px',
            padding: '3px 10px',
            cursor: 'pointer',
            fontWeight: 800,
            color: 'var(--primary-navy)',
            alignItems: 'baseline',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(8px)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,163,166,0.15)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = 'rgba(0, 163, 166, 0.22)'; }}
        >
          <span style={{ fontSize: lang === 'en' ? '0.82rem' : '0.68rem', opacity: lang === 'en' ? 1 : 0.45, transition: 'all 0.25s ease' }}>EN</span>
          <span style={{ fontSize: '0.72rem', opacity: 0.3, fontWeight: 400 }}>/</span>
          <span style={{ fontSize: lang === 'vi' ? '0.82rem' : '0.68rem', opacity: lang === 'vi' ? 1 : 0.45, transition: 'all 0.25s ease' }}>VI</span>
        </button>

        {/* Mobile view */}
        <button
          className="lang-switcher__single-toggle lang-switcher__mobile"
          onClick={() => switchLang(lang === 'en' ? 'vi' : 'en')}
          title={lang === 'en' ? 'Switch to Vietnamese (Chuyển sang tiếng Việt)' : 'Chuyển sang tiếng Anh (Switch to English)'}
          aria-label={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
        >
          {lang === 'en' ? 'VIE' : 'ENG'}
        </button>
      </div>

      <div className="login-card" style={{ maxWidth: '460px', width: '92%', margin: '20px auto' }}>
        <div className="login-card__icon" style={{ width: '130px', height: '130px', margin: '0 auto 12px', background: 'transparent', boxShadow: 'none' }}>
          <img src="/logo.webp" alt="Haskoning Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <h1 className="login-card__title" style={{ fontSize: '1.45rem', marginBottom: '2px' }}>{t('appTitle')}</h1>
        <div style={{ color: 'var(--accent)', fontWeight: 600, fontStyle: 'italic', fontSize: '0.90rem', letterSpacing: '0.02em', margin: '-4px 0 14px' }}>
          Enhancing Society Together
        </div>

        {/* ============================================================== */}
        {/* KHUNG ĐĂNG NHẬP THÀNH VIÊN CLB (PHƯƠNG ÁN 3)                   */}
        {/* ============================================================== */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.98)',
          border: '1.5px solid rgba(0, 163, 166, 0.35)',
          borderRadius: '16px',
          padding: '20px 18px',
          boxShadow: '0 8px 24px rgba(0, 45, 84, 0.08)',
          width: '100%',
          marginBottom: '16px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-navy)', fontWeight: 800, fontSize: '1.05rem', marginBottom: '14px' }}>
            <Users size={20} color="var(--accent)" />
            <span>{t('memberLoginHeading')}</span>
          </div>

          <form onSubmit={handleVerifyMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* DÒNG 1: KHUNG NHẬP TÊN THÀNH VIÊN + SEARCH NHANH */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                <UserCheck size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--accent)' }} />
                {t('memberSelectLabel')}
              </label>

              {/* Box hiển thị thành viên đã chọn hoặc ô tìm kiếm */}
              {selectedMember ? (
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--accent)',
                    background: 'rgba(0, 163, 166, 0.06)',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setIsDropdownOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {selectedMember.profile_medium ? (
                      <img 
                        src={selectedMember.profile_medium} 
                        alt={selectedMember.name} 
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--accent)' }} 
                      />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                        {(selectedMember.name || 'M').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--primary-navy)' }}>
                        {selectedMember.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        ID: {selectedMember.id}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#94a3b8' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMember(null);
                      setSearchQuery('');
                      setIsDropdownOpen(true);
                    }}
                    title={lang === 'en' ? 'Select different member' : 'Chọn thành viên khác'}
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                      setErrorMsg('');
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder={loadingMembers ? (lang === 'en' ? 'Loading roster...' : 'Đang tải danh sách...') : t('searchMemberPlaceholder')}
                    style={{
                      width: '100%',
                      padding: '11px 36px 11px 36px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.90rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocusCapture={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlurCapture={(e) => {
                      if (!isDropdownOpen) e.target.style.borderColor = '#cbd5e1';
                    }}
                  />
                  <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                </div>
              )}

              {/* Dropdown danh sách thành viên */}
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  maxHeight: '230px',
                  overflowY: 'auto',
                  background: '#ffffff',
                  border: '1.5px solid rgba(0, 163, 166, 0.4)',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0, 45, 84, 0.15)',
                  zIndex: 200,
                  padding: '4px 0'
                }}>
                  {filteredMembers.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                      {lang === 'en' ? 'No matching members found' : 'Không tìm thấy thành viên phù hợp'}
                    </div>
                  ) : (
                    filteredMembers.map(m => {
                      const isSelected = selectedMember && String(selectedMember.id) === String(m.id);
                      return (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '9px 12px',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(0, 163, 166, 0.12)' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'rgba(0, 163, 166, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                          onClick={() => {
                            setSelectedMember(m);
                            setIsDropdownOpen(false);
                            setSearchQuery('');
                            setErrorMsg('');
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {m.profile_medium ? (
                              <img 
                                src={m.profile_medium} 
                                alt={m.name} 
                                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} 
                              />
                            ) : (
                              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#002D54', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                                {(m.name || 'M').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>
                                {m.name}
                              </div>
                              <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
                                ID: {m.id}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check size={16} color="var(--accent)" />}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* DÒNG 2: KHUNG NHẬP PASS ĐƯỢC CẤP (MẶC ĐỊNH: 200k, KHÔNG PHÂN BIỆT HOA THƯỜNG) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                <Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--accent)' }} />
                {t('memberPassLabel')}
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder={t('memberPassPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 36px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.90rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onClick={() => setShowPass(!showPass)}
                  title={showPass ? (lang === 'en' ? 'Hide passcode' : 'Ẩn mật khẩu') : (lang === 'en' ? 'Show passcode' : 'Hiện mật khẩu')}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMsg && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '0.84rem'
              }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Nút Submit vào CLB */}
            <button
              type="submit"
              disabled={verifying}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 18px',
                background: 'linear-gradient(135deg, #00A3A6 0%, #002D54 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: verifying ? 'not-allowed' : 'pointer',
                opacity: verifying ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(0, 163, 166, 0.35)',
                transition: 'all 0.2s ease',
                marginTop: '4px'
              }}
              onMouseEnter={(e) => {
                if (!verifying) e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                if (!verifying) e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {verifying ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>{t('memberLoginVerifying')}</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>{t('memberLoginBtn')}</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Nút Xem Ngay (Khách vãng lai) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          <button 
            type="button" 
            className="btn btn-guest-access"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '11px 16px',
              background: '#f8fafc',
              color: 'var(--primary-navy)',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s ease'
            }}
            onClick={() => onGuestAccess && onGuestAccess()}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = 'var(--primary-navy)';
            }}
          >
            <span style={{ fontSize: '1.15rem' }}>🏆</span>
            <span>{lang === 'en' ? 'View Club Leaderboard (Guest)' : 'Xem Bảng Xếp Hạng CLB (Khách)'}</span>
            <ChevronRight size={16} />
          </button>

          {/* DÀNH CHO QUẢN TRỊ VIÊN: LINK THU GỌN ĐỂ ĐĂNG NHẬP STRAVA OAUTH */}
          <div style={{ marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setShowAdminLogin(!showAdminLogin)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.78rem',
                color: '#64748b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 8px',
                fontWeight: 600
              }}
            >
              <ShieldCheck size={14} color="var(--accent)" />
              <span>{t('adminLoginSection')}</span>
              <ChevronDown size={14} style={{ transform: showAdminLogin ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </button>

            {showAdminLogin && (
              <div style={{
                background: '#f1f5f9',
                borderRadius: '10px',
                padding: '12px',
                marginTop: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.74rem', color: '#475569', textAlign: 'left' }}>
                  {t('adminLoginNote')}
                </p>

                <button 
                  type="button" 
                  className="btn btn--primary" 
                  style={{ width: '100%', padding: '10px 14px', fontSize: '0.88rem' }}
                  onClick={() => onLogin(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="15.5,7 20,16 17.5,16 15.5,12 13.5,16 11,16"/>
                    <polygon points="10.5,16 13,16 10,22 7,16 9.5,16 10,17"/>
                  </svg>
                  {t('loginButton')}
                  <ChevronRight size={16} />
                </button>

                <button 
                  type="button" 
                  className="btn btn-switch-account" 
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem' }}
                  onClick={() => onLogin(true)}
                  title={t('switchAccountHint')}
                >
                  <RefreshCw size={14} style={{ flexShrink: 0 }} />
                  <span>{t('switchAccount')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <p style={{ marginTop: 14, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          {t('loginNote')}
        </p>
      </div>
    </div>
  );
}
