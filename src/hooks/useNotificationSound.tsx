import { useState, useEffect, useRef, useCallback } from 'react';

type SoundPermission = 'prompt' | 'granted' | 'denied';

export const useNotificationSound = (soundFile: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [permission, setPermission] = useState<SoundPermission>('prompt');

  useEffect(() => {
    audioRef.current = new Audio(soundFile);
    const savedPermission = localStorage.getItem('soundPermission') as SoundPermission | null;
    if (savedPermission === 'granted' || savedPermission === 'denied') {
      setPermission(savedPermission);
    }
  }, [soundFile]);

  const playNotificationSound = useCallback(() => {
    if (permission === 'granted' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error("Lỗi phát âm thanh:", e));
    }
  }, [permission]);

  const grantPermission = useCallback(async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setPermission('granted');
        localStorage.setItem('soundPermission', 'granted');
        return true;
      } catch (error) {
        console.error("Không thể bật âm thanh:", error);
        setPermission('denied');
        localStorage.setItem('soundPermission', 'denied');
        return false;
      }
    }
    return false;
  }, []);

  const isAllowedToPlay = permission === 'granted';

  return { playNotificationSound, isAllowedToPlay, grantPermission, permission };
};