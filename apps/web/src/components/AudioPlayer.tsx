import { useEffect, useRef } from 'react';
import { useGameSettings } from '../hooks/stores';

/** Background-music loop that respects the musicEnabled setting. */
export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { musicEnabled } = useGameSettings();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = musicEnabled ? 0.3 : 0;

    if (musicEnabled && audio.paused) {
      audio.play().catch(() => {
        /* autoplay blocked; will start on user interaction */
      });
    } else if (!musicEnabled && !audio.paused) {
      audio.pause();
    }
  }, [musicEnabled]);

  return (
    <audio ref={audioRef} src="/sound/soundtrack.mp3" preload="auto">
      <track kind="captions" />
    </audio>
  );
}
