import { useState, useEffect, useRef, useCallback } from 'react';

export const useNotificationSound = (soundUrl: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAllowedToPlay, setIsAllowedToPlay] = useState(false);
  const repeatingConversationsRef = useRef<Set<string | number>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(soundUrl);
    audioRef.current.loop = false;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [soundUrl]);

  const grantPermission = useCallback(() => {
    setIsAllowedToPlay(true);
    // Play a silent sound to "unlock" audio playback on some browsers
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.muted = true;
      audio.play().then(() => {
        audio.muted = false;
      }).catch(() => {});
    }
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current && isAllowedToPlay) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.warn("Audio play failed:", error);
      });
    }
  }, [isAllowedToPlay]);

  const startRepeatingSound = useCallback((conversationId: string | number) => {
    repeatingConversationsRef.current.add(conversationId);

    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        if (repeatingConversationsRef.current.size > 0) {
          playSound();
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 30000);
    }
  }, [playSound]);

  const playNotificationSound = useCallback((conversationId: string | number) => {
    playSound();
    startRepeatingSound(conversationId);
  }, [playSound, startRepeatingSound]);

  const stopRepeatingSound = useCallback((conversationId: string | number) => {
    repeatingConversationsRef.current.delete(conversationId);
  }, []);

  return { playNotificationSound, stopRepeatingSound, isAllowedToPlay, grantPermission };
};