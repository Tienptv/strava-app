import React, { useState, useRef, useEffect } from 'react';
import { useMusic } from '../context/MusicContext';
import { Music, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import './musicButton.css';

export default function MusicButton({ lang = 'vi' }) {
  const { isPlaying, isMuted, volume, togglePlay, toggleMute, setVolume, trackTitle } = useMusic();
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const containerRef = useRef(null);

  // Đóng popover khi nhấp ra ngoài
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowVolumePopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tooltipText = lang === 'en'
    ? `${isPlaying ? 'Playing' : 'Paused'}: ${trackTitle} • Click to ${isPlaying ? 'Pause' : 'Play'}`
    : `${isPlaying ? 'Đang phát' : 'Đang dừng'}: ${trackTitle} • Bấm để ${isPlaying ? 'Tạm dừng' : 'Phát nhạc'}`;

  return (
    <div className="music-button-container" ref={containerRef}>
      {/* Nút bấm dạng Pill nằm cạnh chữ Version */}
      <button
        type="button"
        className={`music-pill-btn ${isPlaying ? 'music-pill-btn--playing' : 'music-pill-btn--paused'}`}
        onClick={togglePlay}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowVolumePopover(prev => !prev);
        }}
        title={tooltipText}
        aria-label={tooltipText}
      >
        {/* Sóng âm Equalizer động */}
        <div className={`music-equalizer ${isPlaying ? 'music-equalizer--playing' : 'music-equalizer--paused'}`}>
          <div className="music-equalizer__bar" />
          <div className="music-equalizer__bar" />
          <div className="music-equalizer__bar" />
        </div>

        {/* Icon & Nhãn */}
        <span style={{ fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
          {isPlaying 
            ? (lang === 'en' ? 'Carol of the Bells 🎄' : 'Carol of the Bells 🎄') 
            : (lang === 'en' ? 'Music Off' : 'Bật Nhạc')}
        </span>

        {/* Nút nhỏ chỉnh âm lượng khi click chuột */}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setShowVolumePopover(prev => !prev);
          }}
          title={lang === 'en' ? 'Volume control' : 'Chỉnh âm lượng'}
          style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.7, padding: '2px', marginLeft: '2px' }}
        >
          {isMuted || volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </span>
      </button>

      {/* Popover trượt điều chỉnh âm lượng */}
      {showVolumePopover && (
        <div className="music-volume-popover">
          <button
            type="button"
            className="music-volume-toggle"
            onClick={toggleMute}
            title={isMuted ? (lang === 'en' ? 'Unmute' : 'Bật tiếng') : (lang === 'en' ? 'Mute' : 'Tắt tiếng')}
          >
            {isMuted || volume === 0 ? <VolumeX size={14} color="#ef4444" /> : <Volume2 size={14} color="#00A3A6" />}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="music-volume-slider"
            title={`${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />

          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, minWidth: '28px', textAlign: 'right' }}>
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
