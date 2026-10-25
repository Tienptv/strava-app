import React from 'react';
import { ChevronDown } from 'lucide-react';

import witchHatImg from '../assets/halloween/witch_hat.png';
import pumpkinImg from '../assets/halloween/pumpkin.png';
import ghostImg from '../assets/halloween/ghost.png';
import batsImg from '../assets/halloween/bats.png';
import leafMidImg from '../assets/halloween/leaf_mid.png';
import leavesRightImg from '../assets/halloween/leaves_right.png';
import trophyHatImg from '../assets/halloween/trophy_hat.png';
import bannerBgImg from '../assets/halloween/halloween_banner_bg.png';
import witchSilhouetteImg from '../assets/halloween/witch_silhouette.png';

/**
 * 1. MŨ PHÙ THỦY TÍM MỚI (CHIẾC NÓN CONG MA THUẬT ĐỘI TRÊN ĐỈNH CHỮ M)
 */
function WitchHatOnM() {
  return (
    <div 
      className="witch-hat-on-m"
      style={{
        position: 'absolute',
        top: '-22px',
        left: '-9px',
        pointerEvents: 'none',
        zIndex: 5
      }}
    >
      <img 
        src={witchHatImg} 
        alt="Witch Hat" 
        style={{
          width: '48px',
          height: 'auto',
          display: 'block',
          filter: 'drop-shadow(0 0 2px #C084FC) drop-shadow(0 0 5px #9333EA) drop-shadow(0 4px 8px rgba(0,0,0,0.85))'
        }} 
      />
    </div>
  );
}

/**
 * 2. QUẢ BÍ NGÔ CƯỜI 3D (ẢNH GỐC 100% TỪ THAM CHIẾU)
 */
function PumpkinLeaderboard() {
  return (
    <span 
      className="pumpkin-leaderboard-icon"
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        marginLeft: '10px', 
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 0 10px rgba(255, 117, 24, 0.95)) drop-shadow(0 0 18px rgba(255, 117, 24, 0.55))',
        animation: 'pumpkinNeonPulse 2.8s infinite alternate ease-in-out'
      }}
    >
      <img 
        src={pumpkinImg} 
        alt="Jack-o'-lantern" 
        style={{
          width: '26px',
          height: '26px',
          objectFit: 'contain',
          display: 'block'
        }} 
      />
    </span>
  );
}

/**
 * 3. BÓNG MA CHIBI TRẮNG VẪY TAY (ẢNH GỐC 100% TỪ THAM CHIẾU)
 */
function CuteMiniGhost() {
  return (
    <div 
      className="cute-mini-ghost-float"
      style={{
        position: 'absolute',
        top: '-17px',
        right: '-18px',
        pointerEvents: 'none',
        zIndex: 10,
        animation: 'ghostFloatMini 3.2s infinite ease-in-out'
      }}
    >
      <img 
        src={ghostImg} 
        alt="Cute Ghost" 
        style={{
          width: '32px',
          height: 'auto',
          display: 'block',
          filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 16px rgba(168, 85, 247, 0.55))'
        }} 
      />
    </div>
  );
}

/**
 * 4. CÚP VÀNG ĐỘI MŨ PHÙ THỦY (TĂNG 1.25X, VIỀN NEON TÍM THAN)
 */
function TrophyWithWitchHat() {
  return (
    <div style={{ position: 'relative', width: '32px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img 
        src={trophyHatImg} 
        alt="Trophy with Witch Hat" 
        style={{
          width: '30px',
          height: 'auto',
          display: 'block',
          filter: 'drop-shadow(0 0 2px #A855F7) drop-shadow(0 0 5px #7C3AED) drop-shadow(0 0 10px #4C1D95) drop-shadow(0 0 16px #2E1065)'
        }} 
      />
    </div>
  );
}

/**
 * 5. MẶT TRĂNG TRÒN TỎA SÁNG HUYỀN BÍ (KHUNG XANH LÁ)
 */
function GlowingFullMoon() {
  return (
    <div 
      className="glowing-full-moon"
      title="Halloween Full Moon"
      style={{
        position: 'absolute',
        top: '11px',
        right: 'clamp(310px, 27%, 380px)',
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #FFFDF5 0%, #FEF08A 45%, #FACC15 75%, #EAB308 100%)',
        boxShadow: '0 0 18px rgba(254, 240, 138, 0.95), 0 0 36px rgba(250, 204, 21, 0.7), 0 0 65px rgba(250, 204, 21, 0.4)',
        animation: 'moonGlowPulse 3.5s infinite alternate ease-in-out',
        pointerEvents: 'none',
        zIndex: 2,
        overflow: 'hidden'
      }}
    >
      {/* Các vệt vân lõm bề mặt mặt trăng (crater shadows) */}
      <div style={{ position: 'absolute', top: '20%', left: '46%', width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(202, 138, 4, 0.22)', filter: 'blur(0.8px)' }} />
      <div style={{ position: 'absolute', top: '50%', left: '22%', width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(202, 138, 4, 0.18)', filter: 'blur(1px)' }} />
      <div style={{ position: 'absolute', top: '62%', left: '55%', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(202, 138, 4, 0.16)', filter: 'blur(0.6px)' }} />

      {/* Bóng mụ phù thủy cưỡi chổi bay ngang qua vầng trăng */}
      <img
        src={witchSilhouetteImg}
        alt="Witch on Broom"
        style={{
          position: 'absolute',
          top: '52%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '25px',
          height: 'auto',
          zIndex: 3,
          pointerEvents: 'none',
          filter: 'drop-shadow(0 0 2px rgba(21, 13, 28, 0.8))'
        }}
      />
    </div>
  );
}

/**
 * 5. LỚP PHỦ NỀN TRANG TRÍ (SƯƠNG MÙ THAM CHIẾU, ĐÀN DƠI, LÁ SỒI, SAO LẤP LÁNH)
 */
function HeaderBackdropDecorations() {
  return (
    <div 
      className="halloween-header-backdrop"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        borderRadius: '12px',
        pointerEvents: 'none',
        zIndex: 1
      }}
    >
      {/* 5.1 Dải sương mù lam tím và bầu trời đêm nguyên bản từ banner tham chiếu */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${bannerBgImg})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.85
        }} 
      />

      {/* 5.2 Mạng nhện mảnh ở viền trên các góc */}
      <svg width="80" height="45" viewBox="0 0 80 45" fill="none" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.35 }}>
        <path d="M 0,0 L 70,0 Q 35,22 0,40 Z" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
        <line x1="0" y1="0" x2="70" y2="0" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
        <line x1="0" y1="0" x2="55" y2="18" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <line x1="0" y1="0" x2="30" y2="34" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <path d="M 0,16 Q 12,12 18,0" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" fill="none" />
        <path d="M 0,30 Q 26,22 40,0" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" fill="none" />
      </svg>

      {/* 5.3 Vết slime tím rủ xuống từ mép trên */}
      <svg width="22" height="18" viewBox="0 0 22 18" fill="none" style={{ position: 'absolute', top: 0, left: '38%', opacity: 0.45 }}>
        <path d="M 0,0 L 22,0 L 22,3 C 18,3 17,12 15,12 C 13,12 12,3 9,3 C 7,3 6,8 4,8 C 2,8 1,3 0,3 Z" fill="#9333ea" />
        <circle cx="15" cy="14.5" r="1.3" fill="#c084fc" />
      </svg>
      <svg width="20" height="16" viewBox="0 0 20 16" fill="none" style={{ position: 'absolute', top: 0, left: '66%', opacity: 0.4 }}>
        <path d="M 0,0 L 20,0 L 20,3 C 16,3 15,11 13,11 C 11,11 10,3 7,3 C 5,3 4,7 3,7 C 2,7 1,3 0,3 Z" fill="#7e22ce" />
        <circle cx="13" cy="13" r="1.1" fill="#a855f7" />
      </svg>

      {/* 5.4 Chiếc lá khô mùa thu bên trái */}
      <span style={{ position: 'absolute', top: '10px', left: '31%', transform: 'rotate(22deg)', opacity: 0.85 }}>
        <img src={leafMidImg} alt="leaf" style={{ width: '18px', height: 'auto', display: 'block' }} />
      </span>

      {/* 5.6 Vài chấm sao nhỏ li ti lấp lánh */}
      <span className="sparkle-star" style={{ position: 'absolute', top: '14px', left: '26%', animation: 'sparkleTwinkle 2.4s infinite ease-in-out' }}>
        <svg width="8" height="8" viewBox="0 0 16 16"><path d="M 8,0 Q 8,8 16,8 Q 8,8 8,16 Q 8,8 0,8 Q 8,8 8,0 Z" fill="#fef08a" opacity="0.65" /></svg>
      </span>
      <span className="sparkle-star" style={{ position: 'absolute', top: '46px', left: '44%', animation: 'sparkleTwinkle 3.1s infinite 1.2s ease-in-out' }}>
        <svg width="7" height="7" viewBox="0 0 16 16"><path d="M 8,0 Q 8,8 16,8 Q 8,8 8,16 Q 8,8 0,8 Q 8,8 8,0 Z" fill="#e0e7ff" opacity="0.5" /></svg>
      </span>
      <span className="sparkle-star" style={{ position: 'absolute', top: '20px', left: '62%', animation: 'sparkleTwinkle 2.8s infinite 0.7s ease-in-out' }}>
        <svg width="9" height="9" viewBox="0 0 16 16"><path d="M 8,0 Q 8,8 16,8 Q 8,8 8,16 Q 8,8 0,8 Q 8,8 8,0 Z" fill="#fde047" opacity="0.75" /></svg>
      </span>
      <span className="sparkle-star" style={{ position: 'absolute', top: '48px', right: '32%', animation: 'sparkleTwinkle 3.5s infinite 1.8s ease-in-out' }}>
        <svg width="6" height="6" viewBox="0 0 16 16"><path d="M 8,0 Q 8,8 16,8 Q 8,8 8,16 Q 8,8 0,8 Q 8,8 8,0 Z" fill="#fef08a" opacity="0.55" /></svg>
      </span>

      {/* 5.7 Mặt trăng tròn tỏa sáng (khung màu xanh lá) */}
      <GlowingFullMoon />
    </div>
  );
}

/**
 * COMPONENT CHÍNH: HALLOWEEN HEADER BAR
 */
export default function HalloweenHeaderBar({
  month = 10,
  year = 2026,
  lang = 'vi',
  isMonthDropdownOpen = false,
  setIsMonthDropdownOpen,
  dropdownRef,
  handleMonthSelect,
  MONTH_NAMES_EN = [],
  topRunner,
  getAvatar,
  nameMapping = {},
  percentDistance,
  totalMonthlyDistance = 0,
  targetKm = 0,
  goalData,
  showDayAndTimeCols = false,
  t
}) {
  return (
    <div 
      className="challenge-header halloween-header-bar"
      style={{
        position: 'relative',
        zIndex: 60,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '74px',
        padding: '0 24px',
        background: 'linear-gradient(to right, #0d0916 0%, #171126 50%, #0d0916 100%)',
        borderRadius: '12px',
        border: '1.5px solid rgba(217, 136, 80, 0.4)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        marginBottom: '16px',
        overflow: 'visible' /* Giữ overflow: visible để dropdown chọn tháng không bị cắt */
      }}
    >
      {/* 1. LỚP PHỦ NỀN TRANG TRÍ (OVERFLOW HIDDEN NỘI BỘ) */}
      <HeaderBackdropDecorations />

      {/* 2. CỤM BÊN TRÁI: KHUNG PILL CHỨA TIÊU ĐỀ & NÚT CHỌN THÁNG */}
      <div 
        className="halloween-header-left"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'relative',
          zIndex: 3
        }}
      >
        {/* KHUNG PILL PHÁT SÁNG QUANH TIÊU ĐỀ (100% THEO ẢNH THAM CHIẾU) */}
        <div
          className="halloween-title-capsule"
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 18px 6px 14px',
            borderRadius: '9999px',
            background: 'rgba(20, 15, 34, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1.5px solid transparent',
            backgroundImage: 'linear-gradient(rgba(20, 15, 34, 0.85), rgba(20, 15, 34, 0.85)), linear-gradient(135deg, #9D4EDD 0%, #FF7A00 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 0 18px rgba(157, 78, 221, 0.35), inset 0 0 10px rgba(255, 122, 0, 0.2)'
          }}
        >
          {/* Ngôi sao 4 cánh lấp lánh ở góc trên bên phải khung tiêu đề */}
          <div style={{ position: 'absolute', top: '-6px', right: '14px', pointerEvents: 'none', animation: 'sparkleTwinkle 2.5s infinite ease-in-out' }}>
            <svg width="14" height="14" viewBox="0 0 16 16">
              <path d="M 8,0 Q 8,8 16,8 Q 8,8 8,16 Q 8,8 0,8 Q 8,8 8,0 Z" fill="#fef08a" style={{ filter: 'drop-shadow(0 0 5px #ffea00)' }} />
            </svg>
          </div>

          {/* Giọt sơn tím chảy ở mép dưới bên trái khung tiêu đề */}
          <div style={{ position: 'absolute', bottom: '-8px', left: '18px', pointerEvents: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M 0,0 Q 7,2 14,0 L 12,6 Q 7,12 7,14 Q 5,9 2,6 Z" fill="#9D4EDD" />
            </svg>
          </div>

          {/* TIÊU ĐỀ KÈM MŨ PHÙ THỦY TRÊN CHỮ M & BÍ NGÔ SAU LEADERBOARD */}
          <h2 
            className="halloween-title-main"
            style={{
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              position: 'relative',
              fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '20px',
              fontWeight: 700,
              color: '#FFFDE8',
              letterSpacing: '-0.01em',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)'
            }}
          >
            {/* Mũ phù thủy tím nhung đội lệch trên đỉnh chữ M */}
            <WitchHatOnM />

            <span style={{ position: 'relative', zIndex: 2, paddingLeft: '4px' }}>
              {lang === 'en' ? 'Monthly Challenge Leaderboard' : 'Bảng Xếp Hạng Thử Thách'}
            </span>

            {/* Quả bí ngô Jack-o'-lantern phát sáng cam neon */}
            <PumpkinLeaderboard />
          </h2>
        </div>

        {/* NÚT CHỌN THÁNG (DROPDOWN SELECTOR CÓ MẠNG NHỆN 2 GÓC TRÊN) */}
        <div className="month-dropdown-container" ref={dropdownRef} style={{ position: 'relative', marginLeft: '4px', zIndex: 100 }}>
          <button 
            className="challenge-title-date halloween-month-trigger"
            onClick={() => setIsMonthDropdownOpen && setIsMonthDropdownOpen(!isMonthDropdownOpen)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: 'rgba(29, 24, 42, 0.88)',
              color: '#E2E8F0',
              fontSize: '0.88rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1.5px solid #D98850',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4), inset 0 0 8px rgba(217, 136, 80, 0.15)',
              backdropFilter: 'blur(8px)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Họa tiết mạng nhện mảnh ở góc trên bên trái */}
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.35, pointerEvents: 'none' }}>
              <path d="M 0,0 L 16,0 Q 8,8 0,16 Z" fill="none" stroke="#D98850" strokeWidth="0.8" />
              <line x1="0" y1="0" x2="16" y2="0" stroke="#D98850" strokeWidth="0.8" />
              <line x1="0" y1="0" x2="12" y2="7" stroke="#D98850" strokeWidth="0.6" />
              <line x1="0" y1="0" x2="7" y2="12" stroke="#D98850" strokeWidth="0.6" />
            </svg>

            {/* Họa tiết mạng nhện mảnh ở góc trên bên phải */}
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ position: 'absolute', top: 0, right: 0, transform: 'scaleX(-1)', opacity: 0.35, pointerEvents: 'none' }}>
              <path d="M 0,0 L 16,0 Q 8,8 0,16 Z" fill="none" stroke="#D98850" strokeWidth="0.8" />
              <line x1="0" y1="0" x2="16" y2="0" stroke="#D98850" strokeWidth="0.8" />
              <line x1="0" y1="0" x2="12" y2="7" stroke="#D98850" strokeWidth="0.6" />
              <line x1="0" y1="0" x2="7" y2="12" stroke="#D98850" strokeWidth="0.6" />
            </svg>

            <span>
              {lang === 'en' ? `${MONTH_NAMES_EN[month - 1] || 'October'} ${year}` : `Tháng ${month}, ${year}`}
            </span>
            <ChevronDown size={16} strokeWidth={2.5} style={{ color: '#D98850' }} />
          </button>

          {/* Bóng ma trắng nhỏ dễ thương bay lơ lửng sát cạnh phải nút dropdown */}
          <CuteMiniGhost />

          {/* DROPDOWN MENU BUNG XUỐNG */}
          {isMonthDropdownOpen && (
            <div 
              className="month-dropdown-menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 999,
                background: 'rgba(23, 18, 36, 0.96)',
                backdropFilter: 'blur(16px)',
                border: '1.5px solid #D98850',
                borderRadius: '10px',
                padding: '8px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75), 0 0 16px rgba(217, 136, 80, 0.25)',
                minWidth: '220px'
              }}
            >
              <div className="month-dropdown-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                  const monthLabel = lang === 'en' 
                    ? `${MONTH_NAMES_EN[m - 1]?.slice(0,3) || m}`
                    : `T${m}`;
                  const isActive = month === m;
                  return (
                    <button
                      key={m}
                      className={`month-dropdown-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleMonthSelect && handleMonthSelect(m)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isActive ? 'linear-gradient(135deg, #FF7A00 0%, #9D4EDD 100%)' : 'rgba(255,255,255,0.05)',
                        color: isActive ? '#ffffff' : '#D1D5DB',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {monthLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. CỤM BÊN PHẢI: LEADER BADGE (100% THEO ẢNH THAM CHIẾU) */}
      <div 
        className="halloween-header-right"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'relative',
          zIndex: 3
        }}
      >
        {topRunner && (
          <div 
            className="halloween-leader-badge"
            title="Leader of the Month"
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#140f22',
              borderRadius: '9999px',
              padding: '6px 16px',
              boxShadow: '0 0 16px rgba(255, 122, 0, 0.4), inset 0 0 8px rgba(157, 78, 221, 0.3)',
              border: '1.5px solid transparent',
              backgroundImage: 'linear-gradient(#140f22, #140f22), linear-gradient(135deg, #FF7A00 0%, #9D4EDD 100%)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              cursor: 'default',
              userSelect: 'none'
            }}
          >
            {/* Chi tiết ngôi sao 4 cánh lấp lánh trên góc phải khung */}
            <div style={{ position: 'absolute', top: '-6px', right: '16px', pointerEvents: 'none', animation: 'sparkleTwinkle 2.2s infinite ease-in-out' }}>
              <svg width="14" height="14" viewBox="0 0 16 16">
                <path d="M 8,0 Q 8,8 16,8 Q 8,8 8,16 Q 8,8 0,8 Q 8,8 8,0 Z" fill="#fef08a" style={{ filter: 'drop-shadow(0 0 5px #ffea00)' }} />
              </svg>
            </div>

            {/* Giọt sơn tím rủ xuống từ mép dưới bên phải của khung */}
            <div style={{ position: 'absolute', bottom: '-8px', right: '22px', pointerEvents: 'none' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M 0,0 Q 6,2 12,0 L 10,6 Q 6,10 6,12 Q 5,8 2,5 Z" fill="#9D4EDD" />
              </svg>
            </div>

            {/* 1. Icon cúp vàng đội mũ phù thủy mini (ảnh gốc) */}
            <TrophyWithWitchHat />

            {/* 2. Avatar người dùng hình tròn 28x28px */}
            <img 
              src={getAvatar ? getAvatar(topRunner.member, 28) : (topRunner.member?.profile_medium || '')} 
              alt="avatar" 
              className="runner-avatar" 
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid #FF7A00',
                boxShadow: '0 0 6px rgba(255, 122, 0, 0.4)'
              }}
            />

            {/* 3. Tên người dẫn đầu (Màu trắng, font-weight: 600) */}
            <span 
              className="halloween-rotm-name"
              style={{
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.92rem',
                letterSpacing: '-0.01em'
              }}
            >
              {nameMapping[`${topRunner.member?.firstname} ${topRunner.member?.lastname}`]?.fullName || 
               `${topRunner.member?.firstname || ''} ${topRunner.member?.lastname || ''}`}
            </span>

            {/* 4. Số km (Màu xanh ngọc/teal #2DD4BF, font-weight: 700) */}
            <span 
              className="halloween-rotm-dist"
              style={{
                color: '#2DD4BF',
                fontWeight: 700,
                fontSize: '0.95rem',
                marginLeft: '2px',
                textShadow: '0 0 8px rgba(45, 212, 191, 0.45)'
              }}
            >
              {topRunner.totalDistance?.toFixed(1) || '0.0'} km
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
