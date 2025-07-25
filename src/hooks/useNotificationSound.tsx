import { useState, useEffect, useRef, useCallback } from 'react';

export const useNotificationSound = (soundUrl: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAllowedToPlay, setIsAllowedToPlay] = useState(false);
  const repeatingConversationsRef = useRef<Set<string | number>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Store isAllowedToPlay in a ref to avoid stale closures in setInterval
  const isAllowedToPlayRef = useRef(isAllowedToPlay);
  useEffect(() => {
    isAllowedToPlayRef.current = isAllowedToPlay;
  }, [isAllowedToPlay]);

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
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.muted = true;
      audio.play().then(() => {
        audio.muted = false;
      }).catch(() => {});
    }
  }, []);

  // This function is now stable as it reads the permission status from a ref
  const playSound = useCallback(() => {
    if (audioRef.current && isAllowedToPlayRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.warn("Audio play failed:", error);
      });
    }
  }, []);

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