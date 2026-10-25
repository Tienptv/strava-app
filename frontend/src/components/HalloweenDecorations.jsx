import React from 'react';
import headerbarMistTexture from '../assets/halloween/headerbar_mist_texture.png';

/**
 * 1. MẠNG NHỆN GÓC TRÊN BÊN TRÁI & CHÚ NHỆN ĐU TƠ (Corner Spiderweb with Hanging Spider)
 * Khung đỏ góc trên bên trái
 */
export function SpiderHangingWeb({ style = {} }) {
  return (
    <div 
      className="halloween-spider-web-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 22,
        pointerEvents: 'none',
        ...style
      }}
    >
      <svg width="220" height="200" viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
        <defs>
          <radialGradient id="spiderWebGlow" cx="0%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#e2e8f0" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.0" />
          </radialGradient>
        </defs>

        {/* Web corner shading */}
        <path d="M 0,0 L 210,0 Q 120,110 0,190 Z" fill="url(#spiderWebGlow)" />

        {/* Radial Web Strands originating from corner (0,0) */}
        <line x1="0" y1="0" x2="210" y2="0" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.5" />
        <line x1="0" y1="0" x2="200" y2="40" stroke="rgba(255, 255, 255, 0.38)" strokeWidth="1.2" />
        <line x1="0" y1="0" x2="175" y2="85" stroke="rgba(255, 255, 255, 0.38)" strokeWidth="1.2" />
        <line x1="0" y1="0" x2="135" y2="135" stroke="rgba(255, 255, 255, 0.38)" strokeWidth="1.2" />
        <line x1="0" y1="0" x2="85" y2="175" stroke="rgba(255, 255, 255, 0.38)" strokeWidth="1.2" />
        <line x1="0" y1="0" x2="40" y2="195" stroke="rgba(255, 255, 255, 0.38)" strokeWidth="1.2" />
        <line x1="0" y1="0" x2="0" y2="195" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.5" />

        {/* Concentric Web Arcs */}
        <path d="M 0,35 Q 26,26 35,0" fill="none" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.1" />
        <path d="M 0,70 Q 52,52 70,0" fill="none" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.1" />
        <path d="M 0,110 Q 82,82 110,0" fill="none" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.1" />
        <path d="M 0,155 Q 115,115 155,0" fill="none" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.1" />
        <path d="M 0,195 Q 150,150 205,0" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1" />

        {/* Connecting intricate micro-threads */}
        <path d="M 35,0 Q 20,40 0,35" fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="0.8" />
        <path d="M 70,0 Q 40,80 0,70" fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="0.8" />
        <path d="M 110,0 Q 60,120 0,110" fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="0.8" />
      </svg>

      {/* Spider Dangling on Silk Thread with Swing Animation */}
      <div 
        className="hanging-spider-wrapper"
        style={{
          position: 'absolute',
          top: '4px',
          left: '38px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'spiderPendulum 3.8s infinite ease-in-out',
          transformOrigin: 'top center'
        }}
      >
        {/* Silk Thread */}
        <div style={{ width: '1.5px', height: '28px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.4))', boxShadow: '0 0 4px rgba(255,255,255,0.8)' }} />

        {/* 3D Cute Spider SVG */}
        <svg width="42" height="42" viewBox="0 0 36 36" fill="none" style={{ marginTop: '-3px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.8)) drop-shadow(0 0 8px rgba(255,117,24,0.4))' }}>
          <defs>
            <radialGradient id="spiderBody3D" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
            <radialGradient id="spiderHead3D" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="55%" stopColor="#334155" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>

          {/* Left Legs */}
          <path d="M 15,15 Q 4,5 2,12 Q 3,16 13,17" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 14,18 Q 3,17 1,22 Q 3,25 13,20" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 14,21 Q 4,25 3,30 Q 6,32 14,23" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 15,23 Q 8,32 9,37 Q 12,37 16,24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />

          {/* Right Legs */}
          <path d="M 21,15 Q 32,5 34,12 Q 33,16 23,17" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 22,18 Q 33,17 35,22 Q 33,25 23,20" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 22,21 Q 32,25 33,30 Q 30,32 22,23" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 21,23 Q 28,32 27,37 Q 24,37 20,24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />

          {/* Abdomen */}
          <ellipse cx="18" cy="22" rx="8" ry="9.5" fill="url(#spiderBody3D)" />
          <ellipse cx="15.5" cy="19" rx="3" ry="3.5" fill="#ffffff" fillOpacity="0.3" />

          {/* Festive Orange Hourglass Accent on Back */}
          <polygon points="17,21 19,21 18,23" fill="#ff7518" />
          <polygon points="17,25 19,25 18,23" fill="#ff7518" />

          {/* Cephalothorax / Head */}
          <circle cx="18" cy="13" r="5.5" fill="url(#spiderHead3D)" />

          {/* Glowing Eyes */}
          <circle cx="15.8" cy="12" r="1.8" fill="#ff7518" style={{ filter: 'drop-shadow(0 0 3px #ff7518)' }} />
          <circle cx="20.2" cy="12" r="1.8" fill="#ff7518" style={{ filter: 'drop-shadow(0 0 3px #ff7518)' }} />
          <circle cx="15.8" cy="12" r="0.8" fill="#ffffff" />
          <circle cx="20.2" cy="12" r="0.8" fill="#ffffff" />

          {/* Fangs */}
          <path d="M 16.5,17 L 15.5,19.5 L 17.5,18" fill="#f8fafc" />
          <path d="M 19.5,17 L 20.5,19.5 L 18.5,18" fill="#f8fafc" />
        </svg>
      </div>
    </div>
  );
}

/**
 * 2. MẠNG NHỆN GÓC DƯỚI BÊN PHẢI (Bottom-Right Corner Spiderweb)
 * Khung đỏ góc dưới bên phải
 */
export function SpiderWebBottomRight({ style = {} }) {
  return (
    <div 
      className="halloween-spider-web-br"
      style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        zIndex: 25,
        pointerEvents: 'none',
        ...style
      }}
    >
      <svg width="190" height="150" viewBox="0 0 190 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 -2px 8px rgba(0,0,0,0.5))' }}>
        <defs>
          <radialGradient id="spiderWebBrGlow" cx="100%" cy="100%" r="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#e2e8f0" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.0" />
          </radialGradient>
        </defs>

        <path d="M 190,150 L 0,150 Q 80,60 190,0 Z" fill="url(#spiderWebBrGlow)" />
        <line x1="190" y1="150" x2="0" y2="150" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.5" />
        <line x1="190" y1="150" x2="20" y2="90" stroke="rgba(255, 255, 255, 0.38)" strokeWidth="1.2" />
        <line x1="190" y1="150" x2="60" y2="40" stroke="rgba(255, 255, 255, 0.38)" strokeWidth="1.2" />
        <line x1="190" y1="150" x2="115" y2="10" stroke="rgba(255, 255, 255, 0.38)" strokeWidth="1.2" />
        <line x1="190" y1="150" x2="190" y2="0" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.5" />

        <path d="M 155,150 Q 155,115 190,115" fill="none" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.1" />
        <path d="M 115,150 Q 115,75 190,75" fill="none" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.1" />
        <path d="M 75,150 Q 75,35 190,35" fill="none" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.1" />
        <path d="M 35,150 Q 35,5 190,5" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1" />
      </svg>
    </div>
  );
}

/**
 * 3. QUẢ BÍ NGÔ CƯỜI PHÁT SÁNG CAM NEON (Theo ảnh mẫu người dùng)
 * Các vòng tròn đỏ (trên ngày 30-31, mép trái rank 7-8, mép phải rank 6)
 */
export function NeonGlowingPumpkin({ size = 44, style = {}, pulseSpeed = '2.8s', variant = 'large' }) {
  const imgSrc = variant === 'pair' 
    ? '/halloween/pumpkinsPairRight.png' 
    : (variant === 'round' ? '/halloween/pumpkinGlowingRightBig.png' : '/halloween/pumpkinGlowingLarge.png');
  return (
    <div 
      className="neon-glowing-pumpkin"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 0 12px rgba(255, 117, 24, 0.95)) drop-shadow(0 0 26px rgba(255, 117, 24, 0.65))',
        animation: `pumpkinNeonPulse ${pulseSpeed} infinite alternate ease-in-out`,
        userSelect: 'none',
        pointerEvents: 'none',
        ...style
      }}
    >
      <img 
        src={imgSrc} 
        alt="Neon Glowing Pumpkin" 
        style={{ width: size, height: 'auto', display: 'block' }} 
      />
    </div>
  );
}

/**
 * Cặp bí ngô ngồi trên mép bảng (như ảnh mẫu)
 */
export function PumpkinsPair({ width = 76, style = {}, pulseSpeed = '3.0s' }) {
  return (
    <div 
      className="neon-pumpkins-pair"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        filter: 'drop-shadow(0 0 12px rgba(255, 117, 24, 0.95)) drop-shadow(0 0 24px rgba(255, 117, 24, 0.55))',
        animation: `pumpkinNeonPulse ${pulseSpeed} infinite alternate ease-in-out`,
        userSelect: 'none',
        pointerEvents: 'none',
        ...style
      }}
    >
      <img 
        src="/halloween/pumpkinsPairLeft.png" 
        alt="Pair of Pumpkins" 
        style={{ width, height: 'auto', display: 'block' }} 
      />
    </div>
  );
}

/**
 * 4. ĐÀN DƠI BAY TỪ XA ĐẾN (Theo ảnh mẫu người dùng)
 * Khung tím giữa header
 */
export function FlyingBatSwarm({ width = 360, style = {} }) {
  return (
    <div 
      className="halloween-bat-swarm"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 12px',
        animation: 'batFlap 2.2s infinite ease-in-out',
        pointerEvents: 'none',
        userSelect: 'none',
        ...style
      }}
    >
      <img 
        src="/halloween/batsSwarmClean.png" 
        alt="Bats Flying Swarm" 
        style={{ 
          width, 
          height: 'auto', 
          display: 'block',
          filter: 'drop-shadow(0 0 6px rgba(255, 117, 24, 0.95)) drop-shadow(0 0 14px rgba(132, 204, 22, 0.8)) brightness(1.35)'
        }} 
      />
    </div>
  );
}

/**
 * 5. BÓNG MA CHIBI DỄ THƯƠNG (Theo ảnh mẫu người dùng)
 * Khung màu vàng: trên cột $$$ Due/Tiến độ và mép ngoài quanh runner 12-16
 */
export function CuteChibiGhost({ width = 72, style = {}, single = false }) {
  const imgSrc = single ? '/halloween/chibiGhostSingle.png' : '/halloween/chibiGhostsClean.png';
  return (
    <div 
      className="cute-chibi-ghost"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        filter: 'drop-shadow(0 0 14px rgba(224, 242, 254, 0.95)) drop-shadow(0 0 24px rgba(168, 85, 247, 0.55))',
        animation: 'ghostLevitate 3.2s infinite ease-in-out',
        pointerEvents: 'none',
        userSelect: 'none',
        ...style
      }}
    >
      <img 
        src={imgSrc} 
        alt="Cute Chibi Ghost" 
        style={{ width, height: 'auto', display: 'block' }} 
      />
    </div>
  );
}

/**
 * 6. MINI PODIUM BADGES (Vector 3D - Zero Emojis)
 */
export function MiniGoldenPumpkin({ size = 20 }) {
  return (
    <span 
      title="Top 1: Golden Pumpkin"
      style={{ display: 'inline-flex', verticalAlign: 'middle', margin: '0 3px', filter: 'drop-shadow(0 0 6px #ffd700)' }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <radialGradient id="goldPumpkinGrad" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="60%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </radialGradient>
        </defs>
        <ellipse cx="12" cy="14" rx="9" ry="7.5" fill="url(#goldPumpkinGrad)" />
        <ellipse cx="12" cy="14" rx="5" ry="7.5" fill="#f59e0b" />
        <path d="M 12,6.5 Q 11,2 14,2" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" />
        <polygon points="9,12 11,12 10,9.5" fill="#fff" />
        <polygon points="13,12 15,12 14,9.5" fill="#fff" />
        <path d="M 8,15.5 Q 12,19 16,15.5" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function MiniSilverWitchHat({ size = 20 }) {
  return (
    <span 
      title="Top 2: Silver Witch Hat"
      style={{ display: 'inline-flex', verticalAlign: 'middle', margin: '0 3px', filter: 'drop-shadow(0 0 6px #cbd5e1)' }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <ellipse cx="12" cy="19" rx="10" ry="3" fill="#475569" />
        <path d="M 4,19 L 12,3 Q 15,3 15,6 L 20,19 Z" fill="#334155" />
        <rect x="7.5" y="15.5" width="9" height="2.5" fill="#a855f7" />
        <rect x="10.5" y="15" width="3" height="3.5" stroke="#facc15" strokeWidth="1" fill="none" />
      </svg>
    </span>
  );
}

export function MiniBronzeBat({ size = 20 }) {
  return (
    <span 
      title="Top 3: Bronze Bat"
      style={{ display: 'inline-flex', verticalAlign: 'middle', margin: '0 3px', filter: 'drop-shadow(0 0 6px #cd7f32)' }}
    >
      <svg width={size} height={size} viewBox="0 0 24 16" fill="none">
        <path d="M 12,5 C 10,2 6,0 1,1 C 3,4 4,7 3,10 C 6,9 8,10 9,12 L 12,14 L 15,12 C 16,10 18,9 21,10 C 20,7 21,4 23,1 C 18,0 14,2 12,5 Z" fill="#92400e" />
        <circle cx="10.5" cy="5.5" r="0.8" fill="#fef08a" />
        <circle cx="13.5" cy="5.5" r="0.8" fill="#fef08a" />
      </svg>
    </span>
  );
}

/**
 * 7. SPOOKY STREAK FLAME (Vector 3D - Zero Emojis)
 */
export function HalloweenSpookyFlame({ streak = 3, isBlue = false }) {
  const glowColor = isBlue ? '#38bdf8' : '#ff7518';
  return (
    <span 
      title={`Streak ${streak}!`}
      style={{ display: 'inline-flex', verticalAlign: 'middle', margin: '0 2px', filter: `drop-shadow(0 0 5px ${glowColor})` }}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <defs>
          <radialGradient id={isBlue ? "blueFlameGrad" : "orangeFlameGrad"} cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor={isBlue ? "#38bdf8" : "#facc15"} />
            <stop offset="80%" stopColor={isBlue ? "#0284c7" : "#ea580c"} />
            <stop offset="100%" stopColor={isBlue ? "#0c4a6e" : "#9a3412"} />
          </radialGradient>
        </defs>
        <path 
          d="M 10,2 C 12,6 16,8 16,13 C 16,16.5 13.5,19 10,19 C 6.5,19 4,16.5 4,13 C 4,9 8,6 8,4 C 8,3 9,2 10,2 Z" 
          fill={`url(#${isBlue ? "blueFlameGrad" : "orangeFlameGrad"})`} 
        />
        <path 
          d="M 10,9 C 11.5,11.5 13,12.5 13,15 C 13,16.8 11.8,18 10,18 C 8.2,18 7,16.8 7,15 C 7,13 9,11 10,9 Z" 
          fill="#ffffff" 
          fillOpacity="0.8" 
        />
      </svg>
    </span>
  );
}

/**
 * 8. SPOOKY TURTLE GHOST (Vector 3D - Zero Emojis)
 */
export function HalloweenSlowGhost() {
  return (
    <span 
      title="Turtle / Slow Pace"
      style={{ display: 'inline-flex', verticalAlign: 'middle', margin: '0 2px', filter: 'drop-shadow(0 0 4px #a855f7)' }}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="11" r="6" fill="#7e22ce" />
        <circle cx="10" cy="11" r="3.5" fill="#a855f7" />
        <ellipse cx="15" cy="13" rx="2.5" ry="1.8" fill="#a855f7" />
        <circle cx="16" cy="12.5" r="0.6" fill="#ffffff" />
      </svg>
    </span>
  );
}

/**
 * 9. HALLOWEEN CANDIES FOR CHALLENGE TABLE
 */
export function HalloweenCandyWrapped({ size = 26, style = {} }) {
  return (
    <div 
      className="halloween-decor-item" 
      style={{ 
        width: `${size}px`, 
        height: `${Math.round(size * 0.72)}px`, 
        display: 'inline-block',
        filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.4)) drop-shadow(0 0 6px rgba(255, 117, 24, 0.45))',
        ...style 
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 28 20" fill="none">
        <defs>
          <linearGradient id="candyWrapBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="50%" stopColor="#9333EA" />
            <stop offset="100%" stopColor="#6B21A8" />
          </linearGradient>
          <linearGradient id="candyRibbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>
        <path d="M 8.5,10 L 0.5,3.5 Q 3,10 0.5,16.5 Z" fill="url(#candyRibbonGrad)" stroke="#C2410C" strokeWidth="0.5" />
        <path d="M 19.5,10 L 27.5,3.5 Q 25,10 27.5,16.5 Z" fill="url(#candyRibbonGrad)" stroke="#C2410C" strokeWidth="0.5" />
        <ellipse cx="14" cy="10" rx="7" ry="6" fill="url(#candyWrapBodyGrad)" stroke="#581C87" strokeWidth="0.6" />
        <path d="M 11.5,4.5 Q 13,10 11.5,15.5" stroke="#FBBF24" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 16.5,4.5 Q 15,10 16.5,15.5" stroke="#FBBF24" strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="13" cy="7" rx="3.5" ry="1.6" fill="#FFFFFF" fillOpacity="0.65" />
      </svg>
    </div>
  );
}

export function HalloweenCandyCorn({ size = 22, style = {} }) {
  return (
    <div 
      className="halloween-decor-item" 
      style={{ 
        width: `${size}px`, 
        height: `${Math.round(size * 1.18)}px`, 
        display: 'inline-block',
        filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.35)) drop-shadow(0 0 6px rgba(250, 204, 21, 0.5))',
        ...style 
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 22 26" fill="none">
        <path d="M 11,1.5 C 9.5,1.5 7.5,6 7,8.5 L 15,8.5 C 14.5,6 12.5,1.5 11,1.5 Z" fill="#FFFFFF" />
        <path d="M 7,8.5 L 4.5,16 L 17.5,16 L 15,8.5 Z" fill="#FF7518" />
        <path d="M 4.5,16 L 2,22.5 C 1.5,24 3,25.5 5.5,25.5 L 16.5,25.5 C 19,25.5 20.5,24 20,22.5 L 17.5,16 Z" fill="#FACC15" />
        <path d="M 11,3 L 8,14 C 7.5,16 6,22 6.5,23.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function HalloweenCandySwirl({ size = 36, style = {} }) {
  return (
    <div 
      className="halloween-decor-item" 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        display: 'inline-block',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4)) drop-shadow(0 0 8px rgba(168, 85, 247, 0.55))',
        ...style 
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 36 36" fill="none">
        <defs>
          <radialGradient id="candySwirlBg" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFAA00" />
            <stop offset="70%" stopColor="#FF7518" />
            <stop offset="100%" stopColor="#D9480F" />
          </radialGradient>
        </defs>
        <circle cx="18" cy="18" r="16.5" fill="url(#candySwirlBg)" stroke="#8C2500" strokeWidth="0.8" />
        <path d="M 18,18 L 18,1.5 A 16.5,16.5 0 0,1 31.5,8 Z" fill="#9333EA" />
        <path d="M 18,18 L 34.5,18 A 16.5,16.5 0 0,1 28,31.5 Z" fill="#9333EA" />
        <path d="M 18,18 L 18,34.5 A 16.5,16.5 0 0,1 4.5,28 Z" fill="#9333EA" />
        <path d="M 18,18 L 1.5,18 A 16.5,16.5 0 0,1 8,4.5 Z" fill="#9333EA" />
        <circle cx="18" cy="18" r="3.2" fill="#FBBF24" />
        <path d="M 7,12 A 13,13 0 0,1 24,5" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * 10. MÀN SƯƠNG HUYỀN BÍ ĐÁY BẢNG (Đồng bộ 100% vân sương Headerbar)
 */
export function HalloweenTableMist() {
  return (
    <div className="halloween-table-mist-container">
      {/* Lớp nền sương lam tím đêm mờ ảo */}
      <div className="halloween-table-mist-ambient" />

      {/* Lớp dải sóng sương thực tế từ Headerbar (Wave 1) */}
      <div 
        className="halloween-mist-wave wave-1"
        style={{ backgroundImage: `url(${headerbarMistTexture})` }}
      />

      {/* Lớp dải sóng sương đối ứng trôi chậm (Wave 2) */}
      <div 
        className="halloween-mist-wave wave-2"
        style={{ backgroundImage: `url(${headerbarMistTexture})` }}
      />
    </div>
  );
}

/**
 * 11. CHIẾC LÁ VÀNG MÙA THU HALLOWEEN (Golden Autumn Leaf)
 */
export function HalloweenGoldenLeaf({ size = 30, style = {} }) {
  return (
    <div 
      className="halloween-decor-item" 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        display: 'inline-block',
        filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.35)) drop-shadow(0 0 8px rgba(245, 158, 11, 0.45))',
        transform: 'rotate(18deg)',
        ...style 
      }}
      title="Halloween Golden Autumn Leaf"
    >
      <svg width="100%" height="100%" viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="goldLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="goldVeinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
        </defs>
        {/* Leaf Stem */}
        <path d="M 6,28 C 9,25 12,22 15,18" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
        
        {/* Maple / Oak Leaf Blade */}
        <path 
          d="M 15,18 
             C 12,19 8,21 6,18 C 7,16 10,15 11,13 
             C 7,13 3,11 4,8 C 7,8 10,10 13,11 
             C 11,8 10,4 12,2 C 14,3 16,7 17,9 
             C 19,5 21,3 23,4 C 23,7 21,9 20,11 
             C 24,10 27,9 28,12 C 26,14 22,14 19,15 
             C 22,17 24,19 23,21 C 20,21 17,19 15,18 Z" 
          fill="url(#goldLeafGrad)" 
          stroke="#92400E" 
          strokeWidth="0.8" 
          strokeLinejoin="round" 
        />
        
        {/* Main Central Vein */}
        <path d="M 15,18 Q 16,11 17,6" stroke="url(#goldVeinGrad)" strokeWidth="1.2" strokeLinecap="round" />
        
        {/* Lateral Branching Veins */}
        <path d="M 15.5,14 Q 10,12 7,10" stroke="url(#goldVeinGrad)" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
        <path d="M 16,13 Q 21,11 24,12" stroke="url(#goldVeinGrad)" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
        <path d="M 15.2,16 Q 10,17 8,18" stroke="url(#goldVeinGrad)" strokeWidth="0.8" strokeLinecap="round" opacity="0.75" />
        <path d="M 16.2,15 Q 19,17 21,19" stroke="url(#goldVeinGrad)" strokeWidth="0.8" strokeLinecap="round" opacity="0.75" />

        {/* Highlight sheen */}
        <path d="M 13,4 Q 15,7 16,8" stroke="#FEF08A" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
      </svg>
    </div>
  );
}

