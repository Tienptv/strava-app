import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const MusicContext = createContext(null);

const DEFAULT_VOLUME = 0.35; // Âm lượng khởi tạo 35% dịu nhẹ
const AUDIO_SOURCES = [
  '/audio/carol_of_the_bells_piano.mp3',
  '/audio/carol_of_the_bells_piano.wav'
];

export function MusicProvider({ children }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('bg_music_muted') === 'true');
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('bg_music_volume');
    return saved !== null ? Number(saved) : DEFAULT_VOLUME;
  });

  const audioRef = useRef(null);
  const srcIndexRef = useRef(0);

  // Khởi tạo Audio singleton
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    // Lấy thông tin URL nhạc động từ server với cache-busting
    const initAudioSource = async () => {
      let audioUrl = `/audio/carol_of_the_bells_piano.mp3?t=${Date.now()}`;
      try {
        const res = await fetch('/api/audio/info');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.url) {
            audioUrl = data.url;
          }
        }
      } catch (_) {
        // Fallback đường dẫn tĩnh có timestamp
      }

      audio.src = audioUrl;

      // Xử lý Autoplay thông minh
      const userExplicitlyPaused = localStorage.getItem('bg_music_user_paused') === 'true';

      if (!userExplicitlyPaused) {
        audio.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            // Trình duyệt chặn do Autoplay Policy: Kích hoạt ở cú click/phím đầu tiên
            const handleFirstInteraction = () => {
              if (localStorage.getItem('bg_music_user_paused') !== 'true' && audioRef.current) {
                audioRef.current.play()
                  .then(() => setIsPlaying(true))
                  .catch(() => {});
              }
              window.removeEventListener('click', handleFirstInteraction);
              window.removeEventListener('keydown', handleFirstInteraction);
              window.removeEventListener('touchstart', handleFirstInteraction);
            };

            window.addEventListener('click', handleFirstInteraction, { once: true });
            window.addEventListener('keydown', handleFirstInteraction, { once: true });
            window.addEventListener('touchstart', handleFirstInteraction, { once: true });
          });
      }
    };

    initAudioSource();

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
    };
  }, []);

  // Cập nhật âm lượng khi thay đổi
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    localStorage.setItem('bg_music_volume', volume.toString());
    localStorage.setItem('bg_music_muted', isMuted ? 'true' : 'false');
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorage.setItem('bg_music_user_paused', 'true');
    } else {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          localStorage.setItem('bg_music_user_paused', 'false');
        })
        .catch(err => {
          console.warn('[MusicPlayer] Play error:', err.message);
        });
    }
  }, [isPlaying, isMuted, volume]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const setVolume = useCallback((newVol) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  return (
    <MusicContext.Provider value={{
      isPlaying,
      isMuted,
      volume,
      togglePlay,
      toggleMute,
      setVolume,
      trackTitle: 'Carol of the Bells (Christmas Piano Cover)'
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
